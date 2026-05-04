import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultMediaBrowserPreferences,
  normalizeMediaBrowserPreferences,
  sortMoviesForDisplay,
  sortTvShowsForDisplay,
} from '../src/lib/mediaBrowserPreferences.js';

test('media browser preferences normalize supported view and sort values with safe defaults', () => {
  assert.deepEqual(defaultMediaBrowserPreferences, {
    movies: { viewMode: 'browse', sortBy: 'title-asc' },
    tvShows: { viewMode: 'browse', sortBy: 'title-asc' },
    music: { viewMode: 'browse', sortBy: 'title-asc' },
    library: { viewMode: 'browse', sortBy: 'title-asc' },
  });

  assert.deepEqual(normalizeMediaBrowserPreferences({
    movies: { viewMode: 'table', sortBy: 'year-desc' },
    tvShows: { viewMode: 'weird', sortBy: 'nope' },
  }), {
    movies: { viewMode: 'table', sortBy: 'year-desc' },
    tvShows: { viewMode: 'browse', sortBy: 'title-asc' },
    music: { viewMode: 'browse', sortBy: 'title-asc' },
    library: { viewMode: 'browse', sortBy: 'title-asc' },
  });
});

test('movie sorting supports title, year, and missing-first views', () => {
  const movies = [
    { title: 'Zulu', year: 1999, hasFile: true, monitored: true },
    { title: 'Alpha', year: 2005, hasFile: false, monitored: true },
    { title: 'Bravo', year: 2001, hasFile: true, monitored: false },
  ];

  assert.deepEqual(sortMoviesForDisplay(movies, 'title-asc').map((movie) => movie.title), ['Alpha', 'Bravo', 'Zulu']);
  assert.deepEqual(sortMoviesForDisplay(movies, 'year-desc').map((movie) => movie.title), ['Alpha', 'Bravo', 'Zulu']);
  assert.deepEqual(sortMoviesForDisplay(movies, 'missing-first').map((movie) => movie.title), ['Alpha', 'Bravo', 'Zulu']);
});

test('tv sorting supports title, year, status, and episode progress views', () => {
  const shows = [
    { title: 'Zulu', year: 2019, status: 'ended', monitored: true, statistics: { episodeCount: 10, episodeFileCount: 10 } },
    { title: 'Alpha', year: 2023, status: 'continuing', monitored: true, statistics: { episodeCount: 8, episodeFileCount: 4 } },
    { title: 'Bravo', year: 2021, status: 'ended', monitored: false, statistics: { episodeCount: 12, episodeFileCount: 2 } },
  ];

  assert.deepEqual(sortTvShowsForDisplay(shows, 'title-asc').map((show) => show.title), ['Alpha', 'Bravo', 'Zulu']);
  assert.deepEqual(sortTvShowsForDisplay(shows, 'year-desc').map((show) => show.title), ['Alpha', 'Bravo', 'Zulu']);
  assert.deepEqual(sortTvShowsForDisplay(shows, 'continuing-first').map((show) => show.title), ['Alpha', 'Bravo', 'Zulu']);
  assert.deepEqual(sortTvShowsForDisplay(shows, 'episodes-desc').map((show) => show.title), ['Bravo', 'Zulu', 'Alpha']);
});
