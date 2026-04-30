// Utility to make API calls to *arr services and Plex
// All services use API keys passed as query params or headers

const buildUrl = (baseUrl, path) => {
  const url = baseUrl.replace(/\/+$/, '');
  return `${url}${path}`;
};

export const radarrApi = {
  async get(config, path) {
    const res = await fetch(buildUrl(config.url, `/api/v3${path}`), {
      headers: { 'X-Api-Key': config.apiKey }
    });
    if (!res.ok) throw new Error(`Radarr API error: ${res.status}`);
    return res.json();
  },
  async post(config, path, body) {
    const res = await fetch(buildUrl(config.url, `/api/v3${path}`), {
      method: 'POST',
      headers: { 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Radarr API error: ${res.status}`);
    return res.json();
  },
  async delete(config, path) {
    const res = await fetch(buildUrl(config.url, `/api/v3${path}`), {
      method: 'DELETE',
      headers: { 'X-Api-Key': config.apiKey }
    });
    if (!res.ok) throw new Error(`Radarr API error: ${res.status}`);
    return res.ok;
  },
  getMovies: (config) => radarrApi.get(config, '/movie'),
  getMovie: (config, id) => radarrApi.get(config, `/movie/${id}`),
  getQueue: (config) => radarrApi.get(config, '/queue?pageSize=50'),
  getCalendar: (config) => radarrApi.get(config, '/calendar'),
  getDiskSpace: (config) => radarrApi.get(config, '/diskspace'),
  getSystemStatus: (config) => radarrApi.get(config, '/system/status'),
  getRootFolders: (config) => radarrApi.get(config, '/rootfolder'),
  getQualityProfiles: (config) => radarrApi.get(config, '/qualityprofile'),
  searchMovie: (config, term) => radarrApi.get(config, `/movie/lookup?term=${encodeURIComponent(term)}`),
  addMovie: (config, movie) => radarrApi.post(config, '/movie', movie),
  deleteMovie: (config, id, deleteFiles = false) => radarrApi.delete(config, `/movie/${id}?deleteFiles=${deleteFiles}`),
  commandSearch: (config, movieIds) => radarrApi.post(config, '/command', { name: 'MoviesSearch', movieIds }),
  getMovieFiles: (config, movieId) => radarrApi.get(config, `/moviefile?movieId=${movieId}`),
  commandRescanMovie: (config, movieId) => radarrApi.post(config, '/command', { name: 'RescanMovie', movieId }),
};

export const sonarrApi = {
  async get(config, path) {
    const res = await fetch(buildUrl(config.url, `/api/v3${path}`), {
      headers: { 'X-Api-Key': config.apiKey }
    });
    if (!res.ok) throw new Error(`Sonarr API error: ${res.status}`);
    return res.json();
  },
  async post(config, path, body) {
    const res = await fetch(buildUrl(config.url, `/api/v3${path}`), {
      method: 'POST',
      headers: { 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Sonarr API error: ${res.status}`);
    return res.json();
  },
  async delete(config, path) {
    const res = await fetch(buildUrl(config.url, `/api/v3${path}`), {
      method: 'DELETE',
      headers: { 'X-Api-Key': config.apiKey }
    });
    if (!res.ok) throw new Error(`Sonarr API error: ${res.status}`);
    return res.ok;
  },
  getSeries: (config) => sonarrApi.get(config, '/series'),
  getSeriesById: (config, id) => sonarrApi.get(config, `/series/${id}`),
  getQueue: (config) => sonarrApi.get(config, '/queue?pageSize=50'),
  getCalendar: (config) => sonarrApi.get(config, '/calendar'),
  getDiskSpace: (config) => sonarrApi.get(config, '/diskspace'),
  getSystemStatus: (config) => sonarrApi.get(config, '/system/status'),
  getRootFolders: (config) => sonarrApi.get(config, '/rootfolder'),
  getQualityProfiles: (config) => sonarrApi.get(config, '/qualityprofile'),
  searchSeries: (config, term) => sonarrApi.get(config, `/series/lookup?term=${encodeURIComponent(term)}`),
  addSeries: (config, series) => sonarrApi.post(config, '/series', series),
  deleteSeries: (config, id, deleteFiles = false) => sonarrApi.delete(config, `/series/${id}?deleteFiles=${deleteFiles}`),
  commandSearch: (config, seriesId) => sonarrApi.post(config, '/command', { name: 'SeriesSearch', seriesId }),
  getEpisodeFiles: (config, seriesId) => sonarrApi.get(config, `/episodefile?seriesId=${seriesId}`),
  commandRescanSeries: (config, seriesId) => sonarrApi.post(config, '/command', { name: 'RescanSeries', seriesId }),
};

export const lidarrApi = {
  async get(config, path) {
    const res = await fetch(buildUrl(config.url, `/api/v1${path}`), {
      headers: { 'X-Api-Key': config.apiKey }
    });
    if (!res.ok) throw new Error(`Lidarr API error: ${res.status}`);
    return res.json();
  },
  async post(config, path, body) {
    const res = await fetch(buildUrl(config.url, `/api/v1${path}`), {
      method: 'POST',
      headers: { 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Lidarr API error: ${res.status}`);
    return res.json();
  },
  getArtists: (config) => lidarrApi.get(config, '/artist'),
  getQueue: (config) => lidarrApi.get(config, '/queue?pageSize=50'),
  getSystemStatus: (config) => lidarrApi.get(config, '/system/status'),
  searchArtist: (config, term) => lidarrApi.get(config, `/artist/lookup?term=${encodeURIComponent(term)}`),
};

export const overseerrApi = {
  async get(config, path) {
    // Overseerr accepts the API key as a query param — more reliable than header for CORS
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(buildUrl(config.url, `/api/v1${path}${sep}apikey=${config.apiKey}`), {
      headers: { 'X-Api-Key': config.apiKey }
    });
    if (!res.ok) throw new Error(`Overseerr API error: ${res.status}`);
    return res.json();
  },
  async post(config, path, body = {}) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await fetch(buildUrl(config.url, `/api/v1${path}${sep}apikey=${config.apiKey}`), {
      method: 'POST',
      headers: { 'X-Api-Key': config.apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`Overseerr API error: ${res.status}`);
    // Some Overseerr endpoints return empty body on success
    const text = await res.text();
    return text ? JSON.parse(text) : {};
  },
  getRequests: (config) => overseerrApi.get(config, '/request?take=50&skip=0&sort=added'),
  getRequestCount: (config) => overseerrApi.get(config, '/request/count'),
  approveRequest: (config, id) => overseerrApi.post(config, `/request/${id}/approve`),
  declineRequest: (config, id) => overseerrApi.post(config, `/request/${id}/decline`),
  getStatus: (config) => overseerrApi.get(config, '/status'),
};

export const plexApi = {
  async get(config, path) {
    const res = await fetch(buildUrl(config.url, path), {
      headers: { 'X-Plex-Token': config.apiKey, 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`Plex API error: ${res.status}`);
    return res.json();
  },
  getLibraries: (config) => plexApi.get(config, '/library/sections'),
  getLibraryContent: (config, sectionId) => plexApi.get(config, `/library/sections/${sectionId}/all`),
  getRecentlyAdded: (config) => plexApi.get(config, '/library/recentlyAdded'),
  getSessions: (config) => plexApi.get(config, '/status/sessions'),
  getIdentity: (config) => plexApi.get(config, '/'),
};

export const prowlarrApi = {
  async get(config, path) {
    const res = await fetch(buildUrl(config.url, `/api/v1${path}`), {
      headers: { 'X-Api-Key': config.apiKey }
    });
    if (!res.ok) throw new Error(`Prowlarr API error: ${res.status}`);
    return res.json();
  },
  getIndexers: (config) => prowlarrApi.get(config, '/indexer'),
  getIndexerStatus: (config) => prowlarrApi.get(config, '/indexerstatus'),
  getSystemStatus: (config) => prowlarrApi.get(config, '/system/status'),
};

// Helper to check if a service is configured
export const isConfigured = (config) => {
  return config && config.url && config.apiKey;
};

// Service colors for UI
export const serviceColors = {
  radarr: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  sonarr: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', dot: 'bg-sky-400' },
  lidarr: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  overseerr: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-400' },
  plex: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  prowlarr: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20', dot: 'bg-rose-400' },
};