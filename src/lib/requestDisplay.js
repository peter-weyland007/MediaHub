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

const requestStatusKeyMap = {
  1: 'pending',
  2: 'approved',
  3: 'declined',
  4: 'failed',
  5: 'completed',
};

const mediaStatusKeyMap = {
  1: 'unknown',
  2: 'pending',
  3: 'processing',
  4: 'partially_available',
  5: 'available',
  6: 'deleted',
};

const getRequestMedia = (request = {}) => request.mediaDetails || request.media || {};
const getRequestIdentityMedia = (request = {}) => request.media || request.mediaDetails || {};

export const getRequestStatusKey = (request = {}) => {
  const primaryMedia = request.mediaDetails || {};
  const fallbackMedia = request.media || {};
  const primaryMediaStatus = Number(primaryMedia?.status);
  const fallbackMediaStatus = Number(fallbackMedia?.status);
  const mediaStatus = Number.isFinite(primaryMediaStatus)
    ? primaryMediaStatus
    : (Number.isFinite(fallbackMediaStatus) ? fallbackMediaStatus : Number(getRequestMedia(request)?.status));
  const requestStatus = Number(request.status);

  if ([3, 4, 5].includes(requestStatus) && requestStatusKeyMap[requestStatus]) {
    return requestStatusKeyMap[requestStatus];
  }

  if (requestStatus === 2 && [2, 3, 4, 5, 6].includes(mediaStatus) && mediaStatusKeyMap[mediaStatus]) {
    return mediaStatusKeyMap[mediaStatus];
  }

  if (Number.isFinite(requestStatus) && requestStatusKeyMap[requestStatus]) {
    return requestStatusKeyMap[requestStatus];
  }

  if (Number.isFinite(mediaStatus) && mediaStatusKeyMap[mediaStatus]) {
    return mediaStatusKeyMap[mediaStatus];
  }

  return 'pending';
};

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
