import React, { useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Clock,
  Zap,
  Crown,
  Infinity as InfinityIcon,
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
}

const plans: PricingPlan[] = [
  {
    id: '1-month',
    name: '1 Month',
    price: '₹199.00',
    period: 'for 1 month',
    features: [
      'Browse verified companions',
      'Filter by activity & city',
      'Send booking requests',
      'In-app chat after booking',
      'Public meeting protocol',
    ],
    cta: 'Get 1 Month Plan',
    icon: <Clock className="w-5 h-5" />,
    apiPlanId: 'MONTH_1',
  },
  {
    id: '6-months',
    name: '6 Months',
    price: '₹999.00',
    period: 'for 6 months',
    badge: 'Save 17%',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    features: [
      'Everything in 1 Month',
      'Priority booking requests',
      'Verified companion badge',
      'Enhanced search filters',
      'Priority support',
    ],
    cta: 'Get 6 Months Plan',
    icon: <Zap className="w-5 h-5" />,
    apiPlanId: 'MONTH_6',
  },
  {
    id: '1-year',
    name: '1 Year',
    price: '₹1,699.00',
    period: 'for 1 year',
    badge: 'Most Popular',
    badgeColor: 'bg-pink-100 text-pink-700',
    popular: true,
    features: [
      'Everything in 6 Months',
      'Top companion priority',
      'Exclusive events access',
      'Dedicated account manager',
      'Early feature access',
    ],
    cta: 'Get 1 Year Plan',
    icon: <Crown className="w-5 h-5" />,
    apiPlanId: 'YEAR_1',
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '₹4,999.00',
    period: 'Lifetime access',
    badge: 'Best Value',
    badgeColor: 'bg-blue-100 text-blue-700',
    features: [
      'Everything in 1 Year',
      'Lifetime membership',
      'No renewal fees',
      'VIP companion access',
      'Exclusive community',
    ],
    cta: 'Get Lifetime Plan',
    icon: <InfinityIcon className="w-5 h-5" />,
    apiPlanId: 'LIFETIME',
  },
];

export const PricingView: React.FC = () => {
  const { openRegisterModal, currentUser } = useApp();
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipSuccess, setMembershipSuccess] = useState(false);

  const handleMembershipPayment = async (plan: PricingPlan) => {
    setMembershipError(null);
    setMembershipSuccess(false);

    // If not logged in, open register modal
    if (!currentUser || !currentUser.id) {
      openRegisterModal();
      return;
    }

    setProcessingPlanId(plan.apiPlanId);
    try {
      // Create membership order via backend (server calculates amount)
      const order = await membershipService.createOrder(plan.apiPlanId);

      // Open Razorpay Checkout
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
            // Verify payment with backend
            await membershipService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setMembershipSuccess(true);
          } catch (verifyErr: any) {
            const apiError = verifyErr.response?.data?.error;
            setMembershipError(apiError?.message || 'Payment verification failed. Please contact support.');
          } finally {
            setProcessingPlanId(null);
          }
        },
        onDismiss: () => {
          setProcessingPlanId(null);
          setMembershipError('Payment was cancelled. You can try again.');
        },
        onError: (err: any) => {
          setProcessingPlanId(null);
          setMembershipError('Payment failed: ' + (err.message || 'Unknown error'));
        },
      });
    } catch (err: any) {
      const apiError = err.response?.data?.error;
      setMembershipError(apiError?.message || 'Failed to initiate payment. Please try again.');
      setProcessingPlanId(null);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-16">
      <style>{`
        .pricing-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 24px;
          max-width: 1200px;
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
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-pink-100 text-pink-700 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-pink-600" />
            <span>Simple & Transparent</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Choose Your Plan
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Find your perfect plan and start meaningful connections today.
          </p>
        </div>

        {/* Membership Success Message */}
        {membershipSuccess && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3">
            <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-bold text-emerald-800">Membership activated successfully! You now have access to all premium features.</span>
          </div>
        )}

        {/* Membership Error Message */}
        {membershipError && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200">
            <p className="text-sm font-bold text-rose-600">{membershipError}</p>
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
              <p className="text-xs text-slate-500 mt-1">{plan.period}</p>

              {/* Features */}
              <div className="space-y-3 mt-6 flex-1">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-700 font-medium">{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              <div className="pt-6 mt-6 border-t border-slate-100">
                <button
                  onClick={() => handleMembershipPayment(plan)}
                  disabled={processingPlanId === plan.apiPlanId}
                  className={`w-full py-3.5 rounded-2xl font-black text-sm shadow-lg transition-opacity flex items-center justify-center space-x-2 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-pink-500 to-blue-600 text-white shadow-pink-500/25 hover:opacity-95'
                      : 'bg-gradient-to-r from-blue-600 via-blue-500 to-pink-500 text-white shadow-blue-500/25 hover:opacity-95'
                  } ${processingPlanId === plan.apiPlanId ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span>{processingPlanId === plan.apiPlanId ? 'Processing...' : plan.cta}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Callout */}
        <div className="max-w-2xl mx-auto p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex items-start space-x-4">
          <ShieldCheck className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
          <div className="space-y-1 text-xs text-slate-600">
            <h4 className="text-sm font-bold text-slate-900">
              How Companion Fees Work
            </h4>
            <p className="leading-relaxed">
              Companions set their own hourly rates (₹400 – ₹1200/hr) which are paid directly per booking.
            </p>
            <p className="text-slate-500 pt-1">
              For example, if you book Neha for a 2-hour coffee session at ₹600/hr, your booking total is ₹1,200. The membership fee is only paid once when creating your verified account.
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
              Why do you charge a membership fee?
            </span>
            <p className="text-slate-600 leading-relaxed">
              The membership fee directly covers third-party government identity checks, video KYC fraud audits, and ongoing safety monitoring. This filters out non-serious users and guarantees a respectful, platonic community.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-900 block text-sm">
              What happens if a companion cancels or doesn&apos;t show up?
            </span>
            <p className="text-slate-600 leading-relaxed">
              You receive a 100% full refund immediately back to your original payment method. Companions who miss confirmed sessions face platform de-activation.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-1 text-xs">
            <span className="font-bold text-slate-900 block text-sm">
              Can I meet at a private apartment or hotel?
            </span>
            <p className="text-slate-600 leading-relaxed">
              <strong>Strictly No.</strong> YorBuddy policies mandate public-only meetings (cafes, malls, restaurants, parks). Proposing private accommodations is a zero-tolerance policy violation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
