/** @typedef {{ id?: number, title?: string, year?: number, images?: Array<{ coverType?: string, remoteUrl?: string, url?: string }>, movieFile?: { size?: number, quality?: { quality?: { name?: string } }, mediaInfo?: { videoCodec?: string, audioCodec?: string, runTime?: string } }, ratings?: Record<string, { value?: number|string }>, imdbId?: string, tmdbId?: number|string, titleSlug?: string, studio?: string, status?: string, minimumAvailability?: string }} Movie */
/** @typedef {{ url?: string }} ServiceConfig */
/** @typedef {{ type?: string, title?: string, year?: number }} LibraryItem */
/** @typedef {{ title?: string, full_title?: string, original_title?: string, year?: number|string, originally_available_at?: string, user?: string, friendly_name?: string, date?: number|string, stopped?: number|string, transcode_decision?: string, percent_complete?: number|string, product?: string, player?: string, platform?: string }} TautulliMovieHistoryRow */
/** @typedef {{ title?: string, year?: number|string, User?: { title?: string }, Player?: { title?: string, product?: string, platform?: string, state?: string }, Session?: { location?: string } }} PlexSession */

export function formatMovieRuntime(runtimeMinutes) {
  const runtime = Number(runtimeMinutes || 0);
  if (!runtime) {
    return 'Unknown';
  }

  const hours = Math.floor(runtime / 60);
  const minutes = runtime % 60;

  if (!hours) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

export function formatMovieFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) {
    return '—';
  }

  return `${(size / (1024 ** 3)).toFixed(1)} GB`;
}

/**
 * @param {Movie} [movie]
 * @param {ServiceConfig} [serviceConfig]
 */
export function getPrimaryMovieImage(movie = {}, serviceConfig = {}) {
  const images = Array.isArray(movie.images) ? movie.images : [];
  const poster = images.find((image) => image.coverType === 'poster') || images[0];

  if (!poster) {
    return null;
  }

  if (poster.remoteUrl) {
    return poster.remoteUrl;
  }

  if (poster.url && serviceConfig.url) {
    return `${serviceConfig.url}${poster.url}`;
  }

  return null;
}

/**
 * @param {Movie} [movie]
 * @param {ServiceConfig} [serviceConfig]
 */
export function buildMovieExternalLinks(movie = {}, serviceConfig = {}) {
  const sourcePathSegment = String(movie.titleSlug || movie.tmdbId || movie.id || '').trim();

  return {
    radarr: sourcePathSegment && serviceConfig.url ? `${serviceConfig.url.replace(/\/$/, '')}/movie/${sourcePathSegment}` : '',
    imdb: movie.imdbId ? `https://www.imdb.com/title/${movie.imdbId}/` : '',
    tmdb: movie.tmdbId ? `https://www.themoviedb.org/movie/${movie.tmdbId}` : '',
  };
}

/**
 * @param {Movie} [movie]
 */
export function getMovieFactItems(movie = {}) {
  const movieFile = movie.movieFile || {};
  const qualityName = movieFile.quality?.quality?.name || '';
  const mediaInfo = movieFile.mediaInfo || {};

  return [
    { label: 'Studio', value: movie.studio || 'Unknown' },
    { label: 'Status', value: movie.status || 'Unknown' },
    { label: 'Availability', value: movie.minimumAvailability || 'Unknown' },
    { label: 'Quality', value: qualityName || 'Not downloaded' },
    { label: 'Video', value: mediaInfo.videoCodec || '—' },
    { label: 'Audio', value: mediaInfo.audioCodec || '—' },
    { label: 'File size', value: formatMovieFileSize(movieFile.size) },
    { label: 'File runtime', value: mediaInfo.runTime || '—' },
  ];
}

export function formatMovieRatingValue(value) {
  const raw = String(value ?? '').trim();
  if (!raw) {
    return '';
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return raw;
  }

  if (numeric >= 10) {
    return String(Math.round(numeric));
  }

  return numeric.toFixed(1);
}

/**
 * @param {Movie} [movie]
 */
export function getMovieRatings(movie = {}) {
  const ratings = movie.ratings || {};
  return [
    { label: 'IMDb', value: formatMovieRatingValue(ratings.imdb?.value), iconLabel: 'IMDb', iconClassName: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    { label: 'TMDb', value: formatMovieRatingValue(ratings.tmdb?.value), iconLabel: 'TMDb', iconClassName: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    { label: 'Metacritic', value: formatMovieRatingValue(ratings.metacritic?.value), iconLabel: 'MC', iconClassName: 'bg-yellow-500/15 text-yellow-200 border-yellow-500/30' },
    { label: 'Rotten Tomatoes', value: formatMovieRatingValue(ratings.rottenTomatoes?.value), iconLabel: 'RT', iconClassName: 'bg-rose-500/15 text-rose-200 border-rose-500/30' },
    { label: 'Trakt', value: formatMovieRatingValue(ratings.trakt?.value), iconLabel: 'TR', iconClassName: 'bg-sky-500/15 text-sky-200 border-sky-500/30' },
  ].filter((item) => item.value !== undefined && item.value !== null && item.value !== '');
}

const normalizeLookupValue = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
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

/**
 * @param {Movie} [movie]
 * @param {TautulliMovieHistoryRow[]} [historyRows]
 */
export function matchMovieHistoryRows(movie = {}, historyRows = []) {
  const targetTitle = normalizeTitleToken(movie.title);
  const targetYear = Number(movie.year || 0);
  if (!targetTitle) {
    return [];
  }

  return historyRows.filter((row) => {
    const rowTitles = [row.title, row.full_title, row.original_title]
      .map((value) => normalizeTitleToken(value))
      .filter(Boolean);
    const rowYear = parseMovieHistoryYear(row);
    if (rowTitles.length === 0) {
      return false;
    }

    if (!rowTitles.includes(targetTitle)) {
      return false;
    }

    return !targetYear || !rowYear || rowYear === targetYear;
  });
}

/**
 * @param {Movie} [movie]
 * @param {PlexSession[]} [sessions]
 */
export function matchMoviePlexSessions(movie = {}, sessions = []) {
  const targetTitle = normalizeTitleToken(movie.title);
  const targetYear = Number(movie.year || 0);
  if (!targetTitle) {
    return [];
  }

  return sessions.filter((session) => {
    const sessionTitle = normalizeTitleToken(session.title);
    const sessionYear = Number(session.year || 0);
    if (!sessionTitle || sessionTitle !== targetTitle) {
      return false;
    }

    return !targetYear || !sessionYear || sessionYear === targetYear;
  });
}

/**
 * @param {Movie} [movie]
 * @param {TautulliMovieHistoryRow[]} [historyRows]
 * @param {PlexSession[]} [sessions]
 */
export function buildMoviePlaybackSummary(movie = {}, historyRows = [], sessions = []) {
  const matchingHistory = matchMovieHistoryRows(movie, historyRows).slice().sort((left, right) => Number(right.stopped || right.date || 0) - Number(left.stopped || left.date || 0));
  const matchingSessions = matchMoviePlexSessions(movie, sessions);
  const totalPlays = matchingHistory.length;
  const directPlays = matchingHistory.filter((row) => String(row.transcode_decision || '').toLowerCase().includes('direct')).length;
  const transcodes = matchingHistory.filter((row) => String(row.transcode_decision || '').toLowerCase().includes('transcode')).length;
  const latestPlay = matchingHistory[0] || null;

  return {
    totalPlays,
    directPlays,
    transcodes,
    lastWatchedAt: Number(latestPlay?.stopped || latestPlay?.date || 0) * 1000,
    lastWatchedBy: String(latestPlay?.friendly_name || latestPlay?.user || '').trim() || '—',
    activeSessions: matchingSessions.length,
    matchingHistory,
    matchingSessions,
  };
}

/**
 * @param {TautulliMovieHistoryRow} [row]
 */
export function formatMoviePlaybackClient(row = {}) {
  return [row.player, row.product, row.platform].filter(Boolean).join(' • ') || 'Unknown client';
}

/**
 * @param {PlexSession} [session]
 */
export function formatMoviePlexSessionLabel(session = {}) {
  return [session.Player?.title, session.Player?.product, session.Player?.platform].filter(Boolean).join(' • ') || 'Unknown Plex client';
}

/**
 * @param {TautulliMovieHistoryRow} [row]
 */
export function formatMoviePlaybackDecision(row = {}) {
  const decision = String(row.transcode_decision || '').trim();
  return decision ? decision.replace(/\b\w/g, (char) => char.toUpperCase()) : 'Unknown';
}

/**
 * @param {number} [timestamp]
 */
export function formatMoviePlaybackDate(timestamp) {
  const numeric = Number(timestamp || 0);
  if (!numeric) {
    return 'Never';
  }

  return new Date(numeric).toLocaleString();
}

/**
 * @param {Movie} [movie]
 * @param {TautulliMovieHistoryRow[]} [historyRows]
 * @param {PlexSession[]} [sessions]
 */
export function getMoviePlaybackCards(movie = {}, historyRows = [], sessions = []) {
  const summary = buildMoviePlaybackSummary(movie, historyRows, sessions);
  return [
    { label: 'Recent plays', value: String(summary.totalPlays) },
    { label: 'Direct plays', value: String(summary.directPlays) },
    { label: 'Transcodes', value: String(summary.transcodes) },
    { label: 'Last watched', value: formatMoviePlaybackDate(summary.lastWatchedAt) },
    { label: 'Last watched by', value: summary.lastWatchedBy },
    { label: 'Active Plex sessions', value: String(summary.activeSessions) },
  ];
}

/**
 * @param {LibraryItem} [item]
 * @param {Movie[]} [radarrMovies]
 */
export function resolveLibraryItemDetailsPath(item = {}, radarrMovies = []) {
  if (item.type !== 'movie') {
    return '';
  }

  const itemTitle = normalizeLookupValue(item.title);
  const itemYear = Number(item.year || 0);
  const match = radarrMovies.find((movie) => (
    normalizeLookupValue(movie.title) === itemTitle && Number(movie.year || 0) === itemYear
  ));

  return match?.id ? `/movies/${match.id}` : '';
}

/**
 * @param {LibraryItem} [item]
 * @param {Array<{ id?: number, title?: string, year?: number }>} [sonarrSeries]
 */
export function resolveLibrarySeriesDetailsPath(item = {}, sonarrSeries = []) {
  if (item.type !== 'show') {
    return '';
  }

  const itemTitle = normalizeLookupValue(item.title);
  const itemYear = Number(item.year || 0);
  const match = sonarrSeries.find((series) => (
    normalizeLookupValue(series.title) === itemTitle && Number(series.year || 0) === itemYear
  ));

  return match?.id ? `/tv-shows/${match.id}` : '';
}
