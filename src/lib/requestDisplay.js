const getMediaYear = (media = {}, type = '') => {
  const rawDate = type === 'tv'
    ? (media.firstAirDate || media.first_air_date || media.releaseDate || media.release_date)
    : (media.releaseDate || media.release_date || media.firstAirDate || media.first_air_date);

  if (!rawDate) {
    return null;
  }

  const match = String(rawDate).match(/^(\d{4})/);
  return match ? match[1] : null;
};

const getRequestMedia = (request = {}) => request.mediaDetails || request.media || {};
const getRequestIdentityMedia = (request = {}) => request.media || request.mediaDetails || {};

export const formatRequestHeadline = (request = {}) => {
  const media = getRequestMedia(request);
  const title = media.title || media.name || media.originalTitle || media.originalName;

  if (title) {
    return title;
  }

  return request.type === 'tv' ? 'Unknown series request' : 'Unknown movie request';
};

export const formatRequestMeta = (request = {}) => {
  const typeLabel = request.type === 'tv' ? 'Series' : 'Movie';
  const year = getMediaYear(getRequestMedia(request), request.type || 'movie');
  return year
    ? `${typeLabel} • ${year} • Request #${request.id}`
    : `${typeLabel} • Request #${request.id}`;
};

export const getRequestDetailPath = (request = {}, movieLookup = new Map(), tvLookup = new Map()) => {
  const media = getRequestIdentityMedia(request);

  if (request.type === 'tv') {
    const tvdbId = Number(media?.tvdbId);
    const tmdbId = Number(media?.tmdbId);
    const seriesId = (Number.isFinite(tvdbId) && tvLookup.get(tvdbId)) || (Number.isFinite(tmdbId) && tvLookup.get(tmdbId));
    return seriesId ? `/tv-shows/${seriesId}` : null;
  }

  const tmdbId = Number(media?.tmdbId);
  const movieId = Number.isFinite(tmdbId) ? movieLookup.get(tmdbId) : null;
  return movieId ? `/movies/${movieId}` : null;
};
