// Quality scoring and optimization logic

export const RESOLUTION_SCORES = {
  '2160p': 100,
  '1080p': 80,
  '720p': 60,
  '480p': 40,
  '360p': 20,
};

export const SOURCE_SCORES = {
  remux: 35,
  bluray: 30,
  webdl: 24,
  web: 20,
  webrip: 15,
  hdtv: 10,
  dvd: 5,
  cam: 0,
};

export const OPTIMIZATION_STRATEGIES = {
  balanced: 'Balanced',
  space: 'Save Disk Space',
  compatibility: 'Plex Compatibility',
};

export const MEDIA_NEXUS_OPTIMIZATION_PROFILE_NAME = 'MediaHub Profile';

export function scoreQualityName(name = '') {
  const lower = name.toLowerCase();
  let score = 0;

  for (const [key, val] of Object.entries(RESOLUTION_SCORES)) {
    if (lower.includes(key)) {
      score += val;
      break;
    }
  }

  for (const [key, val] of Object.entries(SOURCE_SCORES)) {
    if (lower.includes(key)) {
      score += val;
      break;
    }
  }

  return score;
}

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

const resolutionOrder = ['2160p', '1080p', '720p', '480p'];
const resolutionLimitMap = {
  '2160p': 2160,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
};

const normalizeCodec = (codec = '') => String(codec).toLowerCase();

const normalizeResolution = (value = '') => {
  if (!value) return null;
  const text = String(value).toLowerCase();
  if (text.includes('3840x2160') || text.includes('2160')) return '2160p';
  if (text.includes('1920x1080') || text.includes('1080')) return '1080p';
  if (text.includes('1280x720') || text.includes('720')) return '720p';
  if (text.includes('480')) return '480p';
  return null;
};

const exceedsResolution = (detected, preferred) => {
  const currentIndex = resolutionOrder.indexOf(detected);
  const preferredIndex = resolutionOrder.indexOf(preferred);
  if (currentIndex === -1 || preferredIndex === -1) return false;
  return currentIndex < preferredIndex;
};

const getItemName = (item = {}) => String(item.quality?.name || item.name || '');
const getItemSource = (item = {}) => String(item.quality?.source || '').toLowerCase();
const getItemResolution = (item = {}) => {
  if (typeof item.quality?.resolution === 'number' && item.quality.resolution > 0) {
    return item.quality.resolution;
  }

  if (Array.isArray(item.items) && item.items.length) {
    return Math.max(...item.items.map(getItemResolution), 0);
  }

  return 0;
};

const isUnknownLike = (item = {}) => {
  const text = `${getItemName(item)} ${getItemSource(item)}`.toLowerCase();
  return text.includes('unknown');
};

const isTrashLike = (item = {}) => {
  const text = `${getItemName(item)} ${getItemSource(item)}`.toLowerCase();
  return /(cam|telesync|telecine|workprint|dvdscr)/.test(text);
};

const isRemuxLike = (item = {}) => {
  const text = `${getItemName(item)} ${getItemSource(item)}`.toLowerCase();
  return /(remux|raw)/.test(text);
};

const qualityBiasForStrategy = (item, strategy) => {
  const text = `${getItemName(item)} ${getItemSource(item)}`.toLowerCase();

  if (strategy === 'space') {
    if (text.includes('webrip')) return 45;
    if (text.includes('webdl') || text.includes('web ')) return 40;
    if (text.includes('hdtv')) return 20;
    if (text.includes('bluray')) return 10;
    if (isRemuxLike(item)) return -40;
  }

  if (strategy === 'compatibility') {
    if (text.includes('webdl') || text.includes('web ')) return 45;
    if (text.includes('webrip')) return 35;
    if (text.includes('bluray')) return 18;
    if (text.includes('hdtv')) return 10;
    if (isRemuxLike(item)) return -30;
  }

  if (text.includes('bluray')) return 40;
  if (text.includes('webdl') || text.includes('web ')) return 35;
  if (text.includes('webrip')) return 25;
  if (text.includes('hdtv')) return 15;
  if (isRemuxLike(item)) return 10;
  return 0;
};

const shouldAllowOptimizationQuality = (item, optimizationPreferences = {}) => {
  if (Array.isArray(item.items) && item.items.length) {
    return item.items.some((child) => shouldAllowOptimizationQuality(child, optimizationPreferences));
  }

  if (isUnknownLike(item) || isTrashLike(item)) {
    return false;
  }

  const strategy = optimizationPreferences.strategy || 'balanced';
  const maxResolution = optimizationPreferences.maxResolution || '1080p';
  const resolutionLimit = resolutionLimitMap[maxResolution] || 1080;
  const itemResolution = getItemResolution(item);

  if (itemResolution > resolutionLimit) {
    return false;
  }

  if ((strategy === 'space' || strategy === 'compatibility') && isRemuxLike(item)) {
    return false;
  }

  return true;
};

const toggleProfileItems = (items = [], optimizationPreferences = {}) => {
  return items.map((item) => {
    if (Array.isArray(item.items) && item.items.length) {
      const nested = toggleProfileItems(item.items, optimizationPreferences);
      return {
        ...item,
        items: nested,
        allowed: nested.some((child) => child.allowed),
      };
    }

    return {
      ...item,
      allowed: shouldAllowOptimizationQuality(item, optimizationPreferences),
    };
  });
};

const flattenAllowedLeafItems = (items = []) => {
  const allowed = [];

  for (const item of items) {
    if (Array.isArray(item.items) && item.items.length) {
      allowed.push(...flattenAllowedLeafItems(item.items));
      continue;
    }

    if (item.allowed && item.quality?.id !== undefined) {
      allowed.push(item);
    }
  }

  return allowed;
};

const selectCutoffQualityId = (allowedItems = [], optimizationPreferences = {}) => {
  if (!allowedItems.length) {
    return 0;
  }

  const strategy = optimizationPreferences.strategy || 'balanced';
  const ranked = [...allowedItems].sort((left, right) => {
    const leftScore = getItemResolution(left) + qualityBiasForStrategy(left, strategy);
    const rightScore = getItemResolution(right) + qualityBiasForStrategy(right, strategy);
    return rightScore - leftScore;
  });

  return ranked[0]?.quality?.id || 0;
};

export function buildOptimizationQualityProfilePayload(schema = {}, optimizationPreferences = {}, existingProfile = null) {
  const cloned = JSON.parse(JSON.stringify(schema || {}));
  const items = toggleProfileItems(cloned.items || [], optimizationPreferences);
  const allowedItems = flattenAllowedLeafItems(items);
  const cutoff = selectCutoffQualityId(allowedItems, optimizationPreferences);

  return {
    ...cloned,
    ...(existingProfile?.id ? { id: existingProfile.id } : {}),
    name: MEDIA_NEXUS_OPTIMIZATION_PROFILE_NAME,
    upgradeAllowed: true,
    cutoff,
    items,
  };
}

const toGiB = (bytes = 0) => bytes / (1024 ** 3);

const compactIssue = (label, severity = 'minor') => ({ label, severity });

export function getOptimizationRecommendation(item, optimizationPreferences = {}, type = 'movie') {
  const strategy = optimizationPreferences.strategy || 'balanced';
  const targetContainer = optimizationPreferences.targetContainer || 'mp4';
  const preferredVideoCodec = optimizationPreferences.preferredVideoCodec || 'h264';
  const preferredAudioCodec = optimizationPreferences.preferredAudioCodec || 'aac';
  const maxResolution = optimizationPreferences.maxResolution || '1080p';

  if (type === 'movie') {
    if (!item.movieFile) {
      return {
        status: 'poor',
        label: 'Missing File',
        color: 'red',
        action: 'replace',
        actionLabel: 'Find Better Release',
        issues: [compactIssue('No local file in Radarr', 'poor')],
        score: 0,
      };
    }

    const mediaInfo = item.movieFile.mediaInfo || {};
    const path = String(item.movieFile.path || item.movieFile.relativePath || '').toLowerCase();
    const container = path.endsWith('.mp4') || path.endsWith('.m4v') ? 'mp4' : path.endsWith('.mkv') ? 'mkv' : 'other';
    const videoCodec = normalizeCodec(mediaInfo.videoCodec);
    const audioCodec = normalizeCodec(mediaInfo.audioCodec);
    const resolution = normalizeResolution(mediaInfo.resolution) || normalizeResolution(item.movieFile.quality?.quality?.name);
    const bitDepth = Number(mediaInfo.videoBitDepth || 8);
    const sizeGiB = toGiB(item.movieFile.size || item.sizeOnDisk || 0);
    const issues = [];
    let score = 100;

    if (strategy !== 'space' && container !== targetContainer) {
      issues.push(compactIssue(`Container is ${container.toUpperCase()} instead of ${targetContainer.toUpperCase()}`, 'minor'));
      score -= 12;
    }

    if (strategy === 'compatibility' && videoCodec && !videoCodec.includes(preferredVideoCodec)) {
      issues.push(compactIssue(`Video codec ${mediaInfo.videoCodec} is less Plex-friendly than ${preferredVideoCodec.toUpperCase()}`, 'poor'));
      score -= 26;
    }

    if (strategy !== 'compatibility' && videoCodec && videoCodec.includes('x264') && sizeGiB > 12) {
      issues.push(compactIssue('Large H.264 file could likely be replaced with a smaller encode', 'minor'));
      score -= 14;
    }

    if (strategy === 'space' && sizeGiB > 20) {
      issues.push(compactIssue(`File is using ${sizeGiB.toFixed(1)} GB`, 'poor'));
      score -= 24;
    }

    if (strategy !== 'space' && audioCodec && !audioCodec.includes(preferredAudioCodec)) {
      issues.push(compactIssue(`Audio codec ${mediaInfo.audioCodec} is outside the preferred ${preferredAudioCodec.toUpperCase()} target`, 'minor'));
      score -= 10;
    }

    if (strategy === 'compatibility' && bitDepth > 8) {
      issues.push(compactIssue('10-bit video can force Plex transcoding on more clients', 'poor'));
      score -= 20;
    }

    if (strategy !== 'space' && resolution && exceedsResolution(resolution, maxResolution)) {
      issues.push(compactIssue(`Resolution ${resolution} exceeds the preferred ${maxResolution} target`, 'minor'));
      score -= 8;
    }

    if (issues.length === 0) {
      return {
        status: 'ok',
        label: 'Already Optimized',
        color: 'emerald',
        action: null,
        issues: [compactIssue(`Aligned with the ${OPTIMIZATION_STRATEGIES[strategy]} goal`, 'ok')],
        score: 100,
      };
    }

    const severeIssues = issues.filter((issue) => issue.severity === 'poor').length;
    return {
      status: severeIssues > 0 ? 'poor' : 'minor',
      label: severeIssues > 0 ? 'High Impact Optimization Available' : 'Optimization Opportunity',
      color: severeIssues > 0 ? 'red' : 'amber',
      action: severeIssues > 0 ? 'replace' : 'search',
      actionLabel: severeIssues > 0 ? 'Find Better Release' : 'Search Alternatives',
      issues,
      score: Math.max(score, 5),
    };
  }

  const issues = [];
  const sizeOnDiskGiB = toGiB(item.statistics?.sizeOnDisk || 0);
  const episodeCount = Number(item.statistics?.episodeFileCount || item.statistics?.episodeCount || 0);
  const perEpisodeGiB = episodeCount > 0 ? sizeOnDiskGiB / episodeCount : 0;

  if (strategy === 'space' && perEpisodeGiB > 2.5) {
    issues.push(compactIssue(`Average episode footprint is ${perEpisodeGiB.toFixed(1)} GB`, 'poor'));
  }

  if (strategy === 'compatibility' && item.currentQuality && item.currentQuality !== 'Unknown' && !String(item.currentQuality).toLowerCase().includes('1080')) {
    issues.push(compactIssue('Assigned Sonarr profile is not clearly aligned to the preferred Plex target', 'minor'));
  }

  if (issues.length === 0) {
    return {
      status: item.remediation?.status || 'ok',
      label: item.remediation?.label || 'Watching Profile Health',
      color: item.remediation?.color || 'emerald',
      action: item.remediation?.action || null,
      actionLabel: item.remediation?.actionLabel,
      issues: [compactIssue(`Tracking ${OPTIMIZATION_STRATEGIES[strategy]} at the series level`, 'ok')],
      score: 100,
    };
  }

  return {
    status: issues.some((issue) => issue.severity === 'poor') ? 'poor' : 'minor',
    label: 'Series Needs Review',
    color: issues.some((issue) => issue.severity === 'poor') ? 'red' : 'amber',
    action: 'search',
    actionLabel: 'Search Alternatives',
    issues,
    score: issues.some((issue) => issue.severity === 'poor') ? 58 : 76,
  };
}
