import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterMoviesForDisplay,
  filterTvShowsForDisplay,
  filterMusicArtistsForDisplay,
} from '../src/lib/mediaSearch.js';

test('movie library search matches title, year, and path case-insensitively', () => {
  const movies = [
    { title: 'Alien', year: 1979, path: '/media/movies/Alien (1979)' },
    { title: 'Blade Runner', year: 1982, path: '/media/movies/Blade Runner (1982)' },
    { title: 'Aliens', year: 1986, path: '/vault/cameron/aliens' },
  ];

  assert.deepEqual(filterMoviesForDisplay(movies, 'alien').map((movie) => movie.title), ['Alien', 'Aliens']);
  assert.deepEqual(filterMoviesForDisplay(movies, '1982').map((movie) => movie.title), ['Blade Runner']);
  assert.deepEqual(filterMoviesForDisplay(movies, 'cameron').map((movie) => movie.title), ['Aliens']);
});

test('tv library search matches title, network, and year case-insensitively', () => {
  const series = [
    { title: 'Severance', year: 2022, network: 'Apple TV+' },
    { title: 'The Last of Us', year: 2023, network: 'HBO' },
    { title: 'Andor', year: 2022, network: 'Disney+' },
  ];

  assert.deepEqual(filterTvShowsForDisplay(series, 'apple').map((show) => show.title), ['Severance']);
  assert.deepEqual(filterTvShowsForDisplay(series, '2022').map((show) => show.title), ['Severance', 'Andor']);
  assert.deepEqual(filterTvShowsForDisplay(series, 'last').map((show) => show.title), ['The Last of Us']);
});

test('music library search matches artist names and paths case-insensitively', () => {
  const artists = [
    { artistName: 'The Beatles', path: '/music/The Beatles' },
    { artistName: 'Daft Punk', path: '/music/electronic/Daft Punk' },
    { artistName: 'Hans Zimmer', path: '/scores/Hans Zimmer' },
  ];

  assert.deepEqual(filterMusicArtistsForDisplay(artists, 'daft').map((artist) => artist.artistName), ['Daft Punk']);
  assert.deepEqual(filterMusicArtistsForDisplay(artists, 'zimmer').map((artist) => artist.artistName), ['Hans Zimmer']);
  assert.deepEqual(filterMusicArtistsForDisplay(artists, 'music').map((artist) => artist.artistName), ['The Beatles', 'Daft Punk']);
});
