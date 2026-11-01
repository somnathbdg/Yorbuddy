import { getSupabase } from '../config/database.js';
import { env } from '../config/env.js';
import { Forbidden, AppError } from '../middleware/errorHandler.js';
import { getAiFriendSubscriptionStatus } from './aiFriendSubscriptionService.js';

export interface AiFriendMessage { role: 'user' | 'model'; text: string; }

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
  const contents = [
    ...history.slice(-12).map((item) => ({ role: item.role, parts: [{ text: item.text.slice(0, 2000) }] })),
    { role: 'user', parts: [{ text: message }] },
  ];
  const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/' +
    encodeURIComponent(env.GEMINI_MODEL) + ':generateContent?key=' + encodeURIComponent(env.GEMINI_API_KEY);
  const response = await fetch(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: 'You are YorBuddy AI Friend, a warm, respectful, supportive AI companion for adults in India. You are strictly platonic: never act as a dating, romantic, sexual, escort, or meet-up service. Be transparent that you are AI, not a human. Do not claim to be a therapist, doctor, or emergency service. Encourage respectful, safe, real-world choices and public places for any human meetups. Never request passwords, OTPs, Aadhaar numbers, PAN numbers, or identity document images. Keep replies concise, kind, culturally aware, and non-judgmental.' }] },
      contents, generationConfig: { temperature: 0.75, maxOutputTokens: 700 },
    }),
    signal: AbortSignal.timeout(25000),
  });
  const payload = await response.json() as any;
  if (!response.ok) {
    console.error('[AI_FRIEND] Gemini request failed:', response.status, payload?.error?.message || 'Unknown error');
    throw new AppError('AI Friend could not respond right now. Please try again shortly.', 502, 'AI_FRIEND_UPSTREAM_ERROR');
  }
  const reply = payload?.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim();
  if (!reply) throw new AppError('AI Friend returned an empty response. Please try again.', 502, 'AI_FRIEND_EMPTY_RESPONSE');
  return reply;
}
