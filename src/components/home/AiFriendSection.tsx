import React, { useEffect, useState } from 'react';
import { ArrowRight, Bot, CheckCircle2, LockKeyhole, MessageCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { membershipService } from '../../services/membership';
import { aiFriendService, AiFriendMessage, AiFriendSubscriptionStatus } from '../../services/aiFriend';
import { authService } from '../../services/auth';

export const AiFriendSection: React.FC = () => {
  const { isAuthenticated, setIsRegisterModalOpen, setRegisterStep, setAuthMode, setActiveTab } = useApp();
  const [confirmingAge, setConfirmingAge] = useState(false);
  const [status, setStatus] = useState<AiFriendSubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<AiFriendMessage[]>([]);
  const [error, setError] = useState('');
  const [quickRegisterOpen, setQuickRegisterOpen] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickPassword, setQuickPassword] = useState('');
  const [quickConfirmPassword, setQuickConfirmPassword] = useState('');
  const [quickAdultConfirmed, setQuickAdultConfirmed] = useState(false);
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  const refreshStatus = async () => {
    if (!isAuthenticated) { setStatus(null); return; }
    setLoading(true);
    try { setStatus(await aiFriendService.getStatus()); }
    catch (err: any) { setError(err?.response?.data?.error?.message || 'Unable to load AI Friend access status.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    void refreshStatus();
  }, [isAuthenticated]);

  const openAccess = () => {
    if (!isAuthenticated) {
      setQuickRegisterOpen(true);
      return;
    }
    setActiveTab('verification');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitQuickRegistration = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (quickPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (quickPassword !== quickConfirmPassword) { setError('Passwords do not match.'); return; }
    if (!quickAdultConfirmed) { setError('Please confirm that you are 18 years or older.'); return; }
    setQuickSubmitting(true);
    try {
      await authService.registerAiFriend({
        full_name: quickName.trim(), email: quickEmail.trim(), password: quickPassword,
        phone: quickPhone.trim() || undefined,
      });
      // AppContext initializes the newly issued session and the user continues with OTP verification.
      window.location.reload();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Unable to create your AI Friend account. Please try again.');
      setQuickSubmitting(false);
    }
  };

  const confirmAge = async () => {
    setConfirmingAge(true);
    setError('');
    try { await aiFriendService.confirmAdultStatus(); await refreshStatus(); }
    catch (err: any) { setError(err?.response?.data?.error?.message || 'Unable to save age confirmation.'); }
    finally { setConfirmingAge(false); }
  };

  const startTrial = async () => {
    if (!isAuthenticated) { openAccess(); return; }
    setBuying('FREE_TRIAL_1D');
    setError('');
    try {
      await aiFriendService.startTrial();
      await refreshStatus();
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Unable to start the free trial.');
    } finally { setBuying(null); }
  };

  const buyPlan = async (planId: 'DAY_1' | 'WEEK_1' | 'MONTH_1') => {
    if (!isAuthenticated) { openAccess(); return; }
    setBuying(planId);
    setError('');
    try {
      const order = await aiFriendService.createOrder(planId);
      membershipService.openCheckout({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'YorBuddy AI Friend',
        description: order.plan_name,
        theme: { color: '#2563EB' },
        handler: async (response: any) => {
          try {
            await aiFriendService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await refreshStatus();
          } catch (err: any) {
            setError(err?.response?.data?.error?.message || 'Payment verification failed. Please contact support before retrying.');
          } finally { setBuying(null); }
        },
        onDismiss: () => setBuying(null),
        onError: (err: any) => {
          setError(err?.message || 'Unable to open secure checkout.');
          setBuying(null);
        },
      });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Unable to create payment order.');
      setBuying(null);
    }
  };

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (!isAuthenticated) { openAccess(); return; }
    if (!status?.can_chat) return;
    setDraft('');
    setError('');
    const next = [...messages, { role: 'user' as const, text }];
    setMessages(next);
    setSending(true);
    try {
      const reply = await aiFriendService.sendMessage(text, messages.slice(-12));
      setMessages([...next, { role: 'model', text: reply }]);
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'AI Friend is temporarily unavailable. Please try again.');
      await refreshStatus();
    } finally { setSending(false); }
  };

  const verified = !!status?.verification?.is_fully_verified;
  const ageConfirmed = !!status?.verification?.adult_confirmed;
  const canChat = isAuthenticated && !!status?.can_chat;
  const paidPlans = [
    { id: 'DAY_1' as const, title: '1 Day', price: '₹49', detail: '24 hours' },
    { id: 'WEEK_1' as const, title: '1 Week', price: '₹299', detail: '7 days' },
    { id: 'MONTH_1' as const, title: '1 Month', price: '₹499', detail: '30 days' },
  ];

  return (
    <section id="ai-friend" className="relative overflow-hidden bg-slate-950 py-20 sm:py-24">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-pink-500/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold tracking-[0.16em] text-blue-200"><Bot className="h-4 w-4" /> YORBUDDY AI FRIEND</span>
          <h2 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">A friendly conversation,<span className="block bg-gradient-to-r from-blue-300 to-pink-300 bg-clip-text text-transparent"> whenever you need one.</span></h2>
          <p className="max-w-xl text-base leading-7 text-slate-300">Meet your AI-powered conversation companion. Talk about your day, explore ideas and get a little encouragement — always respectful, always platonic.</p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> 18+ members</span>
            <span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-blue-300" /> One-time Email or Mobile OTP</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-pink-300" /> Strictly platonic</span>
          </div>
          {!isAuthenticated && <button onClick={openAccess} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 px-6 py-3.5 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:-translate-y-0.5">Try AI Friend Chat <ArrowRight className="h-4 w-4" /></button>}
          {isAuthenticated && !loading && !verified && <div className="space-y-3"><p className="max-w-lg text-sm text-amber-200">Verify either your email address or mobile number once. No KYC is required for AI Friend.</p><button onClick={openAccess} className="rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 px-5 py-3 text-sm font-bold text-white">Verify Email or Mobile</button></div>}
          {isAuthenticated && verified && !loading && !ageConfirmed && <div className="space-y-3"><p className="text-sm text-amber-200">Please confirm that you are 18 or older to continue.</p><button onClick={() => void confirmAge()} disabled={confirmingAge} className="rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{confirmingAge ? 'Saving…' : 'I confirm I am 18+'}</button></div>}
          {isAuthenticated && verified && ageConfirmed && !status?.has_active_subscription && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Choose your AI Friend access</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {status?.trial_available && <button disabled={!!buying} onClick={() => void startTrial()} className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-left text-emerald-100 disabled:opacity-50"><span className="block text-sm font-bold">Free Trial</span><span className="block text-lg font-black">₹0</span><span className="text-xs">24 hours</span>{buying === 'FREE_TRIAL_1D' && <span className="block text-xs">Starting…</span>}</button>}
                {paidPlans.map((plan) => <button key={plan.id} disabled={!!buying} onClick={() => void buyPlan(plan.id)} className="rounded-xl border border-white/15 bg-white/5 p-3 text-left text-white transition hover:border-blue-300/60 disabled:opacity-50"><span className="block text-sm font-bold">{plan.title}</span><span className="block text-lg font-black">{plan.price}</span><span className="text-xs text-slate-400">{plan.detail}</span>{buying === plan.id && <span className="block text-xs text-blue-200">Opening checkout…</span>}</button>)}
              </div>
              {status?.trial_used && <p className="text-xs text-slate-400">Your one-time free trial has already been used. You can choose a paid plan.</p>}
            </div>
          )}
          {canChat && status?.included_with_membership && <p className="text-sm text-emerald-200">AI Friend is included with your active YorBuddy subscription — no extra charge.</p>}
          {canChat && !status?.included_with_membership && status?.subscription && <p className="text-sm text-emerald-200">Active: {status.subscription.plan_id.replaceAll('_', ' ')} · Expires {new Date(status.subscription.expires_at).toLocaleString()}</p>}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.07] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-pink-500 text-white"><Bot className="h-6 w-6" /></div><div><p className="font-bold text-white">AI Friend</p><p className="text-xs text-slate-400">AI companion · Platonic only</p></div></div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">{canChat ? 'Active' : 'Preview'}</span>
          </div>
          <div className="mb-4 min-h-48 space-y-3 rounded-2xl bg-slate-950/60 p-4">
            {messages.length === 0 ? <><div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-white/10 p-3 text-sm leading-6 text-slate-200">Hi! I’m YorBuddy AI Friend. I’m here for a friendly, respectful conversation. What’s on your mind today?</div><div className="ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-blue-600/80 p-3 text-sm text-white">I’d like to talk about my day.</div>{!canChat && <p className="text-center text-[11px] text-slate-500">Illustrative preview — verify one contact, confirm 18+, and activate a plan to chat.</p>}</> : messages.map((item, index) => <div key={index} className={item.role === 'user' ? 'ml-auto max-w-[88%] rounded-2xl rounded-tr-sm bg-blue-600/80 p-3 text-sm text-white' : 'max-w-[88%] rounded-2xl rounded-tl-sm bg-white/10 p-3 text-sm leading-6 text-slate-200'}>{item.text}</div>)}
            {sending && <p className="text-xs text-slate-400">AI Friend is typing…</p>}
          </div>
          {canChat ? <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} placeholder="Write a message…" className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" /><button type="submit" disabled={!draft.trim() || sending} aria-label="Send message" className="rounded-xl bg-blue-600 px-4 text-white disabled:opacity-40"><MessageCircle className="h-5 w-5" /></button></form> : <button onClick={() => verified ? window.scrollTo({ top: document.getElementById('ai-friend')?.offsetTop || 0, behavior: 'smooth' }) : openAccess()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15">{loading ? 'Checking access…' : !isAuthenticated ? 'Sign in to unlock chat' : !verified ? 'Verify Email or Mobile' : !ageConfirmed ? 'Confirm 18+ to continue' : 'Choose a plan'}<LockKeyhole className="h-4 w-4" /></button>}
          {error && <p className="mt-3 text-xs text-rose-300">{error}</p>}
          <p className="mt-3 text-center text-[10px] leading-5 text-slate-500">AI-generated responses may be imperfect. AI Friend is not a human, therapist or emergency service.</p>
        </div>
      </div>

      {quickRegisterOpen && !isAuthenticated && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ai-friend-register-title">
          <div className="my-8 w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-blue-950/40">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-blue-200"><Bot className="h-3.5 w-3.5" /> YORBUDDY AI FRIEND</span>
                <h3 id="ai-friend-register-title" className="mt-3 text-2xl font-black text-white">Create your account</h3>
                <p className="mt-1 text-sm leading-6 text-slate-400">A quick, separate signup for AI Friend. No Buddy profile or KYC required.</p>
              </div>
              <button type="button" onClick={() => setQuickRegisterOpen(false)} className="rounded-xl border border-white/10 px-3 py-2 text-slate-300 transition hover:bg-white/10" aria-label="Close registration">✕</button>
            </div>
            <form onSubmit={submitQuickRegistration} className="space-y-3">
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-300">Full name</span><input required maxLength={100} autoComplete="name" value={quickName} onChange={event => setQuickName(event.target.value)} placeholder="Enter your name" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" /></label>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-300">Email address</span><input required type="email" maxLength={255} autoComplete="email" value={quickEmail} onChange={event => setQuickEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" /></label>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-300">Mobile number <span className="font-normal text-slate-500">(optional)</span></span><input type="tel" maxLength={30} autoComplete="tel" value={quickPhone} onChange={event => setQuickPhone(event.target.value)} placeholder="+91 98765 43210" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" /></label>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-300">Password</span><input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={quickPassword} onChange={event => setQuickPassword(event.target.value)} placeholder="At least 8 characters" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" /></label>
              <label className="block space-y-1.5"><span className="text-xs font-semibold text-slate-300">Confirm password</span><input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={quickConfirmPassword} onChange={event => setQuickConfirmPassword(event.target.value)} placeholder="Re-enter password" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-400" /></label>
              <label className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-slate-300"><input type="checkbox" required checked={quickAdultConfirmed} onChange={event => setQuickAdultConfirmed(event.target.checked)} className="mt-1 accent-blue-500" /><span>I confirm that I am 18 years or older. I understand AI Friend is an AI companion and is strictly platonic.</span></label>
              <div className="rounded-xl bg-blue-400/5 p-3 text-xs leading-5 text-slate-400"><span className="font-semibold text-blue-200">Next step:</span> Verify either your email or mobile number with OTP. KYC is not required. Chat opens after verification, age confirmation and access activation.</div>
              {error && <p role="alert" className="rounded-lg border border-rose-400/20 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</p>}
              <button type="submit" disabled={quickSubmitting} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-pink-500 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{quickSubmitting ? 'Creating account…' : 'Create AI Friend account'} <ArrowRight className="h-4 w-4" /></button>
              <p className="text-center text-[11px] text-slate-500">Already registered? Close this window and sign in.</p>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
