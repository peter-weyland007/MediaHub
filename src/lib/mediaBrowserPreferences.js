export const movieSortOptions = [
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'year-desc', label: 'Newest year' },
  { value: 'year-asc', label: 'Oldest year' },
  { value: 'missing-first', label: 'Missing first' },
  { value: 'downloaded-first', label: 'Downloaded first' },
];

export const tvSortOptions = [
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'year-desc', label: 'Newest year' },
  { value: 'year-asc', label: 'Oldest year' },
  { value: 'continuing-first', label: 'Continuing first' },
  { value: 'episodes-desc', label: 'Most episodes' },
];

export const musicSortOptions = [
  { value: 'title-asc', label: 'Artist A–Z' },
  { value: 'title-desc', label: 'Artist Z–A' },
  { value: 'albums-desc', label: 'Most albums' },
  { value: 'monitored-first', label: 'Monitored first' },
];

export const librarySortOptions = [
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'year-desc', label: 'Newest year' },
  { value: 'year-asc', label: 'Oldest year' },
  { value: 'type-asc', label: 'Type' },
];

const allowedViewModes = ['browse', 'table'];
const allowedMovieSorts = movieSortOptions.map((option) => option.value);
const allowedTvSorts = tvSortOptions.map((option) => option.value);
const allowedMusicSorts = musicSortOptions.map((option) => option.value);
const allowedLibrarySorts = librarySortOptions.map((option) => option.value);

export const defaultMediaBrowserPreferences = {
  movies: { viewMode: 'browse', sortBy: 'title-asc' },
  tvShows: { viewMode: 'browse', sortBy: 'title-asc' },
  music: { viewMode: 'browse', sortBy: 'title-asc' },
  library: { viewMode: 'browse', sortBy: 'title-asc' },
};

const normalizeSection = (value = {}, allowedSorts = []) => ({
  viewMode: allowedViewModes.includes(value?.viewMode) ? value.viewMode : 'browse',
  sortBy: allowedSorts.includes(value?.sortBy) ? value.sortBy : 'title-asc',
});

export function normalizeMediaBrowserPreferences(preferences = {}) {
  return {
    movies: normalizeSection(preferences.movies, allowedMovieSorts),
    tvShows: normalizeSection(preferences.tvShows, allowedTvSorts),
    music: normalizeSection(preferences.music, allowedMusicSorts),
    library: normalizeSection(preferences.library, allowedLibrarySorts),
  };
}

const compareText = (left, right) => String(left || '').localeCompare(String(right || ''), undefined, { sensitivity: 'base' });
const compareNumber = (left, right) => Number(left || 0) - Number(right || 0);
const compareBoolean = (left, right) => Number(Boolean(left)) - Number(Boolean(right));
const getEpisodeCount = (show) => Number(show?.statistics?.episodeCount || 0);
const getAlbumCount = (artist) => Number(artist?.statistics?.albumCount || 0);
const getLibraryTypeLabel = (item) => item?.type || '';

export function sortMoviesForDisplay(movies = [], sortBy = defaultMediaBrowserPreferences.movies.sortBy) {
  const items = [...movies];

  items.sort((left, right) => {
    switch (sortBy) {
      case 'title-desc':
        return compareText(right?.title, left?.title);
      case 'year-desc':
        return compareNumber(right?.year, left?.year) || compareText(left?.title, right?.title);
      case 'year-asc':
        return compareNumber(left?.year, right?.year) || compareText(left?.title, right?.title);
      case 'missing-first':
        return compareBoolean(!right?.hasFile, !left?.hasFile) || compareText(left?.title, right?.title);
      case 'downloaded-first':
        return compareBoolean(right?.hasFile, left?.hasFile) || compareText(left?.title, right?.title);
      case 'title-asc':
      default:
        return compareText(left?.title, right?.title);
    }
  });

  return items;
}

export function sortTvShowsForDisplay(shows = [], sortBy = defaultMediaBrowserPreferences.tvShows.sortBy) {
  const items = [...shows];

  items.sort((left, right) => {
    switch (sortBy) {
      case 'title-desc':
        return compareText(right?.title, left?.title);
      case 'year-desc':
        return compareNumber(right?.year, left?.year) || compareText(left?.title, right?.title);
      case 'year-asc':
        return compareNumber(left?.year, right?.year) || compareText(left?.title, right?.title);
      case 'continuing-first':
        return compareBoolean(right?.status === 'continuing', left?.status === 'continuing') || compareText(left?.title, right?.title);
      case 'episodes-desc':
        return compareNumber(getEpisodeCount(right), getEpisodeCount(left)) || compareText(left?.title, right?.title);
      case 'title-asc':
      default:
        return compareText(left?.title, right?.title);
    }
  });

  return items;
}

export function sortMusicArtistsForDisplay(artists = [], sortBy = defaultMediaBrowserPreferences.music.sortBy) {
  const items = [...artists];

  items.sort((left, right) => {
    switch (sortBy) {
      case 'title-desc':
        return compareText(right?.artistName, left?.artistName);
      case 'albums-desc':
        return compareNumber(getAlbumCount(right), getAlbumCount(left)) || compareText(left?.artistName, right?.artistName);
      case 'monitored-first':
        return compareBoolean(right?.monitored, left?.monitored) || compareText(left?.artistName, right?.artistName);
      case 'title-asc':
      default:
        return compareText(left?.artistName, right?.artistName);
    }
  });

  return items;
}

export function sortLibraryItemsForDisplay(items = [], sortBy = defaultMediaBrowserPreferences.library.sortBy) {
  const rows = [...items];

  rows.sort((left, right) => {
    switch (sortBy) {
      case 'title-desc':
        return compareText(right?.title, left?.title);
      case 'year-desc':
        return compareNumber(right?.year, left?.year) || compareText(left?.title, right?.title);
      case 'year-asc':
        return compareNumber(left?.year, right?.year) || compareText(left?.title, right?.title);
      case 'type-asc':
        return compareText(getLibraryTypeLabel(left), getLibraryTypeLabel(right)) || compareText(left?.title, right?.title);
      case 'title-asc':
      default:
        return compareText(left?.title, right?.title);
    }
  });

  return rows;
}
