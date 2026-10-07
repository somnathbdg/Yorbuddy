import React from 'react';
import {
  Coffee,
  Film,
  ShoppingBag,
  Utensils,
  Footprints,
  Compass,
  PartyPopper,
  Gamepad2,
  MessageSquare,
  Dumbbell,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Reveal, TiltCard } from '../visual/Decor';

interface ActivityCategory {
  slug: string;
  title: string;
  icon: React.ReactNode;
  image: string;
}

const categories: ActivityCategory[] = [
  { slug: 'coffee-chat', title: 'Café Chat', icon: <Coffee className="w-5 h-5" />, image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80' },
  { slug: 'fitness', title: 'Morning Run', icon: <Dumbbell className="w-5 h-5" />, image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80' },
  { slug: 'city-walk', title: 'City Walk', icon: <Footprints className="w-5 h-5" />, image: '' },
  { slug: 'events', title: 'Live Events', icon: <PartyPopper className="w-5 h-5" />, image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80' },
  { slug: 'dining', title: 'Street Food', icon: <Utensils className="w-5 h-5" />, image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80' },
  { slug: 'shopping', title: 'Shopping', icon: <ShoppingBag className="w-5 h-5" />, image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80' },
  { slug: 'movies', title: 'Movies', icon: <Film className="w-5 h-5" />, image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80' },
  { slug: 'gaming', title: 'Gaming', icon: <Gamepad2 className="w-5 h-5" />, image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80' },
  { slug: 'just-talk', title: 'Just Talk', icon: <MessageSquare className="w-5 h-5" />, image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80' },
  { slug: 'explore', title: 'Explore', icon: <Compass className="w-5 h-5" />, image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80' },
];

export const ActivityCategoryStrip: React.FC = () => {
  const { setSelectedActivitySlug, setActiveTab } = useApp();

  const handleCategoryClick = (slug: string) => {
    setSelectedActivitySlug(slug);
    setActiveTab('find-buddy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="section-shell mesh-section-a py-14 sm:py-16">
      {/* Soft seam so this section hands off to the previous one */}
      <div className="section-seam" aria-hidden="true" />

      {/* Decorative blobs */}
      <div className="orb orb-blue top-[-10%] left-[12%] w-[420px] h-[420px] opacity-40 orb-drift-a" />
      <div className="orb orb-pink bottom-[-14%] right-[10%] w-[380px] h-[380px] opacity-35 orb-drift-c" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <Reveal className="flex flex-col sm:flex-row sm:items-end justify-between mb-10">
          <div className="relative">
            <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-1.5 h-14 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500 rounded-full hidden sm:block shadow-tint-violet" />
            <span className="inline-flex items-center px-3 py-1 rounded-full glass text-blue-700 text-xs font-bold uppercase tracking-wider mb-3">
              Pick Your Plan
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.1]">
              <span className="bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent">
                Find a Buddy for
              </span>
              <br className="sm:hidden" />{' '}
              <span className="text-gradient-vivid">Your Next Plan</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-500 mt-3 max-w-xl">
              Whatever you enjoy doing, find someone who wants to do it with you.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedActivitySlug(null);
              setActiveTab('find-buddy');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="mt-4 sm:mt-0 inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-xl glass-strong text-base font-bold text-blue-600 hover:text-blue-700 flex-shrink-0 group/btn transition-all duration-300 hover:-translate-y-1 hover:shadow-tint-blue"
          >
            <span>View All</span>
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </Reveal>

        {/* Activity cards — horizontal scroll on mobile, 10-up grid on desktop */}
        <div className="flex overflow-x-auto pb-6 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-10 sm:gap-4 sm:overflow-visible sm:pb-0">
          {categories.map((cat, index) => (
            <Reveal key={cat.slug} delay={index * 0.05} className="flex-shrink-0 w-[104px] sm:w-auto sm:min-w-0">
              <TiltCard intensity={9} lift={10} className="h-full">
                <button
                  onClick={() => handleCategoryClick(cat.slug)}
                  className="group flex flex-col items-center space-y-2 sm:space-y-3 w-full"
                >
                  {/* Card */}
                  <div className="relative w-full aspect-square rounded-2xl">
                    {/* Hover glow halo */}
                    <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-blue-400/40 via-purple-400/40 to-pink-400/40 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/80 bg-white/85 shadow-[0_2px_4px_-1px_rgba(15,23,42,0.06),0_10px_22px_-10px_rgba(15,23,42,0.22),0_26px_50px_-24px_rgba(99,102,241,0.3)] group-hover:shadow-[0_4px_8px_-2px_rgba(15,23,42,0.08),0_22px_44px_-16px_rgba(99,102,241,0.5),0_44px_80px_-32px_rgba(236,72,153,0.32)] transition-shadow duration-500">
                      {/* Image / placeholder — image leads, gradient only grounds it */}
                      {cat.image ? (
                        <>
                          <img
                            src={cat.image}
                            alt={cat.title}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.16]"
                          />
                          {/* Bottom-weighted vignette: keeps the label legible
                              while leaving the top ~2/3 of the photo clear. */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/18 to-transparent transition-opacity duration-500 group-hover:from-black/84" />
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 text-purple-500">
                          {cat.icon}
                        </div>
                      )}

                      {/* Glass top highlight — premium surface read */}
                      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

                      {/* Floating icon badge */}
                      <div className="absolute top-2 right-2 w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/85 backdrop-blur-xl flex items-center justify-center text-blue-600 shadow-lg shadow-blue-500/20 border border-white/70 group-hover:scale-110 group-hover:bg-white transition-all duration-300">
                        {cat.icon}
                      </div>

                      {/* Label */}
                      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-2.5">
                        <span className="text-[11px] sm:text-xs font-bold text-white drop-shadow-md leading-tight block">
                          {cat.title}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mobile-only caption below card */}
                  <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600 transition-colors whitespace-nowrap sm:hidden">
                    {cat.title}
                  </span>
                </button>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};
