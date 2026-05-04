/** @typedef {{ id?: number, title?: string, year?: number, images?: Array<{ coverType?: string, remoteUrl?: string, url?: string }>, movieFile?: { size?: number, quality?: { quality?: { name?: string } }, mediaInfo?: { videoCodec?: string, audioCodec?: string, runTime?: string } }, ratings?: Record<string, { value?: number|string }>, imdbId?: string, tmdbId?: number|string, studio?: string, status?: string, minimumAvailability?: string }} Movie */
/** @typedef {{ url?: string }} ServiceConfig */
/** @typedef {{ type?: string, title?: string, year?: number }} LibraryItem */

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
  return {
    radarr: movie.id && serviceConfig.url ? `${serviceConfig.url.replace(/\/$/, '')}/movie/${movie.id}` : '',
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

/**
 * @param {Movie} [movie]
 */
export function getMovieRatings(movie = {}) {
  const ratings = movie.ratings || {};
  return [
    ['IMDb', ratings.imdb?.value],
    ['TMDb', ratings.tmdb?.value],
    ['Metacritic', ratings.metacritic?.value],
    ['Rotten Tomatoes', ratings.rottenTomatoes?.value],
    ['Trakt', ratings.trakt?.value],
  ].filter(([, value]) => value !== undefined && value !== null && value !== '');
}

const normalizeLookupValue = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

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
