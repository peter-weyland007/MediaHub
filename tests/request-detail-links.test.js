import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { getRequestDetailPath } from '../src/lib/requestDisplay.js';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('request detail path resolves local movie and tv detail routes when library matches exist', () => {
  const movieRequest = { type: 'movie', media: { tmdbId: 440 } };
  const tvRequest = { type: 'tv', media: { tvdbId: 71177, tmdbId: 2177 } };

  const movieLookup = new Map([[440, 91]]);
  const tvLookup = new Map([[71177, 13], [2177, 13]]);

  assert.equal(getRequestDetailPath(movieRequest, movieLookup, tvLookup), '/movies/91');
  assert.equal(getRequestDetailPath(tvRequest, movieLookup, tvLookup), '/tv-shows/13');
});

test('request detail path returns null when no local library match exists', () => {
  const request = { type: 'movie', media: { tmdbId: 999999 } };
  assert.equal(getRequestDetailPath(request, new Map(), new Map()), null);
});

test('Requests page links request headlines to local detail routes when available', () => {
  const source = read('src/pages/Requests.jsx');

  assert.match(source, /getRequestDetailPath/);
  assert.match(source, /Link/);
  assert.match(source, /radarrApi\.getMovies/);
  assert.match(source, /sonarrApi\.getSeries/);
  assert.match(source, /to=\{detailPath\}/);
});
