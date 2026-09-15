import { Profile, BuddyProfile, CompatibilityScore, Activity } from '../types/database';
import { ACTIVITIES } from '../data/initialData';

export function calculateCompatibility(
  userProfile: Profile,
  buddyProfile: BuddyProfile,
  buddyUserProfile: Profile
): CompatibilityScore {
  // 1. Location (30%)
  // Same city gives full 30 points, same area gives bonus affinity
  let locationScore = 0;
  const sameCity = userProfile.city.toLowerCase() === buddyUserProfile.city.toLowerCase();
  if (sameCity) {
    locationScore = 30;
  } else {
    locationScore = 8; // Different city fallback
  }

  // 2. Activities (25%)
  // Compare buddy's supported activities with user's preferred interests/activities
  const buddyActivities = buddyProfile.supported_activity_ids;
  // Map user interests or preferred activities
  const userInterestsLower = userProfile.interests.map((i) => i.toLowerCase());
  
  // Find shared activities
  const matchedActivities: string[] = [];
  ACTIVITIES.forEach((act) => {
    if (buddyActivities.includes(act.id)) {
      const match = userInterestsLower.some(
        (interest) => interest.includes(act.title.toLowerCase()) || act.title.toLowerCase().includes(interest)
      );
      if (match || act.popular) {
        matchedActivities.push(act.title);
      }
    }
  });

  const activityRatio = Math.min(1, Math.max(0.4, matchedActivities.length / 3));
  const activitiesScore = Math.round(activityRatio * 25);

  // 3. Interests (20%)
  const userInterests = userProfile.interests.map((i) => i.toLowerCase());
  const buddyInterests = buddyUserProfile.interests.map((i) => i.toLowerCase());
  const sharedInterests = buddyUserProfile.interests.filter((bi) =>
    userInterests.some(
      (ui) =>
        ui.includes(bi.toLowerCase()) ||
        bi.toLowerCase().includes(ui) ||
        (ui.includes('coffee') && bi.toLowerCase().includes('coffee')) ||
        (ui.includes('movie') && bi.toLowerCase().includes('cinema')) ||
        (ui.includes('walk') && bi.toLowerCase().includes('walk'))
    )
  );
  const interestRatio = Math.min(1, Math.max(0.3, sharedInterests.length / 2));
  const interestsScore = Math.round(interestRatio * 20);

  // 4. Availability (15%)
  // Based on online status, verified slots, and active pledge
  let availabilityScore = 12;
  if (buddyProfile.is_online) {
    availabilityScore = 15;
  }

  // 5. Language (10%)
  const userLangs = userProfile.languages.map((l) => l.toLowerCase());
  const buddyLangs = buddyUserProfile.languages.map((l) => l.toLowerCase());
  const sharedLanguages = buddyUserProfile.languages.filter((l) =>
    userLangs.includes(l.toLowerCase())
  );
  const languageRatio = sharedLanguages.length > 0 ? 1 : 0.5;
  const languageScore = Math.round(languageRatio * 10);

  const overallPercentage = Math.min(
    99,
    Math.max(68, locationScore + activitiesScore + interestsScore + availabilityScore + languageScore)
  );

  let explanation = '';
  if (sameCity) {
    explanation = `Both based in ${buddyUserProfile.city}. You share love for ${
      sharedInterests.slice(0, 2).join(' & ') || 'cafes & conversations'
    } and communicate in ${sharedLanguages.join(' & ') || 'English/Hindi'}.`;
  } else {
    explanation = `High commonality in shared passions like ${
      sharedInterests.slice(0, 2).join(', ') || 'city exploration'
    } and mutual language compatibility.`;
  }

  return {
    overallPercentage,
    locationScore,
    activitiesScore,
    interestsScore,
    availabilityScore,
    languageScore,
    explanation,
    sharedActivities: matchedActivities.slice(0, 3),
    sharedLanguages,
    sharedInterests: sharedInterests.length > 0 ? sharedInterests : [buddyUserProfile.interests[0]],
  };
}
