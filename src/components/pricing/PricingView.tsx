import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Clock,
  Crown,
  Lock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { membershipService } from '../../services/membership';

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  badge?: string;
  badgeColor?: string;
  features: string[];
  cta: string;
  icon: React.ReactNode;
  popular?: boolean;
  apiPlanId: string;
  accessType: 'limited' | 'full';
}

const plans: PricingPlan[] = [
  {
    id: 'trial-1d',
    name: '1 Day Access',
    price: '₹99',
    period: 'for 1 day',
    badge: 'LIMITED ACCESS',
    badgeColor: 'bg-amber-100 text-amber-700',
    features: [
      'Browse verified companions',
      'Filter by activity & city',
      'View buddy profiles',
      'Explore the platform',
      'Payment required (₹99)',
    ],
    cta: 'Get 1 Day Access',
    icon: <Sparkles className="w-5 h-5" />,
    apiPlanId: 'TRIAL_1D',
    accessType: 'limited',
  },
  {
    id: '1-week',
    name: '1 Week',
    price: '₹499',
    period: 'for 7 days',
    badge: 'FULL ACCESS',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    features: [
      'Everything in 1 Day Access',
      'Send booking requests',
      'In-app chat after booking',
      'Priority support',
      'Verified companion badge',
    ],
    cta: 'Get 1 Week Plan',
    icon: <Clock className="w-5 h-5" />,
    apiPlanId: 'WEEK_1',
    accessType: 'full',
  },
  {
    id: '1-month',
    name: '1 Month',
    price: '₹1,999',
    period: 'for 30 days',
    badge: 'FULL ACCESS',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    popular: true,
    features: [
      'Everything in 1 Week',
      'Priority booking requests',
      'Enhanced search filters',
      'Dedicated account manager',
      'Early feature access',
    ],
    cta: 'Get 1 Month Plan',
    icon: <Crown className="w-5 h-5" />,
    apiPlanId: 'MONTH_1',
    accessType: 'full',
  },
];

export const PricingView: React.FC = () => {
  const { openRegisterModal, currentUser, setIsRegisterModalOpen, setAuthMode, setActiveTab, setPendingMembershipPlan, fetchApiMembership, apiMembership } = useApp();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipSuccess, setMembershipSuccess] = useState(false);

  const activePlanId = apiMembership?.is_active ? apiMembership.plan_id : null;

  // Refresh membership state on mount
  useEffect(() => {
    fetchApiMembership();
  }, [fetchApiMembership]);

  const handleTrialPayment = async () => {
    // TRIAL_1D is a PAID ₹99 plan — use the same Razorpay flow as all other plans.
    setMembershipError(null);
    setMembershipSuccess(false);

    const trialPlan = plans.find((p) => p.apiPlanId === 'TRIAL_1D');
    if (!trialPlan) return;

    if (!currentUser || !currentUser.id) {
      // Open registration modal for logged-out users
      setPendingMembershipPlan('TRIAL_1D');
      setAuthMode('register');
      setIsRegisterModalOpen(true);
      return;
    }

    // Logged-in user: go directly through Razorpay payment
    await handleMembershipPayment(trialPlan);
  };

  const handleMembershipPayment = async (plan: PricingPlan) => {
    setMembershipError(null);
    setMembershipSuccess(false);

    if (!currentUser || !currentUser.id) {
      // Open login modal for logged-out users
      setPendingMembershipPlan(plan.apiPlanId);
      setAuthMode('login');
      setIsRegisterModalOpen(true);
      return;
    }

    setProcessingPlanId(plan.apiPlanId);
    try {
      const order = await membershipService.createOrder(plan.apiPlanId);

      membershipService.openCheckout({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        order_id: order.order_id,
        name: 'YorBuddy',
        description: `Membership: ${order.plan_name}`,
        prefill: {
          name: currentUser.full_name,
          email: currentUser.email,
        },
        theme: { color: '#2563EB' },
        handler: async (response: any) => {
          try {
            await membershipService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setMembershipSuccess(true);
          } catch (verifyErr: any) {
            const apiError = verifyErr.response?.data?.error;
            setMembershipError(apiError?.message || 'Payment verification failed.');
          } finally {
            setProcessingPlanId(null);
            // CRITICAL: Refresh global membership state so Header, Dashboard,
            // and BuddySearch all unlock after verified payment → active membership.
            try {
              await fetchApiMembership();
            } catch (fetchErr) {
              console.error('[PricingView] Failed to refresh membership after verification:', fetchErr);
            }
          }
        },
        onDismiss: () => {
          setProcessingPlanId(null);
          setMembershipError('Payment was cancelled.');
        },
        onError: (err: any) => {
          setProcessingPlanId(null);
          setMembershipError('Payment failed: ' + (err.message || 'Unknown error'));
        },
      });
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setMembershipError(apiError?.message || 'Failed to initiate payment.');
      setProcessingPlanId(null);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <style>{`
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }
        @media (max-width: 1024px) {
          .pricing-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 640px) {
          .pricing-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-pink-100 text-pink-700 text-sm font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            <span>Simple & Transparent</span>
          </div>

          {activePlanId ? (
            <>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                Your Plan
              </h1>
              <div className="inline-flex flex-col items-center bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-2xl px-8 py-4 shadow-sm">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">Active Membership</span>
                <span className="text-2xl font-black text-slate-900">
                  {activePlanId === 'TRIAL_1D' ? '1 Day Access' : activePlanId === 'WEEK_1' ? '1 Week' : activePlanId === 'MONTH_1' ? '1 Month' : activePlanId}
                </span>
                <span className="text-sm text-slate-500 mt-1">₹{apiMembership?.amount} Paid</span>
                <span className={`text-xs font-bold mt-2 px-3 py-1 rounded-full ${
                  apiMembership?.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {apiMembership?.is_active
                    ? (apiMembership?.expiry_date ? `Expires: ${new Date(apiMembership.expiry_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'Never Expires')
                    : 'Expired'}
                </span>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
                Choose Your Plan
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Start with a ₹99 1-Day Access or unlock Full Access with a Paid Membership.
              </p>
            </>
          )}
        </div>

        {/* How Access Works */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900">1 Day Access</h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Try YorBuddy for ₹99 for 1 day with limited access. Payment required.
              </p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Paid Membership</h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Complete payment to unlock full access to YorBuddy features for your selected membership period.
            </p>
          </div>
        </div>

        {/* Access Notice */}
        <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-blue-50 border border-blue-200 text-center">
          <p className="text-base font-bold text-blue-800">
            <span className="text-amber-600">1 Day Access = Paid Access</span>
            <span className="mx-2">|</span>
            <span className="text-emerald-600">Paid Membership = Full Access</span>
          </p>
        </div>

        {/* Membership Success Message */}
        {membershipSuccess && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <span className="text-base font-bold text-emerald-800">Membership activated successfully! You now have access to all features.</span>
          </div>
        )}

        {/* Membership Error Message */}
        {membershipError && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <p className="text-base font-bold text-rose-600">{membershipError}</p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="pricing-grid">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-3xl p-6 sm:p-8 border-2 shadow-lg flex flex-col ${
                plan.popular
                  ? 'border-pink-400 shadow-pink-500/20'
                  : 'border-slate-200 shadow-slate-500/10'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${plan.badgeColor}`}
                >
                  {plan.badge}
                </div>
              )}

              {/* Icon */}
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                  plan.popular
                    ? 'bg-pink-100 text-pink-600'
                    : plan.accessType === 'limited'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {plan.icon}
              </div>

              {/* Plan name */}
              <h3 className="text-lg font-black text-slate-900">{plan.name}</h3>

              {/* Price */}
              <div className="flex items-baseline space-x-2 mt-2">
                <span className="text-4xl font-black text-slate-900 tracking-tight">
                  {plan.price}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">{plan.period}</p>

              {/* Features */}
              <div className="space-y-3 mt-6 flex-1">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-slate-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                {activePlanId === plan.apiPlanId ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-2xl font-black text-base shadow-lg flex items-center justify-center space-x-2 bg-emerald-100 text-emerald-700 cursor-not-allowed border-2 border-emerald-300"
                  >
                    <span>Your Current Plan</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                ) : activePlanId === 'TRIAL_1D' && plan.apiPlanId === 'TRIAL_1D' ? (
                  <button
                    disabled
                    className="w-full py-3.5 rounded-2xl font-black text-base shadow-lg flex items-center justify-center space-x-2 bg-slate-100 text-slate-500 cursor-not-allowed"
                  >
                    <span>Access Active — Cannot Repurchase</span>
                  </button>
                ) : plan.apiPlanId === 'TRIAL_1D' ? (
                  <button
                    onClick={handleTrialPayment}
                    disabled={processingPlanId === plan.apiPlanId}
                    className="w-full py-3.5 rounded-2xl font-black text-base shadow-lg transition-opacity flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-500/25 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Start 1 Day Access (₹99)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => handleMembershipPayment(plan)}
                    disabled={processingPlanId === plan.apiPlanId}
                    className={`w-full py-3.5 rounded-2xl font-black text-base shadow-lg transition-opacity flex items-center justify-center space-x-2 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-pink-500 to-blue-600 text-white shadow-pink-500/25 hover:opacity-95'
                        : 'bg-gradient-to-r from-blue-600 via-blue-500 to-pink-500 text-white shadow-blue-500/25 hover:opacity-95'
                    } ${processingPlanId === plan.apiPlanId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{processingPlanId === plan.apiPlanId ? 'Processing...' : (activePlanId && activePlanId !== plan.apiPlanId ? `Upgrade to ${plan.name}` : plan.cta)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Notice */}
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-base text-slate-500 font-medium">
            Payment is required for the 1 Day Access. Paid membership provides full access.
          </p>
        </div>

        {/* Info Callout */}
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-start space-x-4">
          <ShieldCheck className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
          <div className="space-y-1 text-sm text-slate-600">
            <h4 className="text-sm font-bold text-slate-900">
              How Companion Fees Work
            </h4>
            <p className="leading-relaxed">
              Companions set their own hourly rates (₹400 – ₹1200/hr) which are paid directly per booking.
            </p>
            <p className="text-slate-500 pt-1">
              For example, if you book a buddy for a 2-hour coffee session at ₹600/hr, your booking total is ₹1,200. The membership fee is only paid once when creating your verified account.
            </p>
          </div>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto space-y-4">
          <h3 className="text-xl font-black text-slate-900 text-center mb-6">
            Frequently Asked Questions
          </h3>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-900 block text-sm">
              What does 1 Day Access include?
            </span>
            <p className="text-slate-600 leading-relaxed">
              1 Day Access gives you limited access to browse verified companions, filter by activity and city, view buddy profiles, and explore the platform. To unlock full access including booking requests and in-app chat, you need a paid membership.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-900 block text-sm">
              Why do you charge a membership fee?
            </span>
            <p className="text-slate-600 leading-relaxed">
              The membership fee directly covers third-party government identity checks, video KYC fraud audits, and ongoing safety monitoring.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-900 block text-sm">
              What happens if a companion cancels or doesn&apos;t show up?
            </span>
            <p className="text-slate-600 leading-relaxed">
              You receive a 100% full refund immediately back to your original payment method.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
