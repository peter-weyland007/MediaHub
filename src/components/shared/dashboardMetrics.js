/** @typedef {{ title?: string, originalTitle?: string, cleanTitle?: string }} DashboardMovie */
/** @typedef {{ title?: string, cleanTitle?: string }} DashboardSeries */
/** @typedef {{ title?: string, full_title?: string, original_title?: string, grandparent_title?: string, parent_title?: string }} DashboardHistoryRow */

const normalizeTitleToken = (value) => String(value || '').trim().toLowerCase();

const deriveSeriesTitleFromRow = (row = {}) => {
  const direct = normalizeTitleToken(row.grandparent_title || row.original_title || row.parent_title);
  if (direct) {
    return direct;
  }

  const fullTitle = String(row.full_title || '').trim();
  const episodeTitle = String(row.title || '').trim();
  if (fullTitle && episodeTitle) {
    const suffix = ` - ${episodeTitle}`;
    if (fullTitle.endsWith(suffix)) {
      return normalizeTitleToken(fullTitle.slice(0, -suffix.length));
    }
  }

  return '';
};

const formatWatchPercentage = (watchedCount, totalCount) => {
  if (!totalCount) {
    return '0%';
  }

  return `${Math.round((watchedCount / totalCount) * 100)}%`;
};

const formatWatchDisplay = (watchedCount, totalCount) => `${watchedCount} (${formatWatchPercentage(watchedCount, totalCount)})`;

/**
 * @param {DashboardMovie[]} [movies]
 * @param {DashboardHistoryRow[]} [historyRows]
 */
export function buildMovieWatchStats(movies = [], historyRows = []) {
  const watchedTitles = new Set(
    historyRows
      .flatMap((row) => [row.title, row.full_title, row.original_title])
      .map((value) => normalizeTitleToken(value))
      .filter(Boolean),
  );

  const watchedCount = movies.filter((movie) => (
    [movie.title, movie.originalTitle, movie.cleanTitle]
      .map((value) => normalizeTitleToken(value))
      .filter(Boolean)
      .some((title) => watchedTitles.has(title))
  )).length;

  return {
    totalCount: movies.length,
    watchedCount,
    watchedPercentage: formatWatchPercentage(watchedCount, movies.length),
    watchedDisplay: formatWatchDisplay(watchedCount, movies.length),
  };
}

/**
 * @param {DashboardSeries[]} [series]
 * @param {DashboardHistoryRow[]} [historyRows]
 */
export function buildSeriesWatchStats(series = [], historyRows = []) {
  const watchedTitles = new Set(
    historyRows
      .map((row) => deriveSeriesTitleFromRow(row))
      .filter(Boolean),
  );

  const watchedCount = series.filter((show) => (
    [show.title, show.cleanTitle]
      .map((value) => normalizeTitleToken(value))
      .filter(Boolean)
      .some((title) => watchedTitles.has(title))
  )).length;

  return {
    totalCount: series.length,
    watchedCount,
    watchedPercentage: formatWatchPercentage(watchedCount, series.length),
    watchedDisplay: formatWatchDisplay(watchedCount, series.length),
  };
}
