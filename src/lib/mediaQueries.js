import {
  bazarrApi,
  lidarrApi,
  overseerrApi,
  plexApi,
  prowlarrApi,
  radarrApi,
  sonarrApi,
  tautulliApi,
} from '@/lib/serviceApi';

export const getServiceCacheKey = (serviceConfig) => ([
  serviceConfig?.url || '',
  serviceConfig?.apiKey || '',
  Boolean(serviceConfig?.enabled),
]);

const isReady = (serviceConfig) => Boolean(serviceConfig?.enabled && serviceConfig?.url && serviceConfig?.apiKey);

export async function fetchDashboardData(config) {
  const statuses = {};
  const stats = {};
  const queue = [];
  const checks = [];

  if (isReady(config.radarr)) {
    checks.push(
      radarrApi.getMovies(config.radarr)
        .then((movies) => {
          statuses.radarr = 'connected';
          const downloaded = movies.filter((movie) => movie.hasFile).length;
          stats.radarr = [
            { label: 'Movies', value: movies.length },
            { label: 'Downloaded', value: downloaded },
          ];
        })
        .catch(() => {
          statuses.radarr = 'error';
        }),
    );

    checks.push(
      radarrApi.getQueue(config.radarr)
        .then((response) => {
          (response.records || []).forEach((record) => {
            queue.push({
              title: record.title || record.movie?.title || 'Unknown',
              service: 'Radarr',
              status: record.status === 'completed' ? 'completed' : 'downloading',
              progress: record.sizeleft && record.size ? ((1 - record.sizeleft / record.size) * 100) : 0,
              size: record.size ? `${(record.size / 1073741824).toFixed(1)} GB` : null,
            });
          });
        })
        .catch(() => {}),
    );
  }

  if (isReady(config.sonarr)) {
    checks.push(
      sonarrApi.getSeries(config.sonarr)
        .then((series) => {
          statuses.sonarr = 'connected';
          stats.sonarr = [
            { label: 'Series', value: series.length },
            { label: 'Monitored', value: series.filter((item) => item.monitored).length },
          ];
        })
        .catch(() => {
          statuses.sonarr = 'error';
        }),
    );

    checks.push(
      sonarrApi.getQueue(config.sonarr)
        .then((response) => {
          (response.records || []).forEach((record) => {
            queue.push({
              title: record.title || record.series?.title || 'Unknown',
              service: 'Sonarr',
              status: record.status === 'completed' ? 'completed' : 'downloading',
              progress: record.sizeleft && record.size ? ((1 - record.sizeleft / record.size) * 100) : 0,
              size: record.size ? `${(record.size / 1073741824).toFixed(1)} GB` : null,
            });
          });
        })
        .catch(() => {}),
    );
  }

  if (isReady(config.lidarr)) {
    checks.push(
      lidarrApi.getArtists(config.lidarr)
        .then((artists) => {
          statuses.lidarr = 'connected';
          stats.lidarr = [
            { label: 'Artists', value: artists.length },
            { label: 'Monitored', value: artists.filter((artist) => artist.monitored).length },
          ];
        })
        .catch(() => {
          statuses.lidarr = 'error';
        }),
    );
  }

  if (isReady(config.bazarr)) {
    checks.push(
      Promise.all([
        bazarrApi.getMovies(config.bazarr),
        bazarrApi.getSeries(config.bazarr),
      ])
        .then(([moviesResponse, seriesResponse]) => {
          const movies = Array.isArray(moviesResponse) ? moviesResponse : (moviesResponse?.data ?? []);
          const series = Array.isArray(seriesResponse) ? seriesResponse : (seriesResponse?.data ?? []);
          statuses.bazarr = 'connected';
          stats.bazarr = [
            { label: 'Movies', value: movies.length },
            { label: 'Series', value: series.length },
          ];
        })
        .catch(() => {
          statuses.bazarr = 'error';
        }),
    );
  }

  if (isReady(config.tautulli)) {
    checks.push(
      tautulliApi.getActivity(config.tautulli)
        .then((activity) => {
          statuses.tautulli = 'connected';
          stats.tautulli = [
            { label: 'Streams', value: Number(activity.stream_count || 0) },
            { label: 'Transcodes', value: Number(activity.stream_count_transcode || 0) },
          ];
        })
        .catch(() => {
          statuses.tautulli = 'error';
        }),
    );
  }

  if (isReady(config.overseerr)) {
    checks.push(
      overseerrApi.getRequestCount(config.overseerr)
        .then((counts) => {
          statuses.overseerr = 'connected';
          stats.overseerr = [
            { label: 'Pending', value: counts.pending || 0 },
            { label: 'Approved', value: counts.approved || 0 },
          ];
        })
        .catch(() => {
          statuses.overseerr = 'error';
        }),
    );
  }

  if (isReady(config.plex)) {
    checks.push(
      plexApi.getLibraries(config.plex)
        .then((data) => {
          statuses.plex = 'connected';
          const libraries = data?.MediaContainer?.Directory || [];
          stats.plex = [
            { label: 'Libraries', value: libraries.length },
            { label: 'Items', value: libraries.reduce((sum, library) => sum + (parseInt(library.count, 10) || 0), 0) },
          ];
        })
        .catch(() => {
          statuses.plex = 'error';
        }),
    );
  }

  if (isReady(config.prowlarr)) {
    checks.push(
      prowlarrApi.getIndexers(config.prowlarr)
        .then((indexers) => {
          statuses.prowlarr = 'connected';
          stats.prowlarr = [
            { label: 'Indexers', value: indexers.length },
            { label: 'Active', value: indexers.filter((item) => item.enable).length },
          ];
        })
        .catch(() => {
          statuses.prowlarr = 'error';
        }),
    );
  }

  await Promise.allSettled(checks);

  for (const service of ['radarr', 'sonarr', 'lidarr', 'bazarr', 'tautulli', 'overseerr', 'plex', 'prowlarr']) {
    if (!isReady(config[service]) && !statuses[service]) {
      statuses[service] = 'unconfigured';
    }
  }

  return { statuses, stats, queue };
}

export const fetchMovieReferenceData = async (radarrConfig) => {
  const [rootFolders, qualityProfiles] = await Promise.all([
    radarrApi.getRootFolders(radarrConfig),
    radarrApi.getQualityProfiles(radarrConfig),
  ]);

  return {
    rootFolders,
    qualityProfiles,
  };
};

export const fetchTvReferenceData = async (sonarrConfig) => {
  const [rootFolders, qualityProfiles] = await Promise.all([
    sonarrApi.getRootFolders(sonarrConfig),
    sonarrApi.getQualityProfiles(sonarrConfig),
  ]);

  return {
    rootFolders,
    qualityProfiles,
  };
};

export const fetchMovieDetailsData = async (radarrConfig, id) => {
  const [movie, files] = await Promise.all([
    radarrApi.getMovie(radarrConfig, id),
    radarrApi.getMovieFiles(radarrConfig, id),
  ]);

  return {
    ...movie,
    movieFile: Array.isArray(files) && files.length > 0 ? files[0] : movie.movieFile,
  };
};

export const fetchTvShowDetailsData = async (sonarrConfig, tautulliConfig, id, includeHistory) => {
  const requests = [
    sonarrApi.getSeriesById(sonarrConfig, id),
    sonarrApi.getEpisodes(sonarrConfig, id),
    sonarrApi.getEpisodeFiles(sonarrConfig, id),
  ];

  if (includeHistory) {
    requests.push(tautulliApi.getHistory(tautulliConfig, { media_type: 'episode', length: '500' }));
  }

  const [series, episodes, episodeFiles, historyRows = []] = await Promise.all(requests);

  return {
    series,
    episodes: Array.isArray(episodes) ? episodes : [],
    episodeFiles: Array.isArray(episodeFiles) ? episodeFiles : [],
    historyRows: Array.isArray(historyRows) ? historyRows : [],
  };
};

export const fetchPlexLibrariesData = async (plexConfig) => {
  const librariesResponse = await plexApi.getLibraries(plexConfig);
  return librariesResponse?.MediaContainer?.Directory || [];
};

export const fetchPlexLibraryContentData = async (plexConfig, sectionId) => {
  const contentResponse = await plexApi.getLibraryContent(plexConfig, sectionId);
  return contentResponse?.MediaContainer?.Metadata || [];
};

export const fetchPlexSessionsData = async (plexConfig) => {
  const sessionsResponse = await plexApi.getSessions(plexConfig).catch(() => ({ MediaContainer: { Metadata: [] } }));
  return sessionsResponse?.MediaContainer?.Metadata || [];
};

export const fetchPlexLibraryLinksData = async (radarrConfig, sonarrConfig, radarrReady, sonarrReady) => {
  const [radarrMovies, sonarrSeries] = await Promise.all([
    radarrReady ? radarrApi.getMovies(radarrConfig) : Promise.resolve([]),
    sonarrReady ? sonarrApi.getSeries(sonarrConfig) : Promise.resolve([]),
  ]);

  return {
    radarrMovies: Array.isArray(radarrMovies) ? radarrMovies : [],
    sonarrSeries: Array.isArray(sonarrSeries) ? sonarrSeries : [],
  };
};

export const fetchRequestsData = async (overseerrConfig) => {
  const requestsResponse = await overseerrApi.getRequests(overseerrConfig);
  return requestsResponse?.results || [];
};

export const fetchIndexersData = async (prowlarrConfig) => {
  const indexersResponse = await prowlarrApi.getIndexers(prowlarrConfig);
  return Array.isArray(indexersResponse) ? indexersResponse : [];
};
