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
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Reveal } from '../visual/Decor';

export const ActivitiesGrid: React.FC = () => {
  const { activities, setSelectedActivitySlug, setActiveTab } = useApp();

  const iconMap: Record<string, React.ReactNode> = {
    Coffee: <Coffee className="w-6 h-6" />,
    Film: <Film className="w-6 h-6" />,
    ShoppingBag: <ShoppingBag className="w-6 h-6" />,
    Utensils: <Utensils className="w-6 h-6" />,
    Footprints: <Footprints className="w-6 h-6" />,
    Compass: <Compass className="w-6 h-6" />,
    PartyPopper: <PartyPopper className="w-6 h-6" />,
    Gamepad2: <Gamepad2 className="w-6 h-6" />,
    MessageSquare: <MessageSquare className="w-6 h-6" />,
    Dumbbell: <Dumbbell className="w-6 h-6" />,
  };

  const activityImages: Record<string, string> = {
    'coffee-chat': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80',
    movies: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
    shopping: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
    dining: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
    'city-walk': '',
    explore: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80',
    events: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80',
    gaming: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80',
    'just-talk': 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
    fitness: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
  };

  const handleActivitySelect = (slug: string) => {
    setSelectedActivitySlug(slug);
    setActiveTab('find-buddy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="section-shell mesh-section-b py-20 sm:py-24">
      <div className="orb orb-purple top-[-8%] right-[8%] w-[420px] h-[420px] opacity-35 orb-drift-b" />
      <div className="orb orb-cyan bottom-[-10%] left-[6%] w-[360px] h-[360px] opacity-30 orb-drift-a" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal className="flex flex-col md:flex-row md:items-end justify-between mb-14">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full glass text-pink-700 text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Tailored Companionship</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Find a Buddy for Your <span className="text-gradient">Activity</span>
            </h2>
            <p className="mt-3 text-base sm:text-lg text-slate-600 max-w-xl">
              Whatever you feel like doing today, you don&apos;t have to do it alone. Choose an activity and discover verified buddies ready to join.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedActivitySlug(null);
              setActiveTab('find-buddy');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="mt-5 md:mt-0 inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl glass-strong text-sm font-bold text-blue-600 hover:text-blue-700 transition-all duration-300 hover:-translate-y-1 hover:shadow-tint-blue"
          >
            <span>View All Buddies</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </Reveal>

        {/* Activities grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {activities.map((act, idx) => {
            const icon = iconMap[act.icon] || <Coffee className="w-6 h-6" />;
            const imgUrl = activityImages[act.slug] || activityImages['coffee-chat'];

            return (
              <Reveal key={act.id} delay={Math.min(idx, 8) * 0.05} className="h-full">
                <div
                  id={`activity-card-${act.slug}`}
                  onClick={() => handleActivitySelect(act.slug)}
                  className="card-premium group relative rounded-3xl overflow-hidden cursor-pointer flex flex-col justify-between h-full"
                >
                  {/* Image header */}
                  <div className="relative h-36 w-full overflow-hidden bg-gradient-to-br from-blue-100 to-pink-100">
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt={act.title}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.14]"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-3xl opacity-60">{icon}</div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                    <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/20 to-transparent pointer-events-none" />

                    {/* Category chip */}
                    <div className="absolute bottom-3 left-3 flex items-center space-x-2 text-white">
                      <div className="w-8 h-8 rounded-lg bg-white/25 backdrop-blur-xl flex items-center justify-center text-white border border-white/30">
                        {icon}
                      </div>
                      <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                        {act.category}
                      </span>
                    </div>

                    {act.popular && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-pink-500/40">
                        Popular
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {act.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                        {act.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-pink-600 transition-colors">
                      <span>Find buddies</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
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
