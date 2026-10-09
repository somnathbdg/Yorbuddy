import React, { useState } from 'react';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { Reveal } from '../visual/Decor';

interface FaqItem {
  question: string;
  answer: string;
}

const faqItems: FaqItem[] = [
  {
    question: 'What is YorBuddy?',
    answer: 'YorBuddy is a platonic companionship platform that connects people for activities, coffee, movies, city exploration and more. All meetups are strictly in public places and designed to be safe, transparent and enjoyable.',
  },
  {
    question: 'How do I find a buddy?',
    answer: 'Browse activities or use the search/filter bar to find companions based on your interests, location and availability. You can view profiles and send booking requests.',
  },
  {
    question: 'Do I need a membership?',
    answer: 'Yes, a YorBuddy membership is required to view buddy profiles, send booking requests, and access full platform features. We offer a ₹99 1-Day Access to get started.',
  },
  {
    question: 'What are the membership plans?',
    answer: 'We offer three plans: ₹99 for 1 Day (limited access), ₹499 for 1 Week (full access), and ₹1,999 for 1 Month (full access). All plans are one-time payments with no recurring charges.',
  },
  {
    question: 'Is the Free Access really free?',
    answer: 'Yes. The Free Access plan is completely free for 10 days with no payment required. It provides limited access to browse verified companions, filter by activity and city, view buddy profiles, and explore the platform.',
  },
  {
    question: 'Can I become a Buddy?',
    answer: 'Yes! If you enjoy meeting new people and want to earn by joining activities, you can apply to become a Buddy. Complete your profile, set your hourly rate, and start accepting booking requests.',
  },
  {
    question: 'How does booking work?',
    answer: 'Find a buddy, choose a suitable activity, date and time, then complete the booking. Both parties confirm the booking details before the meetup.',
  },
  {
    question: 'How does payment work?',
    answer: 'Payments are processed securely through Razorpay. You can pay via UPI, credit card, debit card, or net banking. YorBuddy earns a 10% platform commission on eligible paid bookings.',
  },
  {
    question: 'What happens if I need to cancel?',
    answer: 'You can cancel bookings through your dashboard. Cancellation policies depend on the timing of the cancellation relative to the scheduled meetup.',
  },
  {
    question: 'How can I report a problem?',
    answer: 'If you encounter any safety concerns or issues, use the reporting feature in the platform. Our admin team reviews all reports and takes appropriate action.',
  },
];

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="section-shell mesh-section-b py-20 sm:py-24">
      <div className="orb orb-purple top-[-10%] left-[10%] w-[380px] h-[380px] opacity-30 orb-drift-b" />
      <div className="orb orb-blue bottom-[-12%] right-[12%] w-[400px] h-[400px] opacity-30 orb-drift-a" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="text-center mb-12">
          <span className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full glass text-blue-600 font-bold text-sm uppercase tracking-wider mb-3">
            <HelpCircle className="w-3.5 h-3.5" />
            Support
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Frequently Asked <span className="text-gradient">Questions</span>
          </h2>
          <p className="mt-3 text-lg text-slate-600">
            Everything you need to know about YorBuddy.
          </p>
        </Reveal>

        <div className="space-y-3">
          {faqItems.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <Reveal key={idx} delay={Math.min(idx, 6) * 0.04}>
                <div
                  className={`glass-panel rounded-2xl overflow-hidden transition-all duration-300 ${
                    isOpen ? 'shadow-tint-blue' : ''
                  }`}
                >
                  <button
                    onClick={() => toggleItem(idx)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <span className="text-base font-semibold text-slate-900 pr-4">{item.question}</span>
                    <span
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isOpen ? 'bg-gradient-to-br from-blue-600 to-pink-500 text-white rotate-180' : 'bg-white/70 text-slate-400'
                      }`}
                    >
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </button>
                  <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
                    <div className="accordion-inner">
                      <div className="px-5 pb-5">
                        <div className="hairline mb-4" />
                        <p className="text-base text-slate-600 leading-relaxed">{item.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};
