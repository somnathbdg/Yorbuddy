import { getSupabase } from '../config/database.js';

// Activity ID mapping: mock data uses act-1..act-10, database uses UUIDs
// This will be populated at runtime
let ACTIVITY_ID_MAP: Record<string, string> = {};

async function loadActivityMap(supabase: any) {
  const { data: activities } = await supabase.from('activities').select('id, slug');
  if (activities) {
    // Map slug to id
    const slugToId: Record<string, string> = {};
    activities.forEach((a: any) => {
      slugToId[a.slug] = a.id;
    });
    
    // Map act-1..act-10 based on slug order
    const slugOrder = ['coffee-chat', 'movies', 'shopping', 'dining', 'city-walk', 'explore', 'events', 'gaming', 'just-talk', 'fitness'];
    for (let i = 0; i < slugOrder.length; i++) {
      const slug = slugOrder[i];
      if (slugToId[slug]) {
        ACTIVITY_ID_MAP[`act-${i + 1}`] = slugToId[slug];
      }
    }
  }
  console.log('[SEED] Activity ID map:', ACTIVITY_ID_MAP);
}

// Inline buddy seed data (20 buddies from Yorbuddy dataset)
const BUDDY_SEED_DATA = [
  { origId: 'usr-b9', name: 'Aarav Malhotra', gender: 'male', dob: '1998-06-12', city: 'Pune', area: 'Koregaon Park & Kalyani Nagar', rate: 650, rating: 4.93, reviews: 84, online: true, photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80', headline: 'Specialty coffee aficionado & weekend live gig companion.', bio: 'Avid specialty coffee lover and music enthusiast.', languages: ['English', 'Hindi', 'Punjabi'], interests: ['Pour Over Coffee', 'Acoustic Gigs', 'Vinyl Records', 'Bookstores', 'Urban Cycling'], activities: ['act-1', 'act-2', 'act-5', 'act-7'], badge: 'Coffee Connoisseur', responseTime: 'Usually responds in 10 mins' },
  { origId: 'usr-b10', name: 'Ishita Sen', gender: 'female', dob: '2001-09-24', city: 'Kolkata', area: 'Salt Lake & New Town', rate: 550, rating: 4.89, reviews: 62, online: false, photo: 'https://images.unsplash.com/photo-1617922001439-4a2e6562f328?auto=format&fit=crop&w=600&q=80', headline: 'Art museum lover, bookworm & tranquil lake walk partner.', bio: 'Literature graduate who loves spending peaceful afternoons discussing contemporary fiction.', languages: ['Bengali', 'English', 'Hindi'], interests: ['Modern Art', 'Classic Novels', 'Eco Park Walks', 'Darjeeling Tea', 'Quiet Cafes'], activities: ['act-1', 'act-5', 'act-6', 'act-9'], badge: 'Thoughtful Buddy', responseTime: 'Usually responds in 25 mins' },
  { origId: 'usr-b11', name: 'Devansh Singhania', gender: 'male', dob: '1997-12-05', city: 'Bengaluru', area: 'Indiranagar & Domlur', rate: 750, rating: 4.96, reviews: 110, online: true, photo: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80', headline: 'Board game strategist, tech geek & brunch companion.', bio: 'Product manager by day, enthusiastic board gamer on weekends.', languages: ['English', 'Hindi'], interests: ['Catan', 'Chess', 'Sunday Brunches', 'Tech Trends', 'Sci-Fi Movies'], activities: ['act-1', 'act-4', 'act-8', 'act-2'], badge: 'Board Game Pro', responseTime: 'Usually responds in 5 mins' },
  { origId: 'usr-b12', name: 'Kavya Pillai', gender: 'female', dob: '2000-04-18', city: 'Chennai', area: 'Besant Nagar & Adyar', rate: 600, rating: 4.91, reviews: 78, online: true, photo: 'https://images.unsplash.com/photo-1609137144813-7d9921338f24?auto=format&fit=crop&w=600&q=80', headline: "Breezy beach walks at Elliot's Beach & filter kaapi talks.", bio: 'Born and brought up in Chennai. Love sunset strolls by Bessy beach.', languages: ['Tamil', 'English', 'Hindi'], interests: ['Filter Coffee', 'Sunset Walks', 'Architecture', 'Podcasts', 'Carnatic Music'], activities: ['act-1', 'act-5', 'act-9', 'act-4'], badge: 'Active Listener', responseTime: 'Usually responds in 15 mins' },
  { origId: 'usr-b13', name: 'Aditya Kashyap', gender: 'male', dob: '1999-01-30', city: 'Mumbai', area: 'Powai & Andheri East', rate: 700, rating: 4.88, reviews: 95, online: true, photo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', headline: 'Foodie explorer, lake jogger & weekend cinema buddy.', bio: 'Great conversationalist who enjoys discovering hidden food gems in Mumbai.', languages: ['Hindi', 'English', 'Marathi'], interests: ['Street Tacos', 'IMAX Cinema', 'Lake Running', 'Documentaries', 'Photography'], activities: ['act-2', 'act-4', 'act-5', 'act-10'], badge: 'Movie Buff', responseTime: 'Usually responds in 10 mins' },
  { origId: 'usr-b14', name: 'Riddhi Joshi', gender: 'female', dob: '2002-07-14', city: 'Ahmedabad', area: 'Bodakdev & Vastrapur', rate: 500, rating: 4.85, reviews: 49, online: false, photo: 'https://images.unsplash.com/photo-1594744803329-e58b31de8bf5?auto=format&fit=crop&w=600&q=80', headline: 'Sabarmati Riverfront walks & heritage Pol explorer.', bio: 'Architecture student passionate about urban design and Ahmedabad heritage.', languages: ['Gujarati', 'Hindi', 'English'], interests: ['Riverfront Walks', 'Heritage Haveli', 'Sketching', 'Street Food', 'Book Fairs'], activities: ['act-1', 'act-5', 'act-6', 'act-3'], badge: 'City Explorer', responseTime: 'Usually responds in 20 mins' },
  { origId: 'usr-b15', name: 'Manish Rawat', gender: 'male', dob: '1996-03-21', city: 'Delhi NCR', area: 'Gurgaon Cyber Hub & Sector 29', rate: 850, rating: 4.94, reviews: 130, online: true, photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80', headline: 'Startup talks, bowling lanes & Cyber Hub dining companion.', bio: 'Energetic companion ready to join you for lively bowling rounds at Cyber Hub.', languages: ['Hindi', 'English'], interests: ['Bowling', 'Cyber Hub Diners', 'Startup Culture', 'Fitness', 'Automobiles'], activities: ['act-4', 'act-7', 'act-8', 'act-10'], badge: 'Super Companion', responseTime: 'Usually responds in 5 mins' },
  { origId: 'usr-b16', name: 'Tanvi Nair', gender: 'female', dob: '2001-11-09', city: 'Kochi', area: 'Fort Kochi & Panampilly Nagar', rate: 550, rating: 4.92, reviews: 58, online: true, photo: 'https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?auto=format&fit=crop&w=600&q=80', headline: 'Art biennale companion & colonial cafe explorer.', bio: 'Creative soul based in Fort Kochi. Perfect partner for art biennale trails.', languages: ['Malayalam', 'English', 'Hindi'], interests: ['Art Biennale', 'Boutique Cafes', 'Cycling', 'Watercolors', 'Ocean Sunsets'], activities: ['act-1', 'act-5', 'act-6', 'act-7'], badge: 'Creative Soul', responseTime: 'Usually responds in 15 mins' },
  { origId: 'usr-b17', name: 'Kunal Deshmukh', gender: 'male', dob: '1998-08-17', city: 'Pune', area: 'Baner & Aundh', rate: 600, rating: 4.87, reviews: 71, online: false, photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', headline: 'Badminton enthusiast & high-street shopping adviser.', bio: 'Upbeat and supportive companion in Baner.', languages: ['Marathi', 'Hindi', 'English'], interests: ['Badminton', 'High Street Cafes', 'Thrifting', 'Marvel Movies', 'Electronic Music'], activities: ['act-1', 'act-3', 'act-10', 'act-2'], badge: 'Fitness Partner', responseTime: 'Usually responds in 30 mins' },
  { origId: 'usr-b18', name: 'Suhani Bhatia', gender: 'female', dob: '2003-02-14', city: 'Jaipur', area: 'C-Scheme & Malviya Nagar', rate: 550, rating: 4.9, reviews: 64, online: true, photo: 'https://images.unsplash.com/photo-1616788494707-ec28f08d05a1?auto=format&fit=crop&w=600&q=80', headline: 'Heritage cafe lover, pottery companion & bazaar explorer.', bio: 'Passionate about Rajasthani textiles, rooftop sunset viewpoints, and clay pottery studios.', languages: ['Hindi', 'English'], interests: ['Pottery Workshops', 'Textile Bazaars', 'Rooftop Cafes', 'Photography', 'Folk Music'], activities: ['act-1', 'act-3', 'act-6', 'act-7'], badge: 'Culture Enthusiast', responseTime: 'Usually responds in 10 mins' },
  { origId: 'usr-b19', name: 'Harsh Vardhan', gender: 'male', dob: '1995-10-29', city: 'Hyderabad', area: 'Madhapur & Kondapur', rate: 650, rating: 4.95, reviews: 102, online: true, photo: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80', headline: 'Tech talk buddy, weekend gamer & biryani connoisseur.', bio: 'Down to earth software lead who enjoys meeting new people to play multiplayer VR games.', languages: ['Telugu', 'Hindi', 'English'], interests: ['VR Arcades', 'Biryani Trails', 'Sci-Fi Literature', 'Badminton', 'Tech Podcasts'], activities: ['act-4', 'act-8', 'act-1', 'act-9'], badge: 'Top Rated Buddy', responseTime: 'Usually responds in 5 mins' },
  { origId: 'usr-b20', name: 'Anwita Mukherjee', gender: 'female', dob: '2000-05-27', city: 'Kolkata', area: 'Ballygunge & Park Circus', rate: 600, rating: 4.93, reviews: 83, online: true, photo: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=600&q=80', headline: 'Passionate cinephile, cultural festival attendee & good listener.', bio: 'Film society member in Kolkata. Great companion for attending film festivals at Nandan.', languages: ['Bengali', 'English', 'Hindi'], interests: ['World Cinema', 'Bookstore Browsing', 'Poetry', 'Jazz Music', 'Tea Rooms'], activities: ['act-2', 'act-1', 'act-6', 'act-9'], badge: 'Thoughtful Buddy', responseTime: 'Usually responds in 15 mins' },
  { origId: 'usr-b21', name: 'Varun Chandra', gender: 'male', dob: '1998-09-08', city: 'Bengaluru', area: 'Koramangala & HSR Layout', rate: 700, rating: 4.89, reviews: 88, online: false, photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80', headline: 'Specialty cold brews, tennis rally partner & comedy club fan.', bio: 'Super friendly companion for checking out standup comedy open-mics in Koramangala.', languages: ['English', 'Kannada', 'Hindi'], interests: ['Pickleball', 'Standup Comedy', 'Cold Brews', 'Fitness', 'Graphic Novels'], activities: ['act-1', 'act-7', 'act-10', 'act-2'], badge: 'Super Companion', responseTime: 'Usually responds in 20 mins' },
  { origId: 'usr-b22', name: 'Pallavi Sengupta', gender: 'female', dob: '2001-08-03', city: 'Delhi NCR', area: 'Hauz Khas Village & Green Park', rate: 700, rating: 4.96, reviews: 115, online: true, photo: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?auto=format&fit=crop&w=600&q=80', headline: 'Deer Park strolls, flea market finds & deep thoughtful talks.', bio: 'Journalist and creative writer based in South Delhi.', languages: ['Hindi', 'English', 'Bengali'], interests: ['Hauz Khas Fort', 'Vintage Thrifting', 'Creative Writing', 'Herbal Teas', 'Mindfulness'], activities: ['act-5', 'act-1', 'act-3', 'act-9'], badge: 'Active Listener', responseTime: 'Usually responds in 5 mins' },
  { origId: 'usr-b23', name: 'Nikhil Rane', gender: 'male', dob: '1997-04-16', city: 'Mumbai', area: 'Dadar & Lower Parel', rate: 650, rating: 4.91, reviews: 79, online: true, photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80', headline: 'Mall companion, indie cinema buff & Shivaji Park walker.', bio: 'Friendly Mumbai local who loves evening walks at Shivaji Park.', languages: ['Marathi', 'Hindi', 'English'], interests: ['Theatre Plays', 'Shivaji Park', 'Shopping Malls', 'Street Photography', 'Indie Rock'], activities: ['act-3', 'act-2', 'act-5', 'act-7'], badge: 'City Explorer', responseTime: 'Usually responds in 10 mins' },
  { origId: 'usr-b24', name: 'Natasha Grover', gender: 'female', dob: '1999-12-20', city: 'Chandigarh', area: 'Sector 17 & Sector 35', rate: 600, rating: 4.88, reviews: 60, online: false, photo: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?auto=format&fit=crop&w=600&q=80', headline: 'Sukhna Lake sunset strolls & Sector 17 plaza coffee.', bio: 'Warm and cheerful companion in City Beautiful.', languages: ['Punjabi', 'Hindi', 'English'], interests: ['Sukhna Lake', 'Baking & Desserts', 'Pilates', 'Fashion Styling', 'Pop Culture'], activities: ['act-5', 'act-1', 'act-3', 'act-9'], badge: 'Thoughtful Buddy', responseTime: 'Usually responds in 30 mins' },
  { origId: 'usr-b25', name: 'Akash Subramaniam', gender: 'male', dob: '1996-07-11', city: 'Chennai', area: 'Nungambakkam & T. Nagar', rate: 650, rating: 4.92, reviews: 92, online: true, photo: 'https://images.unsplash.com/photo-1615109398623-88346a601842?auto=format&fit=crop&w=600&q=80', headline: 'Chess games, heritage walks & authentic South Indian feasts.', bio: 'Software consultant with a love for chess, temple architecture, and finding the crunchiest ghee roast dosas.', languages: ['Tamil', 'English', 'Telugu'], interests: ['Chess', 'Heritage Architecture', 'South Indian Cuisine', 'Table Tennis', 'Philosophy'], activities: ['act-4', 'act-8', 'act-6', 'act-1'], badge: 'Foodie Guide', responseTime: 'Usually responds in 10 mins' },
  { origId: 'usr-b26', name: 'Meenal Chawla', gender: 'female', dob: '2002-05-19', city: 'Pune', area: 'Viman Nagar & Wadgaon Sheri', rate: 550, rating: 4.9, reviews: 67, online: true, photo: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80', headline: 'Cozy cafe reads, shopping in Phoenix Marketcity & warm chats.', bio: 'Design student living in Viman Nagar.', languages: ['Hindi', 'English', 'Punjabi'], interests: ['Phoenix Mall', 'Graphic Novels', 'Matcha Lattes', 'Thrifting', 'Stray Animal Welfare'], activities: ['act-1', 'act-3', 'act-9', 'act-2'], badge: 'Creative Soul', responseTime: 'Usually responds in 15 mins' },
  { origId: 'usr-b27', name: 'Samir Alvi', gender: 'male', dob: '1998-11-25', city: 'Hyderabad', area: 'Banjara Hills & Jubilee Hills', rate: 700, rating: 4.94, reviews: 104, online: true, photo: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&w=600&q=80', headline: 'KBR Park morning fitness, art exhibitions & terrace dining.', bio: 'Fitness and lifestyle enthusiast. Great companion for brisk jogs in KBR National Park.', languages: ['Urdu', 'Hindi', 'English', 'Telugu'], interests: ['KBR Park Jogs', 'Middle Eastern Food', 'Contemporary Art', 'Badminton', 'Sneakers'], activities: ['act-10', 'act-4', 'act-7', 'act-5'], badge: 'Fitness Partner', responseTime: 'Usually responds in 10 mins' },
  { origId: 'usr-b28', name: 'Dipika Ghosh', gender: 'female', dob: '2000-10-15', city: 'Kolkata', area: 'South City & Jadavpur', rate: 500, rating: 4.86, reviews: 51, online: false, photo: 'https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?auto=format&fit=crop&w=600&q=80', headline: 'South City mall shopping, indie film screenings & food walks.', bio: 'Extroverted and cheerful! Love shopping for ethnic wear.', languages: ['Bengali', 'Hindi', 'English'], interests: ['Ethnic Fashion', 'Kathi Rolls', 'Indie Films', 'Clay Modeling', 'Coffee Dates'], activities: ['act-3', 'act-2', 'act-4', 'act-1'], badge: 'Foodie Guide', responseTime: 'Usually responds in 20 mins' },
];

/**
 * Seed script to populate the database with Yorbuddy buddy data.
 * Safe to run multiple times - uses upsert to avoid duplicates.
 */
async function seedBuddies() {
  const supabase = getSupabase();

  console.log('[SEED] Starting buddy seed...');
  console.log(`[SEED] Users to seed: ${BUDDY_SEED_DATA.length}`);

  // Load activity ID mapping
  await loadActivityMap(supabase);

  // Build seed users array
  const seedUsers = BUDDY_SEED_DATA.map(b => ({
    email: `${b.name.toLowerCase().replace(/\s+/g, '.')}@yorbuddy.in`,
    password_hash: `argon2id$hashed$${b.origId}`,
    phone: `98${String(parseInt(b.origId.replace('usr-b', ''))).padStart(8, '0')}`,
    full_name: b.name,
    dob: b.dob,
    gender: b.gender,
    role: 'buddy',
    is_active: true,
    is_membership_paid: true,
    membership_paid_at: '2026-03-01T10:00:00Z',
  }));

  // Step 1: Upsert users (role=buddy) - idempotent by email
  const { error: usersError, data: upsertedUsers } = await supabase
    .from('users')
    .upsert(seedUsers, { onConflict: 'email' })
    .select('id, email');

  if (usersError) {
    console.error('[SEED] Error upserting users:', usersError);
    throw usersError;
  }
  console.log(`[SEED] Upserted ${upsertedUsers?.length || 0} users`);

  if (!upsertedUsers || upsertedUsers.length === 0) {
    throw new Error('Failed to retrieve created users');
  }

  // Map email to user ID
  const userMap = new Map(upsertedUsers.map(u => [u.email, u.id]));

  // Step 2: Upsert profiles
  const seedProfiles = BUDDY_SEED_DATA.map(b => {
    const email = `${b.name.toLowerCase().replace(/\s+/g, '.')}@yorbuddy.in`;
    const userId = userMap.get(email);
    return {
      user_id: userId,
      bio: b.bio,
      photo_url: b.photo,
      city: b.city,
      area: b.area,
      languages: b.languages,
      interests: b.interests,
      is_phone_verified: true,
      is_email_verified: true,
      is_id_verified: true,
    };
  });

  const { error: profilesError, data: upsertedProfiles } = await supabase
    .from('profiles')
    .upsert(seedProfiles, { onConflict: 'user_id' })
    .select('id');

  if (profilesError) {
    console.error('[SEED] Error upserting profiles:', profilesError);
    throw profilesError;
  }
  console.log(`[SEED] Upserted ${upsertedProfiles?.length || 0} profiles`);

  // Step 3: Upsert buddy_profiles with mapped activity IDs
  const seedBuddyProfiles = BUDDY_SEED_DATA.map(b => {
    const email = `${b.name.toLowerCase().replace(/\s+/g, '.')}@yorbuddy.in`;
    const userId = userMap.get(email);
    // Map act-1..act-10 to real database UUIDs
    const mappedActivities = b.activities
      .map(actId => ACTIVITY_ID_MAP[actId] || actId)
      .filter(id => id);
    
    return {
      user_id: userId,
      hourly_rate: b.rate,
      headline: b.headline,
      bio: b.bio,
      rating: b.rating,
      review_count: b.reviews,
      is_verified: true,
      verification_status: 'approved',
      total_earnings: b.reviews * b.rate * 1.5,
      profile_views: b.reviews * 12 + 250,
      is_online: b.online,
      response_time: b.responseTime,
      badge_text: b.badge,
      supported_activity_ids: mappedActivities,
      safety_pledge_signed: true,
    };
  });

  const { error: buddyProfilesError, data: upsertedBuddyProfiles } = await supabase
    .from('buddy_profiles')
    .upsert(seedBuddyProfiles, { onConflict: 'user_id' })
    .select('id');

  if (buddyProfilesError) {
    console.error('[SEED] Error upserting buddy_profiles:', buddyProfilesError);
    throw buddyProfilesError;
  }
  console.log(`[SEED] Upserted ${upsertedBuddyProfiles?.length || 0} buddy profiles`);

  // Verify counts
  const { count: buddyCount } = await supabase
    .from('buddy_profiles')
    .select('*', { count: 'exact', head: true });

  console.log(`[SEED] Total buddy_profiles in database: ${buddyCount}`);
  console.log('[SEED] Done!');
}

seedBuddies().catch(err => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
