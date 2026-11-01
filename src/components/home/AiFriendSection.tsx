import React, { useEffect, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { aiFriendService, AiFriendMessage, AiFriendVerificationStatus } from '../../services/aiFriend';

export const AiFriendSection: React.FC = () => {
  const {
    isAuthenticated,
    setIsRegisterModalOpen,
    setRegisterStep,
    setAuthMode,
    setActiveTab,
  } = useApp();
  const [status, setStatus] = useState<AiFriendVerificationStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<AiFriendMessage[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    aiFriendService.getStatus()
      .then((value) => { if (mounted) setStatus(value); })
      .catch(() => { if (mounted) setStatus(null); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [isAuthenticated]);

  const openAccess = () => {
    if (!isAuthenticated) {
      setRegisterStep(1);
      setAuthMode('register');
      setIsRegisterModalOpen(true);
      return;
    }
    if (!status?.is_fully_verified) {
      setActiveTab('verification');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (!isAuthenticated) {
      openAccess();
      return;
    }
    if (!status?.is_fully_verified) {
      openAccess();
      return;
    }
    setDraft('');
    setError('');
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next);
    setSending(true);
    try {
      const reply = await aiFriendService.sendMessage(text, messages.slice(-12));
      setMessages([...next, { role: 'model', text: reply }]);
    } catch (err: any) {
      const apiError = err?.response?.data?.error?.message;
      setError(apiError || 'AI Friend is temporarily unavailable. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const canChat = isAuthenticated && !!status?.is_fully_verified;

  return (
    <section id="ai-friend" className="relative overflow-hidden bg-slate-950 py-20 sm:py-24">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold tracking-[0.16em] text-blue-200">
            <Bot className="h-4 w-4" /> YORBUDDY AI FRIEND
          </span>
          <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            A friendly conversation,
            <span className="block bg-gradient-to-r from-blue-300 to-pink-300 bg-clip-text text-transparent"> whenever you need one.</span>
          </h2>
          <p className="max-w-xl text-base leading-7 text-slate-300">
            Meet your AI-powered conversation companion. Talk about your day, explore ideas and get a little encouragement — always respectful, always platonic.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> 18+ members</span>
            <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-blue-300" /> Verification required</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-pink-300" /> Strictly platonic</span>
          </div>
          {!canChat && (
            <button onClick={openAccess} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5">
              {isAuthenticated ? 'Complete Verification to Chat' : 'Try AI Friend Chat'}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
          {isAuthenticated && !loading && status && !status.is_fully_verified && (
            <p className="max-w-lg text-sm text-amber-200">To protect our community, AI Friend chat unlocks only after Email OTP, Mobile OTP and KYC approval.</p>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-pink-500 text-white"><Bot className="h-6 w-6" /></div>
              <div><p className="font-bold text-white">AI Friend</p><p className="text-xs text-slate-400">AI companion · Platonic only</p></div>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">Preview</span>
          </div>
          <div className="mb-4 min-h-48 space-y-3 rounded-2xl bg-slate-950/60 p-4">
            {messages.length === 0 ? (
              <>
                <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white/10 p-3 text-sm leading-6 text-slate-200">Hi! I’m YorBuddy AI Friend. I’m here for a friendly, respectful conversation. What’s on your mind today?</div>
                <div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-blue-600/80 p-3 text-sm text-white">I’d like to talk about my day.</div>
                <p className="text-center text-[11px] text-slate-500">Illustrative preview — sign in and complete verification to start your own chat.</p>
              </>
            ) : messages.map((item, index) => (
              <div key={index} className={item.role === 'user' ? 'ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-blue-600/80 p-3 text-sm text-white' : 'max-w-[88%] rounded-2xl rounded-tl-sm bg-white/10 p-3 text-sm leading-6 text-slate-200'}>{item.text}</div>
            ))}
            {sending && <p className="text-xs text-slate-400">AI Friend is typing…</p>}
          </div>
          {canChat ? (
            <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex gap-2">
              <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Write a message…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" />
              <button type="submit" disabled={!draft.trim() || sending} aria-label="Send message" className="rounded-xl bg-blue-600 px-4 text-white disabled:opacity-40"><MessageCircle className="h-5 w-5" /></button>
            </form>
          ) : (
            <button onClick={openAccess} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15">
              {loading ? 'Checking verification…' : isAuthenticated ? 'Open Verification Centre' : 'Sign in to unlock chat'}
              <LockKeyhole className="h-4 w-4" />
            </button>
          )}
          {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
          <p className="mt-3 text-center text-[10px] leading-5 text-slate-500">AI-generated responses may be imperfect. AI Friend is not a human, therapist or emergency service.</p>
        </div>
      </div>
    </section>
  );
};
