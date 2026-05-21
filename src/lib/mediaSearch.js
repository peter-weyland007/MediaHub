const normalizeSearchTerm = (value) => String(value || '').trim().toLowerCase();

const collectSearchFields = (values) => values
  .flatMap((value) => (Array.isArray(value) ? value : [value]))
  .filter((value) => value !== null && value !== undefined)
  .map((value) => String(value).toLowerCase());

const filterBySearchTerm = (items, query, getFields) => {
  const normalizedQuery = normalizeSearchTerm(query);
  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => collectSearchFields(getFields(item)).some((field) => field.includes(normalizedQuery)));
};

export const filterMoviesForDisplay = (movies, query) => filterBySearchTerm(movies, query, (movie) => [
  movie?.title,
  movie?.sortTitle,
  movie?.originalTitle,
  movie?.year,
  movie?.path,
  movie?.studio,
]);

export const filterTvShowsForDisplay = (shows, query) => filterBySearchTerm(shows, query, (show) => [
  show?.title,
  show?.sortTitle,
  show?.year,
  show?.network,
  show?.path,
  show?.status,
]);

export const filterMusicArtistsForDisplay = (artists, query) => filterBySearchTerm(artists, query, (artist) => [
  artist?.artistName,
  artist?.sortName,
  artist?.path,
  artist?.foreignArtistId,
]);

export const filterOptimizationItemsForDisplay = (items, query) => filterBySearchTerm(items, query, (item) => [
  item?.title,
  item?.sortTitle,
  item?.originalTitle,
  item?.year,
  item?.path,
  item?.network,
  item?.studio,
  item?.currentQuality,
  item?.preferredProfile,
  item?.remediation?.label,
]);
