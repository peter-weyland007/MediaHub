import { useEffect, useState } from 'react';
import { appConfigApi } from '@/lib/appConfigApi';

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

export function useServiceConfig() {
  const [config, setConfig] = useState(defaultConfig);
  const [qualityPreferences, setQualityPreferences] = useState({});
  const [posterDisplayPreferences, setPosterDisplayPreferences] = useState(defaultPosterDisplayPreferences);
  const [optimizationPreferences, setOptimizationPreferences] = useState(defaultOptimizationPreferences);
  const [tvCleanupPreferences, setTvCleanupPreferences] = useState(defaultTvCleanupPreferences);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const data = await appConfigApi.getConfig();
        if (cancelled) {
          return;
        }

        setConfig({ ...defaultConfig, ...(data.services || {}) });
        setQualityPreferences(data.qualityPreferences || {});
        setPosterDisplayPreferences({ ...defaultPosterDisplayPreferences, ...(data.posterDisplayPreferences || {}) });
        setOptimizationPreferences({ ...defaultOptimizationPreferences, ...(data.optimizationPreferences || {}) });
        setTvCleanupPreferences({ ...defaultTvCleanupPreferences, ...(data.tvCleanupPreferences || {}), shows: data.tvCleanupPreferences?.shows || {} });
      } catch (error) {
        console.error('Failed to load app config', error);
      } finally {
        if (!cancelled) {
          setIsLoadingConfig(false);
        }
      }
    };

    loadConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateService = async (service, data) => {
    const next = {
      ...config[service],
      ...data,
    };

    setConfig((prev) => ({
      ...prev,
      [service]: next,
    }));

    try {
      await appConfigApi.updateService(service, next);
    } catch (error) {
      console.error(`Failed to save config for ${service}`, error);
      throw error;
    }
  };

  const updateQualityPreferences = async (nextPreferences) => {
    setQualityPreferences(nextPreferences);

    try {
      await appConfigApi.updateQualityPreferences(nextPreferences);
    } catch (error) {
      console.error('Failed to save quality preferences', error);
      throw error;
    }
  };

  const updatePosterDisplayPreferences = async (nextPreferences) => {
    const normalized = { ...defaultPosterDisplayPreferences, ...nextPreferences };
    setPosterDisplayPreferences(normalized);

    try {
      await appConfigApi.updatePosterDisplayPreferences(normalized);
    } catch (error) {
      console.error('Failed to save poster display preferences', error);
      throw error;
    }
  };

  const updateOptimizationPreferences = async (nextPreferences) => {
    const normalized = { ...defaultOptimizationPreferences, ...nextPreferences };
    setOptimizationPreferences(normalized);

    try {
      await appConfigApi.updateOptimizationPreferences(normalized);
    } catch (error) {
      console.error('Failed to save optimization preferences', error);
      throw error;
    }
  };

  const updateTvCleanupPreferences = async (nextPreferences) => {
    const normalized = { ...defaultTvCleanupPreferences, ...nextPreferences, shows: nextPreferences?.shows || {} };
    setTvCleanupPreferences(normalized);

    try {
      await appConfigApi.updateTvCleanupPreferences(normalized);
    } catch (error) {
      console.error('Failed to save TV cleanup preferences', error);
      throw error;
    }
  };

  const getService = (service) => config[service];

  const isServiceReady = (service) => {
    const s = config[service];
    return s && s.enabled && s.url && s.apiKey;
  };

  return {
    config,
    qualityPreferences,
    posterDisplayPreferences,
    optimizationPreferences,
    tvCleanupPreferences,
    isLoadingConfig,
    updateService,
    updateQualityPreferences,
    updatePosterDisplayPreferences,
    updateOptimizationPreferences,
    updateTvCleanupPreferences,
    getService,
    isServiceReady,
  };
}
