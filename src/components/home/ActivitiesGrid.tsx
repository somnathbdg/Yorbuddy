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
    'coffee-chat': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=400&q=80',
    movies: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=400&q=80',
    shopping: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=400&q=80',
    dining: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
    'city-walk': 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=400&q=80',
    explore: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=400&q=80',
    events: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=400&q=80',
    gaming: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=400&q=80',
    'just-talk': 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=400&q=80',
    fitness: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=400&q=80',
  };

  const handleActivitySelect = (slug: string) => {
    setSelectedActivitySlug(slug);
    setActiveTab('find-buddy');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-pink-100 text-pink-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>Tailored Companionship</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Find a Buddy for Your Activity
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-xl">
              Whatever you feel like doing today, you don&apos;t have to do it alone. Choose an activity and discover verified buddies ready to join.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedActivitySlug(null);
              setActiveTab('find-buddy');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="mt-4 md:mt-0 inline-flex items-center space-x-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <span>View All Buddies</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 10 Activities Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {activities.map((act) => {
            const icon = iconMap[act.icon] || <Coffee className="w-6 h-6" />;
            const imgUrl = activityImages[act.slug] || activityImages['coffee-chat'];

            return (
              <div
                key={act.id}
                id={`activity-card-${act.slug}`}
                onClick={() => handleActivitySelect(act.slug)}
                className="group relative bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                {/* Image Header with Gradient */}
                <div className="relative h-32 w-full overflow-hidden">
                  <img
                    src={imgUrl}
                    alt={act.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

                  {/* Icon badge floating over image */}
                  <div className="absolute bottom-2.5 left-3 flex items-center space-x-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                      {icon}
                    </div>
                    <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                      {act.category}
                    </span>
                  </div>

                  {act.popular && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-pink-500 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                      Popular
                    </span>
                  )}
                </div>

                {/* Content body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {act.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {act.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-pink-600 transition-colors">
                    <span>Find buddies</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
