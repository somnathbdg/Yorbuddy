import React from 'react';
import {
  Users,
  Heart,
  ShieldCheck,
  MapPin,
  Lock,
  CreditCard,
} from 'lucide-react';
import { Reveal } from '../visual/Decor';

const reasons = [
  {
    icon: <Heart className="w-6 h-6 text-rose-500" />,
    title: 'Find people based on shared activities',
    desc: 'Connect with companions who share your interests and hobbies.',
    ring: 'group-hover:shadow-rose-500/25',
  },
  {
    icon: <MapPin className="w-6 h-6 text-blue-500" />,
    title: 'Discover compatible companions',
    desc: 'Filter by location, interests, availability, and more.',
    ring: 'group-hover:shadow-blue-500/25',
  },
  {
    icon: <Users className="w-6 h-6 text-purple-500" />,
    title: 'Flexible activity-based connections',
    desc: 'From coffee to trekking, find buddies for any activity.',
    ring: 'group-hover:shadow-purple-500/25',
  },
  {
    icon: <ShieldCheck className="w-6 h-6 text-emerald-500" />,
    title: 'Transparent membership options',
    desc: 'Clear pricing with no hidden fees or recurring charges.',
    ring: 'group-hover:shadow-emerald-500/25',
  },
  {
    icon: <CreditCard className="w-6 h-6 text-amber-500" />,
    title: 'Secure online booking/payment',
    desc: 'Razorpay-powered payments with full booking records.',
    ring: 'group-hover:shadow-amber-500/25',
  },
  {
    icon: <Lock className="w-6 h-6 text-indigo-500" />,
    title: 'User reporting and safety controls',
    desc: 'Report concerns and help keep the platform safe for everyone.',
    ring: 'group-hover:shadow-indigo-500/25',
  },
];

export const WhyYorBuddy: React.FC = () => {
  return (
    <section className="section-shell mesh-section-a py-14 sm:py-16">
      {/* Soft seam so this section hands off to the previous one */}
      <div className="section-seam" aria-hidden="true" />

      <div className="orb orb-cyan top-[-8%] right-[10%] w-[380px] h-[380px] opacity-30 orb-drift-c" />
      <div className="orb orb-pink bottom-[-10%] left-[8%] w-[360px] h-[360px] opacity-25 orb-drift-a" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center px-3.5 py-1.5 rounded-full glass text-purple-600 font-bold text-sm uppercase tracking-wider mb-3">
            Why YorBuddy
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Why Choose <span className="text-gradient">YorBuddy?</span>
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            We make finding platonic companions simple, safe, and enjoyable.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {reasons.map((reason, idx) => (
            <Reveal key={idx} delay={(idx % 3) * 0.07} className="h-full">
              <div
                className={`group relative flex items-start space-x-4 p-5 rounded-3xl card-activity h-full ${reason.ring}`}
              >
                {/* Gradient hairline edge for a premium, non-grey boundary */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl gradient-border" aria-hidden="true" />
                <div className="icon-tile w-12 h-12 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {reason.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">{reason.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{reason.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
