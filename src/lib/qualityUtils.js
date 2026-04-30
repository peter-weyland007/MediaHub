// Quality scoring and remediation logic

// Resolution scoring — higher = better
export const RESOLUTION_SCORES = {
  '2160p': 100,
  '1080p': 80,
  '720p': 60,
  '480p': 40,
  '360p': 20,
};

// Source scoring
export const SOURCE_SCORES = {
  'bluray': 30,
  'remux': 35,
  'web': 20,
  'webrip': 15,
  'hdtv': 10,
  'dvd': 5,
  'cam': 0,
};

// Given a quality name string from *arr, extract a numeric score
export function scoreQualityName(name = '') {
  const lower = name.toLowerCase();
  let score = 0;

  for (const [key, val] of Object.entries(RESOLUTION_SCORES)) {
    if (lower.includes(key)) { score += val; break; }
  }
  for (const [key, val] of Object.entries(SOURCE_SCORES)) {
    if (lower.includes(key)) { score += val; break; }
  }
  return score;
}

// Returns a remediation recommendation object
export function getRemediation(currentQualityName, preferredProfileName) {
  const currentScore = scoreQualityName(currentQualityName);
  const preferredScore = scoreQualityName(preferredProfileName);
  const diff = preferredScore - currentScore;

  if (diff <= 0) {
    return { status: 'ok', label: 'Meets Profile', color: 'emerald', action: null };
  }
  if (diff <= 20) {
    return {
      status: 'minor',
      label: 'Slight Upgrade Available',
      color: 'amber',
      action: 'search',
      actionLabel: 'Search for Upgrade',
    };
  }
  return {
    status: 'poor',
    label: 'Below Profile',
    color: 'red',
    action: 'replace',
    actionLabel: 'Request Replacement',
  };
}