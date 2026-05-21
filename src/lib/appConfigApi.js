const handleJsonResponse = async (response) => {
  if (!response.ok) {
    throw new Error(`App config API error: ${response.status}`);
  }

  return response.json();
};

export const appConfigApi = {
  async getConfig() {
    const response = await fetch('/api/app-config');
    return handleJsonResponse(response);
  },

  async updateService(service, config) {
    const response = await fetch(`/api/app-config/services/${service}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });

    return handleJsonResponse(response);
  },

  async updateQualityPreferences(qualityPreferences) {
    const response = await fetch('/api/app-config/quality-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(qualityPreferences),
    });

    return handleJsonResponse(response);
  },

  async updatePosterDisplayPreferences(posterDisplayPreferences) {
    const response = await fetch('/api/app-config/poster-display', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(posterDisplayPreferences),
    });

    return handleJsonResponse(response);
  },

  async updateMediaBrowserPreferences(mediaBrowserPreferences) {
    const response = await fetch('/api/app-config/media-browser-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mediaBrowserPreferences),
    });

    return handleJsonResponse(response);
  },

  async updateOptimizationPreferences(optimizationPreferences) {
    const response = await fetch('/api/app-config/optimization-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(optimizationPreferences),
    });

    return handleJsonResponse(response);
  },

  async updateTvCleanupPreferences(tvCleanupPreferences) {
    const response = await fetch('/api/app-config/tv-cleanup-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tvCleanupPreferences),
    });

    return handleJsonResponse(response);
  },

  async updateMovieCleanupPreferences(movieCleanupPreferences) {
    const response = await fetch('/api/app-config/movie-cleanup-preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movieCleanupPreferences),
    });

    return handleJsonResponse(response);
  },
};
