import { useState, useEffect } from 'react';

const STORAGE_KEY = 'media_hub_config';

const defaultConfig = {
  radarr: { url: '', apiKey: '', enabled: false },
  sonarr: { url: '', apiKey: '', enabled: false },
  lidarr: { url: '', apiKey: '', enabled: false },
  overseerr: { url: '', apiKey: '', enabled: false },
  plex: { url: '', apiKey: '', enabled: false },
  prowlarr: { url: '', apiKey: '', enabled: false },
};

export function useServiceConfig() {
  const [config, setConfig] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaultConfig, ...JSON.parse(stored) };
    }
    return defaultConfig;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }, [config]);

  const updateService = (service, data) => {
    setConfig(prev => ({
      ...prev,
      [service]: { ...prev[service], ...data }
    }));
  };

  const getService = (service) => config[service];

  const isServiceReady = (service) => {
    const s = config[service];
    return s && s.enabled && s.url && s.apiKey;
  };

  return { config, updateService, getService, isServiceReady };
}