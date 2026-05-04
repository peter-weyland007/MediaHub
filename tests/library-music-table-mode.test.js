import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  defaultMediaBrowserPreferences,
  normalizeMediaBrowserPreferences,
  sortMusicArtistsForDisplay,
  sortLibraryItemsForDisplay,
} from '../src/lib/mediaBrowserPreferences.js';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('media browser preferences include saved Library and Music view/sort defaults', () => {
  assert.deepEqual(defaultMediaBrowserPreferences, {
    movies: { viewMode: 'browse', sortBy: 'title-asc' },
    tvShows: { viewMode: 'browse', sortBy: 'title-asc' },
    music: { viewMode: 'browse', sortBy: 'title-asc' },
    library: { viewMode: 'browse', sortBy: 'title-asc' },
  });

  assert.deepEqual(normalizeMediaBrowserPreferences({
    music: { viewMode: 'table', sortBy: 'albums-desc' },
    library: { viewMode: 'table', sortBy: 'year-desc' },
  }), {
    movies: { viewMode: 'browse', sortBy: 'title-asc' },
    tvShows: { viewMode: 'browse', sortBy: 'title-asc' },
    music: { viewMode: 'table', sortBy: 'albums-desc' },
    library: { viewMode: 'table', sortBy: 'year-desc' },
  });
});

test('music and library sorting helpers support table-mode scan orders', () => {
  const artists = [
    { artistName: 'Zulu', monitored: true, statistics: { albumCount: 5 } },
    { artistName: 'Alpha', monitored: false, statistics: { albumCount: 10 } },
    { artistName: 'Bravo', monitored: true, statistics: { albumCount: 2 } },
  ];

  assert.deepEqual(sortMusicArtistsForDisplay(artists, 'title-asc').map((artist) => artist.artistName), ['Alpha', 'Bravo', 'Zulu']);
  assert.deepEqual(sortMusicArtistsForDisplay(artists, 'albums-desc').map((artist) => artist.artistName), ['Alpha', 'Zulu', 'Bravo']);

  const items = [
    { title: 'Zulu', year: 2001, type: 'movie', parentTitle: '' },
    { title: 'Alpha', year: 2024, type: 'show', parentTitle: '' },
    { title: 'Bravo', year: 1999, type: 'track', parentTitle: 'Album X' },
  ];

  assert.deepEqual(sortLibraryItemsForDisplay(items, 'title-asc').map((item) => item.title), ['Alpha', 'Bravo', 'Zulu']);
  assert.deepEqual(sortLibraryItemsForDisplay(items, 'year-desc').map((item) => item.title), ['Alpha', 'Zulu', 'Bravo']);
});

test('Library and Music pages support saved browse-table toggles and table layouts', () => {
  for (const relativePath of ['src/pages/PlexLibrary.jsx', 'src/pages/MusicPage.jsx']) {
    const source = read(relativePath);
    assert.match(source, /mediaBrowserPreferences/);
    assert.match(source, /updateMediaBrowserPreferences/);
    assert.match(source, /viewMode/);
    assert.match(source, /Table/);
    assert.match(source, /Browse/);
    assert.match(source, /sortBy/);
    assert.match(source, /TableHeader/);
    assert.match(source, /TableBody/);
    assert.match(source, /TableRow/);
  }
});

test('Music page exposes a visible library search input wired into display filtering', () => {
  const source = read('src/pages/MusicPage.jsx');
  assert.match(source, /Search library\.\.\./);
  assert.match(source, /librarySearchTerm/);
  assert.match(source, /filterMusicArtistsForDisplay/);
});
