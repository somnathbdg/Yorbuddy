import { getSupabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Forbidden, AppError } from '../middleware/errorHandler.js';
import { getAiFriendSubscriptionStatus } from './aiFriendSubscriptionService.js';

export interface AiFriendMessage { role: 'user' | 'model'; text: string; }

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

export async function sendAiFriendMessage(userId: string, history: AiFriendMessage[], message: string): Promise<string> {
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
        systemInstruction: { parts: [{ text: 'You are YorBuddy AI Friend, a warm, respectful, supportive AI companion for adults in India. You are strictly platonic: never act as a dating, romantic, sexual, escort, or meet-up service. Be transparent that you are AI, not a human. Do not claim to be a therapist, doctor, or emergency service. Encourage respectful, safe, real-world choices and public places for any human meetups. Never request passwords, OTPs, Aadhaar numbers, PAN numbers, or identity document images. Keep replies concise, kind, culturally aware, and non-judgmental.' }] },
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
