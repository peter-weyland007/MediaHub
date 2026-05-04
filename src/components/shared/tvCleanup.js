/** @typedef {'keep-all' | 'unmonitor-only' | 'delete-unmonitor'} TvCleanupMode */
/** @typedef {{ watched?: boolean, source?: 'manual', watchedAt?: string | null }} ManualOverride */
/** @typedef {{ mode?: TvCleanupMode }} ShowCleanupPreferences */
/** @typedef {{ watchedThresholdPercent?: number, waitDays?: number, shows?: Record<string, ShowCleanupPreferences>, manualOverrides?: Record<string, ManualOverride> }} TvCleanupPreferences */
/** @typedef {{ grandparent_title?: string, original_title?: string, parent_title?: string, full_title?: string, title?: string, parent_media_index?: number|string, media_index?: number|string, percent_complete?: number|string, watched_status?: number|string, stopped?: number|string, date?: number|string }} TautulliHistoryRow */
/** @typedef {{ seasonNumber?: number|string, episodeNumber?: number|string, hasFile?: boolean, episodeFileId?: number|string, monitored?: boolean }} CleanupEpisode */
/** @typedef {{ id?: number|string, title?: string }} CleanupSeries */
/** @typedef {{ policyMode: TvCleanupMode, matchingHistory: TautulliHistoryRow[], latestWatchRow: TautulliHistoryRow | null, lastWatchedAt: number, isWatched: boolean, watchSource: 'manual' | 'tautulli' | 'none', waitElapsed: boolean, isEligible: boolean, shouldDeleteFile: boolean, shouldUnmonitor: boolean }} EpisodeCleanupPlan */

export const DEFAULT_TV_CLEANUP_PREFERENCES = {
  watchedThresholdPercent: 90,
  waitDays: 3,
  shows: {},
  manualOverrides: {},
};

const VALID_SHOW_MODES = new Set(['keep-all', 'unmonitor-only', 'delete-unmonitor']);

const normalizeShowMode = (mode) => VALID_SHOW_MODES.has(mode) ? mode : 'keep-all';

/**
 * @param {TvCleanupPreferences} [preferences]
 */
export function normalizeTvCleanupPreferences(preferences = {}) {
  const watchedThresholdPercent = Number(preferences.watchedThresholdPercent);
  const waitDays = Number(preferences.waitDays);
  const shows = Object.fromEntries(
    Object.entries(preferences.shows || {}).map(([seriesId, showPrefs]) => [
      String(seriesId),
      { mode: normalizeShowMode(showPrefs?.mode) },
    ])
  );
  const manualOverrides = Object.fromEntries(
    Object.entries(preferences.manualOverrides || {}).map(([episodeKey, override]) => [
      String(episodeKey),
      {
        watched: Boolean(override?.watched),
        source: 'manual',
        watchedAt: override?.watchedAt ? new Date(override.watchedAt).toISOString() : null,
      },
    ])
  );

  return {
    watchedThresholdPercent: Number.isFinite(watchedThresholdPercent) && watchedThresholdPercent >= 1 && watchedThresholdPercent <= 100
      ? watchedThresholdPercent
      : DEFAULT_TV_CLEANUP_PREFERENCES.watchedThresholdPercent,
    waitDays: Number.isFinite(waitDays) && waitDays >= 0 ? waitDays : DEFAULT_TV_CLEANUP_PREFERENCES.waitDays,
    shows,
    manualOverrides,
  };
}

const normalizeTitleToken = (value) => String(value || '').trim().toLowerCase();

/**
 * @param {TautulliHistoryRow} [row]
 */
const deriveSeriesTitleFromRow = (row = {}) => {
  const direct = normalizeTitleToken(row.grandparent_title || row.original_title || row.parent_title);
  if (direct) {
    return direct;
  }

  const fullTitle = String(row.full_title || '').trim();
  const episodeTitle = String(row.title || '').trim();
  if (fullTitle && episodeTitle) {
    const suffix = ` - ${episodeTitle}`;
    if (fullTitle.endsWith(suffix)) {
      return normalizeTitleToken(fullTitle.slice(0, -suffix.length));
    }
  }

  return '';
};

/**
 * @param {TautulliHistoryRow} [row]
 */
export function getEpisodeHistoryBucketKey(row = {}) {
  const title = deriveSeriesTitleFromRow(row);
  const season = Number(row.parent_media_index || 0);
  const episode = Number(row.media_index || 0);
  if (!title || !season || !episode) {
    return '';
  }

  return `${title}::${season}::${episode}`;
}

/**
 * @param {string} seriesTitle
 * @param {CleanupEpisode} [episode]
 */
export function getEpisodeIdentityKey(seriesTitle, episode = {}) {
  const title = normalizeTitleToken(seriesTitle);
  const season = Number(episode.seasonNumber || 0);
  const episodeNumber = Number(episode.episodeNumber || 0);
  if (!title || !season || !episodeNumber) {
    return '';
  }

  return `${title}::${season}::${episodeNumber}`;
}

/**
 * @param {{
 *   episode?: CleanupEpisode,
 *   seriesTitle?: string,
 *   policyMode?: TvCleanupMode,
 *   historyRows?: TautulliHistoryRow[],
 *   manualOverrides?: Record<string, ManualOverride>,
 *   watchedThresholdPercent?: number,
 *   waitDays?: number,
 *   now?: number,
 * }} [input]
 * @returns {EpisodeCleanupPlan}
 */
export function buildEpisodeCleanupPlan({
  episode = {},
  seriesTitle = '',
  policyMode = 'keep-all',
  historyRows = [],
  manualOverrides = {},
  watchedThresholdPercent = DEFAULT_TV_CLEANUP_PREFERENCES.watchedThresholdPercent,
  waitDays = DEFAULT_TV_CLEANUP_PREFERENCES.waitDays,
  now = Date.now(),
} = {}) {
  /** @type {Record<string, any>} */
  const safeEpisode = episode || {};
  const targetKey = getEpisodeIdentityKey(seriesTitle, safeEpisode);
  const matchingHistory = historyRows.filter((row) => getEpisodeHistoryBucketKey(row) === targetKey);
  const manualOverride = manualOverrides?.[targetKey] || null;
  const threshold = Number(watchedThresholdPercent || 0);
  const waitMs = Number(waitDays || 0) * 24 * 60 * 60 * 1000;
  const watchedRows = matchingHistory.filter((row) => Number(row.percent_complete || 0) >= threshold || Number(row.watched_status || 0) === 1);
  const latestWatchRow = watchedRows.sort((left, right) => Number(right.stopped || right.date || 0) - Number(left.stopped || left.date || 0))[0] || null;
  const historyWatchedAt = latestWatchRow ? Number(latestWatchRow.stopped || latestWatchRow.date || 0) * 1000 : 0;
  const manualWatchedAt = manualOverride?.watchedAt ? new Date(manualOverride.watchedAt).getTime() : 0;
  const isWatched = manualOverride ? Boolean(manualOverride.watched) : Boolean(latestWatchRow);
  const lastWatchedAt = manualOverride && manualOverride.watched ? manualWatchedAt : historyWatchedAt;
  const waitElapsed = isWatched && lastWatchedAt > 0 ? (now - lastWatchedAt) >= waitMs : false;
  const normalizedMode = normalizeShowMode(policyMode);
  const canDeleteFile = Boolean(safeEpisode.hasFile && safeEpisode.episodeFileId);
  const canUnmonitor = safeEpisode.monitored !== false;
  const shouldDeleteFile = normalizedMode === 'delete-unmonitor' && isWatched && waitElapsed && canDeleteFile;
  const shouldUnmonitor = (normalizedMode === 'delete-unmonitor' || normalizedMode === 'unmonitor-only') && isWatched && waitElapsed && canUnmonitor;

  return {
    policyMode: normalizedMode,
    matchingHistory,
    latestWatchRow,
    lastWatchedAt,
    isWatched,
    watchSource: manualOverride && manualOverride.watched ? 'manual' : latestWatchRow ? 'tautulli' : 'none',
    waitElapsed,
    isEligible: shouldDeleteFile || shouldUnmonitor,
    shouldDeleteFile,
    shouldUnmonitor,
  };
}

/**
 * @param {TvCleanupPreferences} preferences
 * @param {string | number} seriesId
 * @returns {TvCleanupMode}
 */
export function getShowCleanupMode(preferences = {}, seriesId) {
  return normalizeShowMode(preferences?.shows?.[String(seriesId)]?.mode);
}

/**
 * @param {{
 *   series?: CleanupSeries,
 *   episodes?: CleanupEpisode[],
 *   historyRows?: TautulliHistoryRow[],
 *   preferences?: TvCleanupPreferences,
 *   now?: number,
 * }} [input]
 */
export function buildShowCleanupSummary({ series = {}, episodes = [], historyRows = [], preferences = DEFAULT_TV_CLEANUP_PREFERENCES, now = Date.now() } = {}) {
  /** @type {Record<string, any>} */
  const safeSeries = series || {};
  const policyMode = getShowCleanupMode(preferences, safeSeries.id);
  const plans = episodes.map((episode) => ({
    episode,
    plan: buildEpisodeCleanupPlan({
      episode,
      seriesTitle: safeSeries.title,
      policyMode,
      historyRows,
      manualOverrides: preferences.manualOverrides || {},
      watchedThresholdPercent: preferences.watchedThresholdPercent,
      waitDays: preferences.waitDays,
      now,
    }),
  }));

  return {
    policyMode,
    watchedCount: plans.filter((item) => item.plan.isWatched).length,
    eligibleCount: plans.filter((item) => item.plan.isEligible).length,
    plans,
  };
}

export const TV_CLEANUP_MODE_OPTIONS = [
  { value: 'keep-all', label: 'Keep everything' },
  { value: 'unmonitor-only', label: 'Unmonitor watched episodes, keep files' },
  { value: 'delete-unmonitor', label: 'Delete watched episodes and unmonitor them' },
];
