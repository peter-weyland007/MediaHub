import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('app config exposes persisted media browser preferences update path', () => {
  const appConfigApiSource = read('src/lib/appConfigApi.js');
  const useServiceConfigSource = read('src/lib/useServiceConfig.js');
  const serverAppSource = read('server/app.js');
  const databaseSource = read('server/database.js');

  assert.match(appConfigApiSource, /updateMediaBrowserPreferences/);
  assert.match(appConfigApiSource, /\/api\/app-config\/media-browser-preferences/);
  assert.match(useServiceConfigSource, /mediaBrowserPreferences/);
  assert.match(useServiceConfigSource, /updateMediaBrowserPreferences/);
  assert.match(serverAppSource, /\/api\/app-config\/media-browser-preferences/);
  assert.match(databaseSource, /mediaBrowserPreferences/);
  assert.match(databaseSource, /saveMediaBrowserPreferences/);
});

test('Movies and TV pages support a saved browse-table toggle plus sortable table mode', () => {
  for (const relativePath of ['src/pages/Movies.jsx', 'src/pages/TvShows.jsx']) {
    const source = read(relativePath);
    assert.match(source, /mediaBrowserPreferences/);
    assert.match(source, /updateMediaBrowserPreferences/);
    assert.match(source, /viewMode/);
    assert.match(source, /Table/);
    assert.match(source, /Browse/);
    assert.match(source, /sortBy/);
    assert.match(source, /sort/);
    assert.match(source, /TableHeader/);
    assert.match(source, /TableBody/);
    assert.match(source, /TableRow/);
  }
});

test('Movies table runtime column uses runtime severity helpers for color-coded delta cues', () => {
  const source = read('src/pages/Movies.jsx');
  assert.match(source, /getMovieRuntimeIssue/);
  assert.match(source, /getMovieRuntimeSeverity/);
  assert.match(source, /Delta \{runtimeIssue\.delta\}/);
});

test('Movies and TV pages expose a visible library search input wired into display filtering', () => {
  const expectations = [
    ['src/pages/Movies.jsx', /Search library\.\.\./, /librarySearchTerm/, /filterMoviesForDisplay/],
    ['src/pages/TvShows.jsx', /Search library\.\.\./, /librarySearchTerm/, /filterTvShowsForDisplay/],
  ];

  for (const [relativePath, placeholderPattern, statePattern, helperPattern] of expectations) {
    const source = read(relativePath);
    assert.match(source, placeholderPattern);
    assert.match(source, statePattern);
    assert.match(source, helperPattern);
  }
});
