import { Activity } from '../types/database';

/**
 * Static activity types for YorBuddy platform.
 * These are reference data (activity categories), not user-specific data.
 * Activity IDs are UUIDs matching the activities table in the database.
 */
export const ACTIVITIES: Activity[] = [
  {
    id: 'de9ccefc-e4a5-48fe-b70c-c6f51bbfa49f',
    slug: 'coffee-chat',
    title: 'Coffee & Chat',
    icon: 'Coffee',
    category: 'Casual',
    description: 'Catch up over artisanal brews, espresso, or masala chai in cozy public cafes.',
    popular: true,
  },
  {
    id: '80684f33-160e-4cab-81bb-0281de666e96',
    slug: 'movies',
    title: 'Movies',
    icon: 'Film',
    category: 'Entertainment',
    description: 'Watch the latest Bollywood, regional, or Hollywood blockbuster with a movie buddy.',
    popular: true,
  },
  {
    id: '8f28a29d-0d24-4c67-b974-00512929b704',
    slug: 'shopping',
    title: 'Shopping',
    icon: 'ShoppingBag',
    category: 'Lifestyle',
    description: 'Get an honest second opinion on outfits, thrift store hunts, or mall sprees.',
    popular: true,
  },
  {
    id: 'fb048f9b-0a3d-4b64-ba8b-cc0f73dd4e26',
    slug: 'dining',
    title: 'Dining',
    icon: 'Utensils',
    category: 'Food',
    description: 'Try that new rooftop diner, street food lane, or authentic regional cuisine.',
    popular: true,
  },
  {
    id: 'd849b6df-74ff-4ce4-b25c-63103d7a7aa1',
    slug: 'city-walk',
    title: 'City Walk',
    icon: 'Footprints',
    category: 'Exploration',
    description: 'Brisk evening walks along promenades, heritage lanes, lakefronts, or parks.',
    popular: true,
  },
  {
    id: '0b21317f-84d2-424c-b833-bb5d01a4a752',
    slug: 'explore',
    title: 'Explore',
    icon: 'Compass',
    category: 'Exploration',
    description: 'Discover hidden museums, weekend flea markets, botanical gardens, and viewpoints.',
    popular: false,
  },
  {
    id: '1a399b95-a0a4-43db-91b7-234991169c17',
    slug: 'events',
    title: 'Events',
    icon: 'PartyPopper',
    category: 'Culture',
    description: 'Attend standup comedy shows, indie concerts, art workshops, or tech meetups.',
    popular: false,
  },
  {
    id: '2dca29d7-2777-4f19-8087-1e41e6fa2ee7',
    slug: 'gaming',
    title: 'Gaming',
    icon: 'Gamepad2',
    category: 'Fun',
    description: 'Play board games, VR arcades, escape rooms, or console gaming in gaming cafes.',
    popular: false,
  },
  {
    id: 'bf942883-bd6b-4be5-b6a3-4a6456554d6f',
    slug: 'just-talk',
    title: 'Just Talk',
    icon: 'MessageSquare',
    category: 'Wellness',
    description: 'A genuine, non-judgmental listening ear to vent, reflect, and share life updates.',
    popular: true,
  },
  {
    id: 'd954316b-3d00-419b-bd4c-bda6110f7fd5',
    slug: 'fitness',
    title: 'Fitness',
    icon: 'Dumbbell',
    category: 'Health',
    description: 'Workout partners for morning jogs, badminton games, yoga in the park, or gym sessions.',
    popular: false,
  },
];
