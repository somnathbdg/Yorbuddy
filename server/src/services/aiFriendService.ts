import { getSupabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Forbidden, AppError } from '../middleware/errorHandler.js';
import { getAiFriendSubscriptionStatus } from './aiFriendSubscriptionService.js';

export interface AiFriendMessage { role: 'user' | 'model'; text: string; }
export type AiFriendPersonality = 'friend' | 'listener' | 'motivator' | 'funny' | 'mentor';

const MAX_HISTORY_MESSAGES = 8;
const MAX_HISTORY_MESSAGE_CHARS = 1200;
const MAX_OUTPUT_TOKENS = 450;
const GEMINI_TIMEOUT_MS = 20000;

export async function getAiFriendVerification(userId: string) {
  const supabase = getSupabase();
  const { data: user, error } = await supabase.from('users')
    .select('email_verified_at, phone_verified_at, is_active, ai_friend_adult_confirmed_at')
    .eq('id', userId).single();
  if (error || !user) throw new AppError('Unable to verify account status.', 503, 'VERIFICATION_UNAVAILABLE');
  if (!user.is_active) throw Forbidden('Your account is inactive.');
  const emailVerified = !!user.email_verified_at;
  const phoneVerified = !!user.phone_verified_at;
  return {
    email: emailVerified ? 'verified' as const : 'unverified' as const,
    phone: phoneVerified ? 'verified' as const : 'unverified' as const,
    kyc: 'not_required' as const,
    adult_confirmed: !!user.ai_friend_adult_confirmed_at,
    is_fully_verified: emailVerified || phoneVerified,
  };
}

export async function confirmAiFriendAdultStatus(userId: string) {
  const supabase = getSupabase();
  const { data: user, error } = await supabase.from('users').select('is_active').eq('id', userId).single();
  if (error || !user) throw new AppError('Unable to verify account status.', 503, 'VERIFICATION_UNAVAILABLE');
  if (!user.is_active) throw Forbidden('Your account is inactive.');
  const { error: updateError } = await supabase.from('users')
    .update({ ai_friend_adult_confirmed_at: new Date().toISOString() }).eq('id', userId);
  if (updateError) throw new AppError('Unable to save your age confirmation.', 503, 'AGE_CONFIRMATION_FAILED');
  return { adult_confirmed: true };
}

export async function sendAiFriendMessage(userId: string, history: AiFriendMessage[], message: string, personality: AiFriendPersonality = 'friend'): Promise<string> {
  const verification = await getAiFriendVerification(userId);
  if (!verification.is_fully_verified) throw Forbidden('Verify either your email address or mobile number to use AI Friend.');
  if (!verification.adult_confirmed) throw Forbidden('Please confirm that you are 18 or older to use AI Friend.');
  const entitlement = await getAiFriendSubscriptionStatus(userId);
  if (!entitlement.can_chat) throw Forbidden('Your AI Friend access is inactive or expired. Start your free trial or choose a paid plan.');
  if (!env.GEMINI_API_KEY) throw new AppError('AI Friend is not configured yet. Please contact support.', 503, 'AI_FRIEND_NOT_CONFIGURED');

  const safeHistory = history.slice(-MAX_HISTORY_MESSAGES).map((item) => ({
    role: item.role,
    parts: [{ text: item.text.slice(0, MAX_HISTORY_MESSAGE_CHARS) }],
  }));
  const contents = [
    ...safeHistory,
    { role: 'user', parts: [{ text: message.slice(0, 1500) }] },
  ];
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(env.GEMINI_MODEL) + ':generateContent';
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `You are YorBuddy AI Friend: talk like a genuinely friendly, thoughtful, emotionally aware dost. Sound natural and relaxed, not like a formal chatbot, customer-support agent, or scripted AI. Match the user's language and style naturally: Hindi, Hinglish, or English; if they mix languages, you may mix them too. Be warm, curious, attentive, and conversational. Ask natural follow-up questions, remember and refer to details from the conversation history, celebrate good news, empathize with difficult moments, and offer practical help when useful. Keep replies human-sounding and concise; avoid repetitive greetings, canned phrases, bullet lists unless useful, and unnecessary disclaimers such as repeatedly saying you are an AI. Do not pretend to be human or conceal that you are AI if directly asked; be transparent simply and briefly when relevant. Maintain a strictly platonic boundary: do not act as a girlfriend/boyfriend, romantic or sexual partner, dating, escort, or meet-up service. If asked for romance, respond kindly and redirect without sounding cold or preachy. You are not a therapist, doctor, or emergency service; for serious safety or health concerns, encourage appropriate real-world support. Never request passwords, OTPs, Aadhaar numbers, PAN numbers, or identity document images. Be culturally aware, respectful, non-judgmental, and supportive for adults in India.\n\nSelected conversation personality: ${personality}. Follow this style consistently while preserving all safety and platonic boundaries:\n- friend: Talk like a warm, natural, trustworthy dost. Use relaxed everyday Hindi/Hinglish/English, show interest, and ask genuine follow-up questions.\n- listener: Be especially patient and empathetic. Let the user express themselves; reflect what you heard and ask gentle, open questions. Do not rush to advice.\n- motivator: Be encouraging and optimistic without fake positivity. Help the user identify one realistic next step and celebrate progress.\n- funny: Be light-hearted, playful and witty when appropriate. Use gentle humour, never mock the user or make light of distress.\n- mentor: Be thoughtful and practical. Help the user reason through work, learning, goals and decisions with clear, actionable suggestions.\nDo not announce the selected style or describe yourself as a persona. Sound natural, not scripted.` }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: MAX_OUTPUT_TOKENS },
      }),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    console.error('[AI_FRIEND] Gemini network failure:', timedOut ? 'timeout' : 'request failed');
    throw new AppError(
      timedOut ? 'AI Friend is taking too long to respond. Please try again.' : 'AI Friend is temporarily unavailable. Please try again shortly.',
      503,
      timedOut ? 'AI_FRIEND_TIMEOUT' : 'AI_FRIEND_UNAVAILABLE'
    );
  }

  let payload: any = {};
  try {
    payload = await response.json();
  } catch {
    console.error('[AI_FRIEND] Gemini returned a non-JSON response:', response.status);
  }
  if (!response.ok) {
    const upstreamStatus = payload?.error?.status;
    if (response.status === 429 || upstreamStatus === 'RESOURCE_EXHAUSTED') {
      throw new AppError('AI Friend has reached its free usage limit for now. Please wait and try again later.', 429, 'AI_FRIEND_QUOTA_EXCEEDED');
    }
    console.error('[AI_FRIEND] Gemini request failed:', response.status, upstreamStatus || 'upstream error');
    throw new AppError('AI Friend could not respond right now. Please try again shortly.', 502, 'AI_FRIEND_UPSTREAM_ERROR');
  }
  const reply = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim();
  if (!reply) throw new AppError('AI Friend returned an empty response. Please try again.', 502, 'AI_FRIEND_EMPTY_RESPONSE');
  return reply;
}


export const AI_FRIEND_PERSONALITIES: AiFriendPersonality[] = ['friend', 'listener', 'motivator', 'funny', 'mentor'];

export async function getAiFriendChatHistory(
  userId: string,
  personality: AiFriendPersonality,
  limit = 100,
): Promise<Array<{ id: string; role: 'user' | 'model'; text: string; created_at: string }>> {
  const supabase = getSupabase();
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  const { data, error } = await supabase
    .from('ai_friend_messages')
    .select('id, role, content, created_at')
    .eq('user_id', userId)
    .eq('personality', personality)
    .order('created_at', { ascending: false })
    .limit(safeLimit);
  if (error) {
    console.error('[AI_FRIEND] Chat history load failed:', error.message);
    throw new AppError('Unable to load your saved conversation. Please try again.', 503, 'CHAT_HISTORY_UNAVAILABLE');
  }
  // Rows in one exchange can share the same transaction timestamp. UUIDs are
  // random, so they cannot be used to infer message order. For timestamp ties,
  // always render the user's message before the assistant's reply.
  return (data || [])
    .reverse()
    .sort((a: any, b: any) => {
      const timeDifference = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (timeDifference !== 0) return timeDifference;
      if (a.role === b.role) return 0;
      return a.role === 'user' ? -1 : 1;
    })
    .map((row: any) => ({
      id: row.id,
      role: row.role,
      text: row.content,
      created_at: row.created_at,
    }));
}

export async function saveAiFriendExchange(
  userId: string,
  personality: AiFriendPersonality,
  userMessage: string,
  assistantReply: string,
): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from('ai_friend_messages').insert([
    { user_id: userId, personality, role: 'user', content: userMessage },
    { user_id: userId, personality, role: 'model', content: assistantReply },
  ]);
  if (error) {
    console.error('[AI_FRIEND] Chat history save failed:', error.message);
    throw new AppError('Your reply was generated but could not be saved. Please try again.', 503, 'CHAT_HISTORY_SAVE_FAILED');
  }
}
