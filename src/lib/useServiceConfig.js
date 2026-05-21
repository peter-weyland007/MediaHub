import { useQuery, useQueryClient } from '@tanstack/react-query';
import { appConfigApi } from '@/lib/appConfigApi';
import { defaultMediaBrowserPreferences, normalizeMediaBrowserPreferences } from '@/lib/mediaBrowserPreferences';

const defaultConfig = {
  radarr: { url: '', apiKey: '', enabled: false },
  sonarr: { url: '', apiKey: '', enabled: false },
  lidarr: { url: '', apiKey: '', enabled: false },
  bazarr: { url: '', apiKey: '', enabled: false },
  tautulli: { url: '', apiKey: '', enabled: false },
  overseerr: { url: '', apiKey: '', enabled: false },
  plex: { url: '', apiKey: '', enabled: false },
  prowlarr: { url: '', apiKey: '', enabled: false },
};

const defaultPosterDisplayPreferences = {
  hidePosters: false,
  posterSize: 'default',
};

const defaultOptimizationPreferences = {
  strategy: 'balanced',
  targetContainer: 'mp4',
  preferredVideoCodec: 'h264',
  preferredAudioCodec: 'aac',
  maxResolution: '1080p',
};

const defaultTvCleanupPreferences = {
  watchedThresholdPercent: 90,
  waitDays: 3,
  shows: {},
  manualOverrides: {},
};

const defaultMovieCleanupPreferences = {
  watchedThresholdPercent: 90,
  waitDays: 3,
  movies: {},
};

const APP_CONFIG_QUERY_KEY = ['app-config'];

const normalizeAppConfig = (data = {}) => ({
  services: { ...defaultConfig, ...(data.services || {}) },
  qualityPreferences: data.qualityPreferences || {},
  posterDisplayPreferences: { ...defaultPosterDisplayPreferences, ...(data.posterDisplayPreferences || {}) },
  mediaBrowserPreferences: normalizeMediaBrowserPreferences(data.mediaBrowserPreferences || defaultMediaBrowserPreferences),
  optimizationPreferences: { ...defaultOptimizationPreferences, ...(data.optimizationPreferences || {}) },
  tvCleanupPreferences: {
    ...defaultTvCleanupPreferences,
    ...(data.tvCleanupPreferences || {}),
    shows: data.tvCleanupPreferences?.shows || {},
    manualOverrides: data.tvCleanupPreferences?.manualOverrides || {},
  },
  movieCleanupPreferences: {
    ...defaultMovieCleanupPreferences,
    ...(data.movieCleanupPreferences || {}),
    movies: data.movieCleanupPreferences?.movies || {},
  },
});

const getDefaultAppConfig = () => normalizeAppConfig();

export function useServiceConfig() {
  const queryClient = useQueryClient();
  const { data, isLoading, isFetching } = useQuery({
    queryKey: APP_CONFIG_QUERY_KEY,
    queryFn: async () => normalizeAppConfig(await appConfigApi.getConfig()),
    staleTime: 5 * 60 * 1000,
  });

  const appConfig = data || getDefaultAppConfig();

  const setCachedAppConfig = (updater) => {
    queryClient.setQueryData(APP_CONFIG_QUERY_KEY, (current) => {
      const base = current || getDefaultAppConfig();
      const next = typeof updater === 'function' ? updater(base) : updater;
      return normalizeAppConfig(next);
    });
  };

  const updateService = async (service, nextData) => {
    const previous = queryClient.getQueryData(APP_CONFIG_QUERY_KEY) || getDefaultAppConfig();
    const next = {
      ...appConfig.services[service],
      ...nextData,
    };

    setCachedAppConfig((current) => ({
      ...current,
      services: {
        ...current.services,
        [service]: next,
      },
    }));

    try {
      await appConfigApi.updateService(service, next);
    } catch (error) {
      queryClient.setQueryData(APP_CONFIG_QUERY_KEY, previous);
      console.error(`Failed to save config for ${service}`, error);
      throw error;
    }
  };

  const updateQualityPreferences = async (nextPreferences) => {
    const previous = queryClient.getQueryData(APP_CONFIG_QUERY_KEY) || getDefaultAppConfig();

    setCachedAppConfig((current) => ({
      ...current,
      qualityPreferences: nextPreferences,
    }));

    try {
      await appConfigApi.updateQualityPreferences(nextPreferences);
    } catch (error) {
      queryClient.setQueryData(APP_CONFIG_QUERY_KEY, previous);
      console.error('Failed to save quality preferences', error);
      throw error;
    }
  };

  const updatePosterDisplayPreferences = async (nextPreferences) => {
    const previous = queryClient.getQueryData(APP_CONFIG_QUERY_KEY) || getDefaultAppConfig();
    const normalized = { ...defaultPosterDisplayPreferences, ...nextPreferences };

    setCachedAppConfig((current) => ({
      ...current,
      posterDisplayPreferences: normalized,
    }));

    try {
      await appConfigApi.updatePosterDisplayPreferences(normalized);
    } catch (error) {
      queryClient.setQueryData(APP_CONFIG_QUERY_KEY, previous);
      console.error('Failed to save poster display preferences', error);
      throw error;
    }
  };

  const updateMediaBrowserPreferences = async (nextPreferences) => {
    const previous = queryClient.getQueryData(APP_CONFIG_QUERY_KEY) || getDefaultAppConfig();
    const normalized = normalizeMediaBrowserPreferences(nextPreferences);

    setCachedAppConfig((current) => ({
      ...current,
      mediaBrowserPreferences: normalized,
    }));

    try {
      await appConfigApi.updateMediaBrowserPreferences(normalized);
    } catch (error) {
      queryClient.setQueryData(APP_CONFIG_QUERY_KEY, previous);
      console.error('Failed to save media browser preferences', error);
      throw error;
    }
  };

  const updateOptimizationPreferences = async (nextPreferences) => {
    const previous = queryClient.getQueryData(APP_CONFIG_QUERY_KEY) || getDefaultAppConfig();
    const normalized = { ...defaultOptimizationPreferences, ...nextPreferences };

    setCachedAppConfig((current) => ({
      ...current,
      optimizationPreferences: normalized,
    }));

    try {
      await appConfigApi.updateOptimizationPreferences(normalized);
    } catch (error) {
      queryClient.setQueryData(APP_CONFIG_QUERY_KEY, previous);
      console.error('Failed to save optimization preferences', error);
      throw error;
    }
  };

  const updateTvCleanupPreferences = async (nextPreferences) => {
    const previous = queryClient.getQueryData(APP_CONFIG_QUERY_KEY) || getDefaultAppConfig();
    const normalized = {
      ...defaultTvCleanupPreferences,
      ...nextPreferences,
      shows: nextPreferences?.shows || {},
      manualOverrides: nextPreferences?.manualOverrides || {},
    };

    setCachedAppConfig((current) => ({
      ...current,
      tvCleanupPreferences: normalized,
    }));

    try {
      await appConfigApi.updateTvCleanupPreferences(normalized);
    } catch (error) {
      queryClient.setQueryData(APP_CONFIG_QUERY_KEY, previous);
      console.error('Failed to save TV cleanup preferences', error);
      throw error;
    }
  };

  const updateMovieCleanupPreferences = async (nextPreferences) => {
    const previous = queryClient.getQueryData(APP_CONFIG_QUERY_KEY) || getDefaultAppConfig();
    const normalized = {
      ...defaultMovieCleanupPreferences,
      ...nextPreferences,
      movies: nextPreferences?.movies || {},
    };

    setCachedAppConfig((current) => ({
      ...current,
      movieCleanupPreferences: normalized,
    }));

    try {
      await appConfigApi.updateMovieCleanupPreferences(normalized);
    } catch (error) {
      queryClient.setQueryData(APP_CONFIG_QUERY_KEY, previous);
      console.error('Failed to save movie cleanup preferences', error);
      throw error;
    }
  };

  const getService = (service) => appConfig.services[service];

  const isServiceReady = (service) => {
    const current = appConfig.services[service];
    return Boolean(current && current.enabled && current.url && current.apiKey);
  };

  return {
    config: appConfig.services,
    qualityPreferences: appConfig.qualityPreferences,
    posterDisplayPreferences: appConfig.posterDisplayPreferences,
    mediaBrowserPreferences: appConfig.mediaBrowserPreferences,
    optimizationPreferences: appConfig.optimizationPreferences,
    tvCleanupPreferences: appConfig.tvCleanupPreferences,
    movieCleanupPreferences: appConfig.movieCleanupPreferences,
    isLoadingConfig: isLoading && !data,
    isFetchingConfig: isFetching,
    updateService,
    updateQualityPreferences,
    updatePosterDisplayPreferences,
    updateMediaBrowserPreferences,
    updateOptimizationPreferences,
    updateTvCleanupPreferences,
    updateMovieCleanupPreferences,
    getService,
    isServiceReady,
  };
}
