/** @typedef {'keep-all' | 'delete-unmonitor'} MovieCleanupMode */
/** @typedef {{ mode?: MovieCleanupMode }} MovieCleanupPreference */
/** @typedef {{ watchedThresholdPercent?: number, waitDays?: number, movies?: Record<string, MovieCleanupPreference> }} MovieCleanupPreferences */
/** @typedef {{ title?: string, full_title?: string, original_title?: string, year?: number|string, originally_available_at?: string, percent_complete?: number|string, watched_status?: number|string, stopped?: number|string, date?: number|string }} TautulliMovieHistoryRow */
/** @typedef {{ id?: number|string, title?: string, year?: number|string, hasFile?: boolean, monitored?: boolean, movieFile?: { id?: number|string } | null }} CleanupMovie */
/** @typedef {{ policyMode: MovieCleanupMode, matchingHistory: TautulliMovieHistoryRow[], latestWatchRow: TautulliMovieHistoryRow | null, lastWatchedAt: number, isWatched: boolean, waitElapsed: boolean, isEligible: boolean, shouldDeleteFile: boolean, shouldUnmonitor: boolean }} MovieCleanupPlan */

export const DEFAULT_MOVIE_CLEANUP_PREFERENCES = {
  watchedThresholdPercent: 90,
  waitDays: 3,
  movies: {},
};

const VALID_MOVIE_MODES = new Set(['keep-all', 'delete-unmonitor']);
const normalizeMovieMode = (mode) => VALID_MOVIE_MODES.has(mode) ? mode : 'keep-all';
const normalizeTitleToken = (value) => String(value || '').trim().toLowerCase();

const parseMovieHistoryYear = (row = {}) => {
  const directYear = Number(row.year || 0);
  if (directYear > 0) {
    return directYear;
  }

  const releaseDate = String(row.originally_available_at || '').trim();
  const parsedYear = Number(releaseDate.slice(0, 4));
  return parsedYear > 0 ? parsedYear : 0;
};

export function normalizeMovieCleanupPreferences(preferences = {}) {
  const watchedThresholdPercent = Number(preferences.watchedThresholdPercent);
  const waitDays = Number(preferences.waitDays);
  const movies = Object.fromEntries(
    Object.entries(preferences.movies || {}).map(([movieId, moviePrefs]) => [
      String(movieId),
      { mode: normalizeMovieMode(moviePrefs?.mode) },
    ])
  );

  return {
    watchedThresholdPercent: Number.isFinite(watchedThresholdPercent) && watchedThresholdPercent >= 1 && watchedThresholdPercent <= 100
      ? watchedThresholdPercent
      : DEFAULT_MOVIE_CLEANUP_PREFERENCES.watchedThresholdPercent,
    waitDays: Number.isFinite(waitDays) && waitDays >= 0 ? waitDays : DEFAULT_MOVIE_CLEANUP_PREFERENCES.waitDays,
    movies,
  };
}

export function getMovieHistoryBucketKey(row = {}) {
  const title = normalizeTitleToken(row.title || row.full_title || row.original_title);
  const year = parseMovieHistoryYear(row);
  if (!title) {
    return '';
  }

  return `${title}::${year || 0}`;
}

const getMovieIdentityKey = (movie = {}) => {
  const title = normalizeTitleToken(movie.title);
  const year = Number(movie.year || 0);
  if (!title) {
    return '';
  }

  return `${title}::${year || 0}`;
};

export function getMovieCleanupMode(preferences = {}, movieId) {
  return normalizeMovieMode(preferences?.movies?.[String(movieId)]?.mode);
}

/**
 * @param {{
 *   movie?: CleanupMovie,
 *   policyMode?: MovieCleanupMode,
 *   historyRows?: TautulliMovieHistoryRow[],
 *   watchedThresholdPercent?: number,
 *   waitDays?: number,
 *   now?: number,
 * }} [input]
 * @returns {MovieCleanupPlan}
 */
export function buildMovieCleanupPlan({
  movie = {},
  policyMode = 'keep-all',
  historyRows = [],
  watchedThresholdPercent = DEFAULT_MOVIE_CLEANUP_PREFERENCES.watchedThresholdPercent,
  waitDays = DEFAULT_MOVIE_CLEANUP_PREFERENCES.waitDays,
  now = Date.now(),
} = {}) {
  const safeMovie = movie || {};
  const targetKey = getMovieIdentityKey(safeMovie);
  const matchingHistory = historyRows.filter((row) => getMovieHistoryBucketKey(row) === targetKey);
  const threshold = Number(watchedThresholdPercent || 0);
  const waitMs = Number(waitDays || 0) * 24 * 60 * 60 * 1000;
  const watchedRows = matchingHistory.filter((row) => Number(row.percent_complete || 0) >= threshold || Number(row.watched_status || 0) === 1);
  const latestWatchRow = watchedRows.slice().sort((left, right) => Number(right.stopped || right.date || 0) - Number(left.stopped || left.date || 0))[0] || null;
  const lastWatchedAt = latestWatchRow ? Number(latestWatchRow.stopped || latestWatchRow.date || 0) * 1000 : 0;
  const isWatched = Boolean(latestWatchRow);
  const waitElapsed = isWatched && lastWatchedAt > 0 ? (now - lastWatchedAt) >= waitMs : false;
  const normalizedMode = normalizeMovieMode(policyMode);
  const movieFileId = Number(safeMovie.movieFile?.id || 0);
  const canDeleteFile = Boolean(safeMovie.hasFile && movieFileId);
  const canUnmonitor = safeMovie.monitored !== false;
  const shouldDeleteFile = normalizedMode === 'delete-unmonitor' && isWatched && waitElapsed && canDeleteFile;
  const shouldUnmonitor = normalizedMode === 'delete-unmonitor' && isWatched && waitElapsed && canUnmonitor;

  return {
    policyMode: normalizedMode,
    matchingHistory,
    latestWatchRow,
    lastWatchedAt,
    isWatched,
    waitElapsed,
    isEligible: shouldDeleteFile || shouldUnmonitor,
    shouldDeleteFile,
    shouldUnmonitor,
  };
}

export const MOVIE_CLEANUP_MODE_OPTIONS = [
  { value: 'keep-all', label: 'Keep after watched' },
  { value: 'delete-unmonitor', label: 'Delete file + unmonitor after watched' },
];
