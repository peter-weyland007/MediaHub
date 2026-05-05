/** @typedef {{ id?: number, title?: string, year?: number, images?: Array<{ coverType?: string, remoteUrl?: string, url?: string }>, seasons?: Array<{ seasonNumber?: number }>, imdbId?: string, tvdbId?: number|string, titleSlug?: string }} Series */
/** @typedef {{ id?: number, seasonNumber?: number, episodeNumber?: number, episodeFileId?: number, hasFile?: boolean, monitored?: boolean, title?: string }} Episode */
/** @typedef {{ id?: number, mediaInfo?: { subtitles?: Array<string|{ language?: string, name?: string, title?: string }> | string }, language?: { name?: string } }} EpisodeFile */
/** @typedef {{ url?: string }} TvServiceConfig */

export function formatTvFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) {
    return '—';
  }

  return `${(size / (1024 ** 3)).toFixed(1)} GB`;
}

export function formatTvDate(value) {
  if (!value) {
    return 'Unknown';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleDateString();
}

/**
 * @param {Series} [series]
 * @param {TvServiceConfig} [serviceConfig]
 */
export function getPrimarySeriesImage(series = {}, serviceConfig = {}) {
  const images = Array.isArray(series.images) ? series.images : [];
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
 * @param {Series} [series]
 * @param {TvServiceConfig} [serviceConfig]
 */
export function buildSeriesExternalLinks(series = {}, serviceConfig = {}) {
  const sourcePathSegment = String(series.titleSlug || series.tvdbId || series.id || '').trim();

  return {
    sonarr: sourcePathSegment && serviceConfig.url ? `${serviceConfig.url.replace(/\/$/, '')}/series/${sourcePathSegment}` : '',
    imdb: series.imdbId ? `https://www.imdb.com/title/${series.imdbId}/` : '',
    tvdb: series.tvdbId ? `https://thetvdb.com/dereferrer/series/${series.tvdbId}` : '',
  };
}

/**
 * @param {Episode} [episode]
 */
export function getEpisodeLabel(episode = {}) {
  const season = Number(episode.seasonNumber || 0);
  const number = Number(episode.episodeNumber || 0);
  return `S${String(season).padStart(2, '0')}E${String(number).padStart(2, '0')}`;
}

/**
 * @param {Episode} [episode]
 * @param {EpisodeFile | null} [episodeFile]
 */
export function getEpisodeDownloadStatus(episode = {}, episodeFile = null) {
  if (episodeFile || episode.hasFile) {
    return 'Downloaded';
  }

  if (episode.monitored === false) {
    return 'Unmonitored';
  }

  return 'Missing';
}

/**
 * @param {EpisodeFile} [episodeFile]
 * @returns {string[]}
 */
export function getEpisodeSubtitleItems(episodeFile = {}) {
  const rawItems = episodeFile?.mediaInfo?.subtitles;
  if (Array.isArray(rawItems)) {
    return rawItems
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        return item?.language || item?.name || item?.title || '';
      })
      .filter(Boolean);
  }

  if (typeof rawItems === 'string' && rawItems.trim()) {
    return [rawItems.trim()];
  }

  const language = episodeFile?.language?.name;
  return language ? [language] : [];
}

/**
 * @param {Series} [series]
 * @param {Episode[]} [episodes]
 * @param {EpisodeFile[]} [episodeFiles]
 */
export function buildSeasonRows(series = {}, episodes = [], episodeFiles = []) {
  const fileMap = new Map(episodeFiles.map((file) => [Number(file.id), file]));
  const countsBySeason = new Map();

  episodes.forEach((episode) => {
    const season = Number(episode.seasonNumber || 0);
    const existing = countsBySeason.get(season) || { total: 0, downloaded: 0, monitored: 0 };
    const episodeFile = fileMap.get(Number(episode.episodeFileId));

    existing.total += 1;
    if (episode.monitored !== false) {
      existing.monitored += 1;
    }
    if (episode.hasFile || episodeFile) {
      existing.downloaded += 1;
    }

    countsBySeason.set(season, existing);
  });

  const sourceSeasons = Array.isArray(series.seasons) && series.seasons.length > 0
    ? series.seasons
    : Array.from(countsBySeason.keys()).map((seasonNumber) => ({ seasonNumber }));

  return sourceSeasons
    .filter((season) => Number(season.seasonNumber) >= 0)
    .map((season) => {
      const seasonNumber = Number(season.seasonNumber || 0);
      const counts = countsBySeason.get(seasonNumber) || { total: 0, downloaded: 0, monitored: 0 };

      return {
        seasonNumber,
        title: seasonNumber === 0 ? 'Specials' : `Season ${seasonNumber}`,
        totalEpisodes: counts.total,
        downloadedEpisodes: counts.downloaded,
        monitoredEpisodes: counts.monitored,
      };
    })
    .sort((left, right) => left.seasonNumber - right.seasonNumber);
}
