import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('request display prefers hydrated detail titles when request list media is sparse', async () => {
  const { formatRequestHeadline, formatRequestMeta } = await import('../src/lib/requestDisplay.js');

  const movieRequest = {
    id: 456,
    type: 'movie',
    media: { tmdbId: 440, title: null, name: null, releaseDate: null },
    mediaDetails: { title: 'Aliens vs Predator: Requiem', releaseDate: '2007-12-25' },
  };

  const tvRequest = {
    id: 455,
    type: 'tv',
    media: { tmdbId: 2177, title: null, name: null, firstAirDate: null },
    mediaDetails: { name: 'Land of the Lost', firstAirDate: '1974-09-07' },
  };

  assert.equal(formatRequestHeadline(movieRequest), 'Aliens vs Predator: Requiem');
  assert.equal(formatRequestMeta(movieRequest), 'Movie • 2007 • Request #456');
  assert.equal(formatRequestHeadline(tvRequest), 'Land of the Lost');
  assert.equal(formatRequestMeta(tvRequest), 'Series • 1974 • Request #455');
});

test('request fetching hydrates sparse Overseerr rows from detail endpoints', () => {
  const mediaQueriesSource = read('src/lib/mediaQueries.js');
  const serviceApiSource = read('src/lib/serviceApi.js');

  assert.match(serviceApiSource, /getMovieDetails:\s*\(config, tmdbId\) => overseerrApi\.get\(config, `\/movie\/\$\{tmdbId\}`\)/);
  assert.match(serviceApiSource, /getTvDetails:\s*\(config, tmdbId\) => overseerrApi\.get\(config, `\/tv\/\$\{tmdbId\}`\)/);
  assert.match(mediaQueriesSource, /Promise\.allSettled\(/);
  assert.match(mediaQueriesSource, /overseerrApi\.getMovieDetails/);
  assert.match(mediaQueriesSource, /overseerrApi\.getTvDetails/);
  assert.match(mediaQueriesSource, /mediaDetails/);
});
