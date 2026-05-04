// Utility to make API calls to MediaHub backend service proxies.
// Browser traffic stays same-origin; the backend talks to Radarr/Sonarr/Lidarr/Bazarr/Tautulli/Plex/Overseerr/Prowlarr.

/** @typedef {{ url?: string, apiKey?: string, enabled?: boolean }} ServiceConfig */
/** @typedef {{ error?: string }} ProxyErrorPayload */
/** @typedef {{ response?: { data?: any } }} TautulliPayload */

/**
 * @param {Response} response
 * @param {string} serviceName
 */
const parseProxyResponse = async (response, serviceName) => {
  if (!response.ok) {
    let details = '';
    try {
      /** @type {ProxyErrorPayload} */
      const body = await response.json();
      details = body?.error ? `: ${body.error}` : '';
    } catch {
      details = '';
    }

    throw new Error(`${serviceName} API error: ${response.status}${details}`);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

/**
 * @typedef {{ method?: 'GET' | 'POST' | 'PUT' | 'DELETE', body?: any }} ProxyRequestOptions
 */

/**
 * @param {string} service
 * @param {string} serviceName
 * @param {any} config
 * @param {string} path
 * @param {ProxyRequestOptions} [options]
 */
const proxyRequest = async (service, serviceName, config, path, { method = 'GET', body } = {}) => {
  const response = await fetch(`/api/service-proxy/${service}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method,
      path,
      body,
      configOverride: config,
    }),
  });

  return parseProxyResponse(response, serviceName);
};

/**
 * @param {{ service: string, serviceName: string }} options
 */
const createServiceClient = ({ service, serviceName }) => ({
  get: (config, path) => proxyRequest(service, serviceName, config, path),
  post: (config, path, body) => proxyRequest(service, serviceName, config, path, { method: 'POST', body }),
  put: (config, path, body) => proxyRequest(service, serviceName, config, path, { method: 'PUT', body }),
  delete: (config, path) => proxyRequest(service, serviceName, config, path, { method: 'DELETE' }),
});

/**
 * @param {TautulliPayload | any} payload
 */
const unwrapTautulliResponse = (payload) => payload?.response?.data ?? {};
/**
 * @param {TautulliPayload | any} payload
 */
const normalizeTautulliRows = (payload) => {
  const data = unwrapTautulliResponse(payload);
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray(data?.data)) {
    return data.data;
  }
  return [];
};

export const radarrApi = {
  ...createServiceClient({ service: 'radarr', serviceName: 'Radarr' }),
  getMovies: (config) => radarrApi.get(config, '/movie'),
  getMovie: (config, id) => radarrApi.get(config, `/movie/${id}`),
  getQueue: (config) => radarrApi.get(config, '/queue?pageSize=50'),
  getCalendar: (config) => radarrApi.get(config, '/calendar'),
  getDiskSpace: (config) => radarrApi.get(config, '/diskspace'),
  getSystemStatus: (config) => radarrApi.get(config, '/system/status'),
  getRootFolders: (config) => radarrApi.get(config, '/rootfolder'),
  getQualityProfiles: (config) => radarrApi.get(config, '/qualityprofile'),
  getQualityProfileSchema: (config) => radarrApi.get(config, '/qualityprofile/schema'),
  createQualityProfile: (config, profile) => radarrApi.post(config, '/qualityprofile', profile),
  updateQualityProfile: (config, id, profile) => radarrApi.put(config, `/qualityprofile/${id}`, profile),
  searchMovie: (config, term) => radarrApi.get(config, `/movie/lookup?term=${encodeURIComponent(term)}`),
  addMovie: (config, movie) => radarrApi.post(config, '/movie', movie),
  deleteMovie: (config, id, deleteFiles = false) => radarrApi.delete(config, `/movie/${id}?deleteFiles=${deleteFiles}`),
  commandSearch: (config, movieIds) => radarrApi.post(config, '/command', { name: 'MoviesSearch', movieIds }),
  updateMoviesQualityProfile: (config, movieIds, qualityProfileId) => radarrApi.put(config, '/movie/editor', { movieIds, qualityProfileId }),
  getMovieFiles: (config, movieId) => radarrApi.get(config, `/moviefile?movieId=${movieId}`),
  commandRescanMovie: (config, movieId) => radarrApi.post(config, '/command', { name: 'RescanMovie', movieId }),
};

export const sonarrApi = {
  ...createServiceClient({ service: 'sonarr', serviceName: 'Sonarr' }),
  getSeries: (config) => sonarrApi.get(config, '/series'),
  getSeriesById: (config, id) => sonarrApi.get(config, `/series/${id}`),
  getQueue: (config) => sonarrApi.get(config, '/queue?pageSize=50'),
  getCalendar: (config) => sonarrApi.get(config, '/calendar'),
  getDiskSpace: (config) => sonarrApi.get(config, '/diskspace'),
  getSystemStatus: (config) => sonarrApi.get(config, '/system/status'),
  getRootFolders: (config) => sonarrApi.get(config, '/rootfolder'),
  getQualityProfiles: (config) => sonarrApi.get(config, '/qualityprofile'),
  getQualityProfileSchema: (config) => sonarrApi.get(config, '/qualityprofile/schema'),
  createQualityProfile: (config, profile) => sonarrApi.post(config, '/qualityprofile', profile),
  updateQualityProfile: (config, id, profile) => sonarrApi.put(config, `/qualityprofile/${id}`, profile),
  searchSeries: (config, term) => sonarrApi.get(config, `/series/lookup?term=${encodeURIComponent(term)}`),
  addSeries: (config, series) => sonarrApi.post(config, '/series', series),
  deleteSeries: (config, id, deleteFiles = false) => sonarrApi.delete(config, `/series/${id}?deleteFiles=${deleteFiles}`),
  commandSearch: (config, seriesId) => sonarrApi.post(config, '/command', { name: 'SeriesSearch', seriesId }),
  updateSeriesQualityProfile: (config, seriesIds, qualityProfileId) => sonarrApi.put(config, '/series/editor', { seriesIds, qualityProfileId }),
  getEpisodes: (config, seriesId) => sonarrApi.get(config, `/episode?seriesId=${seriesId}`),
  updateEpisodesMonitored: (config, episodeIds, monitored) => sonarrApi.put(config, '/episode/monitor', { episodeIds, monitored }),
  getEpisodeFiles: (config, seriesId) => sonarrApi.get(config, `/episodefile?seriesId=${seriesId}`),
  deleteEpisodeFile: (config, episodeFileId) => sonarrApi.delete(config, `/episodefile/${episodeFileId}`),
  commandRescanSeries: (config, seriesId) => sonarrApi.post(config, '/command', { name: 'RescanSeries', seriesId }),
};

export const lidarrApi = {
  ...createServiceClient({ service: 'lidarr', serviceName: 'Lidarr' }),
  getArtists: (config) => lidarrApi.get(config, '/artist'),
  getQueue: (config) => lidarrApi.get(config, '/queue?pageSize=50'),
  getSystemStatus: (config) => lidarrApi.get(config, '/system/status'),
  searchArtist: (config, term) => lidarrApi.get(config, `/artist/lookup?term=${encodeURIComponent(term)}`),
};

export const bazarrApi = {
  ...createServiceClient({ service: 'bazarr', serviceName: 'Bazarr' }),
  getMovies: (config) => bazarrApi.get(config, '/movies'),
  getSeries: (config) => bazarrApi.get(config, '/series'),
  getSystemStatus: (config) => bazarrApi.get(config, '/system/status'),
};

export const tautulliApi = {
  ...createServiceClient({ service: 'tautulli', serviceName: 'Tautulli' }),
  getActivity: async (config) => unwrapTautulliResponse(await tautulliApi.get(config, '?cmd=get_activity')),
  getHistory: async (config, params = {}) => {
    const query = new URLSearchParams({ cmd: 'get_history', ...Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')) });
    return normalizeTautulliRows(await tautulliApi.get(config, `?${query.toString()}`));
  },
};

export const overseerrApi = {
  ...createServiceClient({ service: 'overseerr', serviceName: 'Overseerr' }),
  getRequests: (config) => overseerrApi.get(config, '/request?take=50&skip=0&sort=added'),
  getRequestCount: (config) => overseerrApi.get(config, '/request/count'),
  getMovieDetails: (config, tmdbId) => overseerrApi.get(config, `/movie/${tmdbId}`),
  getTvDetails: (config, tmdbId) => overseerrApi.get(config, `/tv/${tmdbId}`),
  approveRequest: (config, id) => overseerrApi.post(config, `/request/${id}/approve`),
  declineRequest: (config, id) => overseerrApi.post(config, `/request/${id}/decline`),
  getStatus: (config) => overseerrApi.get(config, '/status'),
};

export const plexApi = {
  ...createServiceClient({ service: 'plex', serviceName: 'Plex' }),
  getLibraries: (config) => plexApi.get(config, '/library/sections'),
  getLibraryContent: (config, sectionId) => plexApi.get(config, `/library/sections/${sectionId}/all`),
  getRecentlyAdded: (config) => plexApi.get(config, '/library/recentlyAdded'),
  getSessions: (config) => plexApi.get(config, '/status/sessions'),
  getIdentity: (config) => plexApi.get(config, '/'),
};

export const prowlarrApi = {
  ...createServiceClient({ service: 'prowlarr', serviceName: 'Prowlarr' }),
  getIndexers: (config) => prowlarrApi.get(config, '/indexer'),
  updateIndexer: (config, id, indexer) => prowlarrApi.put(config, `/indexer/${id}`, indexer),
  getIndexerStatus: (config) => prowlarrApi.get(config, '/indexerstatus'),
  getSystemStatus: (config) => prowlarrApi.get(config, '/system/status'),
};

export const isConfigured = (config) => {
  return config && config.url && config.apiKey;
};

export const serviceColors = {
  radarr: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  sonarr: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', dot: 'bg-sky-400' },
  lidarr: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  bazarr: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
  tautulli: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20', dot: 'bg-fuchsia-400' },
  overseerr: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-400' },
  plex: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  prowlarr: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', dot: 'bg-rose-400' },
};
