/**
 * Facebook Content Service for YorBuddy
 * 
 * Generates high-quality daily Facebook posts promoting YorBuddy
 * as a platform to find activity buddies.
 * 
 * All emoji characters are stored as HTML entities to prevent
 * encoding issues across different terminals and shells.
 */

type PostCategory =
  | 'activity_focus'
  | 'social_connection'
  | 'trust_safety'
  | 'weekend_vibe'
  | 'user_benefit';

export interface FacebookPostContent {
  topic: string;
  category: PostCategory;
  caption: string;
  cta: string;
  hashtags: string[];
  imageConcept: string;
  imageDescription: string;
}

// Emoji as HTML entities to avoid encoding issues
const E = {
  basketball: '&#127936;',
  cricket: '&#127951;',
  soccer: '&#9917;',
  tennis: '&#127934;',
  yoga: '&#128591;',
  hiking: '&#128693;',
  coffee: '&#9749;',
  music: '&#127925;',
  art: '&#127912;',
  camera: '&#128247;',
  guitar: '&#127928;',
  book: '&#128218;',
  fire: '&#128293;',
  star: '&#11088;',
  check: '&#9989;',
  lock: '&#128274;',
  shield: '&#128737;',
  thumbsUp: '&#128077;',
  muscle: '&#128170;',
  sunrise: '&#127749;',
  mountain: '&#9968;',
  city: '&#127961;',
  movie: '&#127916;',
  game: '&#127918;',
  cooking: '&#127859;',
  sparkles: '&#10024;',
  calendar: '&#128197;',
};

// Helper to decode HTML entities to Unicode for display
function D(encoded: string): string {
  return encoded.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)));
}

const ARROW = '\u2192'; // →

// Post templates organized by category
const POST_TEMPLATES_BY_CATEGORY: Record<PostCategory, FacebookPostContent[]> = {
  activity_focus: [
    {
      topic: 'Never Miss a Match - Find Your Sports Buddy',
      category: 'activity_focus',
      caption:
        `Tired of showing up to the court alone? ${D(E.basketball)}\n\n` +
        `Whether it's cricket, badminton, football, or tennis - YorBuddy connects you with real people in your city who want to play the same sports, at the same time.\n\n` +
        `No awkward DMs. No ghosting. Just show up and play.`,
      cta: `Open YorBuddy and find your sports buddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#FindYourBuddy', '#SportsBuddy', '#PlayTogether',
        '#CricketPartner', '#BadmintonBuddy', '#SportsIndia', '#ActiveLifestyle',
      ],
      imageConcept: 'A vibrant illustration of two people high-fiving on a cricket court at golden hour.',
      imageDescription: 'Two sports partners celebrating on a cricket court at sunset',
    },
    {
      topic: 'Morning Walks Are Better Together',
      category: 'activity_focus',
      caption:
        `There's something magical about a morning walk when you have company. ${D(E.sunrise)}\n\n` +
        `YorBuddy helps you find walking partners, jogging buddies, and fitness companions in your neighborhood.\n\n` +
        `Your health journey doesn't have to be solo.`,
      cta: `Join YorBuddy and find your walking partner ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#WalkingBuddy', '#MorningWalk', '#FitnessPartner',
        '#HealthyIndia', '#WalkTogether', '#MorningMotivation',
      ],
      imageConcept: 'Two friends walking briskly on a tree-lined park path in early morning light.',
      imageDescription: 'Two people walking together in a park during morning hours',
    },
    {
      topic: 'Weekend Trek? Find Your Trekking Group',
      category: 'activity_focus',
      caption:
        `The mountains are calling - and your trekking buddy is on YorBuddy. ${D(E.mountain)}\n\n` +
        `Connect with fellow trekkers, hikers, and outdoor enthusiasts. Plan weekend adventures together.\n\n` +
        `Solo is fine. Together is better.`,
      cta: `Find your trekking partner on YorBuddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#TrekkingIndia', '#WeekendTrek', '#HikingBuddy',
        '#OutdoorAdventure', '#MountainsOfIndia', '#ExploreTogether', '#NatureLovers',
      ],
      imageConcept: 'A group of friends standing on a mountain summit with arms raised in triumph.',
      imageDescription: 'Trekking group celebrating at a mountain summit',
    },
    {
      topic: 'Gym Buddy = Better Gains',
      category: 'activity_focus',
      caption:
        `Science says you work out harder when someone's counting on you. ${D(E.muscle)}\n\n` +
        `YorBuddy helps you find a gym spotting partner, yoga buddy, or CrossFit companion.\n\n` +
        `Consistency is easier with company.`,
      cta: `Find your gym buddy on YorBuddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#GymBuddy', '#FitnessMotivation', '#SpottingPartner',
        '#WorkoutTogether', '#HealthyLifestyle', '#GymMotivationIndia',
      ],
      imageConcept: 'Two people at a gym, one spotting the other on a bench press. Modern gym equipment.',
      imageDescription: 'Gym partners working out together',
    },
  ],

  social_connection: [
    {
      topic: 'Making Friends After College Is Hard. YorBuddy Makes It Easier.',
      category: 'social_connection',
      caption:
        `Remember when making friends was as simple as sitting next to someone in class? ${D(E.book)}\n\n` +
        `Adulting changed that. But YorBuddy brings it back.\n\n` +
        `Find people in your city who share your interests - for hiking, movies, coffee meetups, board games, and more.\n\n` +
        `Real connections. Real activities. Real friends.`,
      cta: `Join YorBuddy and expand your circle ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#MakeFriends', '#AdultFriendship', '#FindYourTribe',
        '#SocialLife', '#CommunityIndia', '#FriendshipGoals',
      ],
      imageConcept: 'A group of 4-5 diverse young adults laughing and having coffee at a cozy cafe.',
      imageDescription: 'Group of friends enjoying coffee together at a cafe',
    },
    {
      topic: 'Moved to a New City? Find Your People.',
      category: 'social_connection',
      caption:
        `New city. New job. No crew? We get it. ${D(E.city)}\n\n` +
        `YorBuddy helps newcomers find activity partners and build a social circle - fast.\n\n` +
        `From weekend football games to Sunday brunch groups, your people are already here.`,
      cta: `Find your crew on YorBuddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#NewCityLife', '#FindYourPeople', '#CityLife',
        '#MumbaiLife', '#BangaloreLife', '#DelhiLife', '#SocialIndia',
      ],
      imageConcept: 'A young person with a backpack standing in front of a modern city skyline.',
      imageDescription: 'Young professional excited in a new city',
    },
    {
      topic: 'Shared Interests = Instant Connection',
      category: 'social_connection',
      caption:
        `Board games. Movie marathons. Cooking experiments. Photography walks.\n\n` +
        `Whatever your hobby, there's someone in your city who wants to do it too. ${D(E.game)}${D(E.movie)}${D(E.camera)}\n\n` +
        `YorBuddy matches you based on shared interests.\n\n` +
        `Stop scrolling. Start connecting.`,
      cta: `Find your hobby buddy on YorBuddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#SharedInterests', '#HobbyBuddy', '#BoardGamesIndia',
        '#MovieBuddy', '#PhotographyWalk', '#CookingPartner', '#ConnectThroughHobbies',
      ],
      imageConcept: 'Split scene showing four hobby scenes with friends.',
      imageDescription: 'Collage of various hobby activities with friends',
    },
  ],

  trust_safety: [
    {
      topic: 'Your Safety Is Our Priority',
      category: 'trust_safety',
      caption:
        `Meeting someone new should feel exciting - not risky. ${D(E.shield)}\n\n` +
        `At YorBuddy, we have built safety into every layer:\n\n` +
        `${D(E.check)} Verified profiles\n` +
        `${D(E.check)} Secure in-app communication\n` +
        `${D(E.check)} User reviews & ratings\n` +
        `${D(E.check)} Report & block features\n\n` +
        `Because real connections start with real trust.`,
      cta: `Experience safe social networking on YorBuddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#SafeNetworking', '#VerifiedProfiles', '#TrustAndSafety',
        '#SecurePlatform', '#SocialSafety', '#IndiaTech',
      ],
      imageConcept: 'A clean, modern illustration of a shield with a checkmark icon.',
      imageDescription: 'Illustration representing safety and trust features',
    },
    {
      topic: 'Real People. Verified Profiles. No Fakes.',
      category: 'trust_safety',
      caption:
        `We believe in real connections between real people. ${D(E.lock)}\n\n` +
        `Every YorBuddy profile goes through verification so you know you are talking to a genuine person.\n\n` +
        `No bots. No catfishes. No fake profiles.\n\n` +
        `Just real people looking for real activities.`,
      cta: `Join YorBuddy - where real connects ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#RealConnections', '#VerifiedCommunity', '#NoBots',
        '#AuthenticNetworking', '#GenuinePeople',
      ],
      imageConcept: 'Phone screen showing a verified profile with a green checkmark badge.',
      imageDescription: 'Mobile phone showing a verified YorBuddy profile',
    },
  ],

  weekend_vibe: [
    {
      topic: 'This Weekend: Do Something With Someone',
      category: 'weekend_vibe',
      caption:
        `Your weekend plans should not just be Netflix and chill. ${D(E.star)}\n\n` +
        `Find a buddy for:\n` +
        `${D(E.cricket)} Cricket match\n` +
        `${D(E.yoga)} Morning yoga\n` +
        `${D(E.art)} Art & craft\n` +
        `${D(E.coffee)} Coffee date\n` +
        `${D(E.hiking)} Nature walk\n` +
        `${D(E.music)} Music jam\n\n` +
        `Every weekend is an opportunity. Do not waste it alone.`,
      cta: `Plan your weekend with YorBuddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#WeekendPlans', '#DontStayHome', '#WeekendVibes',
        '#ThingsToDo', '#WeekendActivities', '#GetOutOfTheHouse', '#IndiaWeekend',
      ],
      imageConcept: 'A vibrant weekend mood board showing 5-6 activity icons.',
      imageDescription: 'Collage of weekend activity icons and illustrations',
    },
    {
      topic: 'Saturday Morning Checklist: Find a Buddy. Go Explore.',
      category: 'weekend_vibe',
      caption:
        `It is Saturday. The sun is out. Your city is buzzing.\n\n` +
        `All you need is someone to explore it with.\n\n` +
        `YorBuddy connects you with people who want to do exactly what you want to do - today.`,
      cta: `Find your Saturday buddy on YorBuddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#SaturdayVibes', '#ExploreYourCity', '#WeekendMood',
        '#SaturdayPlans', '#CityExplorer', '#WeekendFun',
      ],
      imageConcept: 'Two friends cycling through a colorful Indian city street.',
      imageDescription: 'Friends cycling through a vibrant city neighborhood on a weekend morning',
    },
  ],

  user_benefit: [
    {
      topic: 'Your Interests Are Your Superpower',
      category: 'user_benefit',
      caption:
        `Love photography but have no one to shoot with?\n` +
        `Into cooking but tired of eating alone?\n` +
        `Want to play football but your friends bailed?\n\n` +
        `YorBuddy turns your interests into connections. ${D(E.sparkles)}\n\n` +
        `Tell us what you love. We will find your match.`,
      cta: `Match by interests on YorBuddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#InterestBased', '#FindYourMatch', '#HobbyPartner',
        '#DoWhatYouLove', '#ActivityMatching', '#IndiaConnect',
      ],
      imageConcept: "A person's silhouette filled with colorful icons representing different hobbies.",
      imageDescription: 'Silhouette filled with hobby icons representing diverse interests',
    },
    {
      topic: 'Why Go Alone When You Can Go Together?',
      category: 'user_benefit',
      caption:
        `Every activity is better with company. ${D(E.thumbsUp)}\n\n` +
        `Movies. Cafes. Gyms. Treks. Concerts. Games.\n\n` +
        `YorBuddy finds you someone who is into the same things - in your city, available when you are.\n\n` +
        `It is like a friend-finding app, but actually works.`,
      cta: `Start matching on YorBuddy ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#BetterTogether', '#ActivityPartner', '#SocialApp',
        '#MeetNewPeople', '#IndianApp', '#YorBuddyIndia',
      ],
      imageConcept: 'A pair of sneakers next to each other on a trail.',
      imageDescription: 'Two pairs of sneakers on a trail symbolizing companionship',
    },
    {
      topic: 'Stop Waiting for Plans. Make Them.',
      category: 'user_benefit',
      caption:
        `Tired of waiting for someone to invite you out?\n\n` +
        `Take charge. Post your activity. Find your buddy.\n\n` +
        `YorBuddy puts you in control of your social life. ${D(E.calendar)}\n\n` +
        `No more FOMO. No more last-minute 'what do you want to do?' texts.`,
      cta: `Take charge of your social life ${ARROW}`,
      hashtags: [
        '#YorBuddy', '#MakePlans', '#SocialLife', '#TakeCharge',
        '#NoMoreFOMO', '#ActivityPlanner', '#YourTimeYourTerms',
      ],
      imageConcept: 'A person holding a phone with YorBuddy app, standing confidently in front of a city backdrop.',
      imageDescription: 'Person confidently using YorBuddy app to make plans',
    },
  ],
};

/**
 * Get a deterministic daily post based on the current date.
 */
export function getDailyPost(): FacebookPostContent {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );

  const categories: PostCategory[] = [
    'activity_focus',
    'social_connection',
    'trust_safety',
    'weekend_vibe',
    'user_benefit',
  ];

  const categoryIndex = dayOfYear % categories.length;
  const category = categories[categoryIndex];

  const templates = POST_TEMPLATES_BY_CATEGORY[category];
  const templateIndex = (dayOfYear + Math.floor(dayOfYear / categories.length)) % templates.length;

  return { ...templates[templateIndex] };
}

export function getPostByCategory(category: PostCategory, index?: number): FacebookPostContent {
  const templates = POST_TEMPLATES_BY_CATEGORY[category];
  const idx = index ?? 0;
  return { ...templates[idx % templates.length] };
}

export function getCategories(): PostCategory[] {
  return ['activity_focus', 'social_connection', 'trust_safety', 'weekend_vibe', 'user_benefit'];
}

/**
 * Preview a post as formatted text for approval
 */
export function formatPostPreview(content: FacebookPostContent): string {
  const lines = [
    '═══════════════════════════════════════════════════',
    '           FACEBOOK POST PREVIEW',
    '═══════════════════════════════════════════════════',
    '',
    `Topic:    ${content.topic}`,
    `Category: ${content.category}`,
    '',
    '── Caption ───────────────────────────────────────',
    '',
    content.caption,
    '',
    '── CTA ──────────────────────────────────────────',
    '',
    content.cta,
    '',
    '── Hashtags ─────────────────────────────────────',
    '',
    content.hashtags.join(' '),
    '',
    '── Image Concept ────────────────────────────────',
    '',
    content.imageConcept,
    '',
    '═══════════════════════════════════════════════════',
  ];

  return lines.join('\n');
}
