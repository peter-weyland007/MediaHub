import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_MOVIE_CLEANUP_PREFERENCES,
  buildMovieCleanupPlan,
  getMovieCleanupMode,
  getMovieHistoryBucketKey,
  normalizeMovieCleanupPreferences,
} from '../src/components/shared/movieCleanup.js';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('movie cleanup preferences normalize defaults and opt-in per-movie modes safely', () => {
  const normalized = normalizeMovieCleanupPreferences({
    watchedThresholdPercent: 95,
    waitDays: 5,
    movies: {
      '13': { mode: 'delete-unmonitor' },
      '42': { mode: 'keep-all' },
      '100': { mode: 'bad-mode' },
    },
  });

  assert.equal(normalized.watchedThresholdPercent, 95);
  assert.equal(normalized.waitDays, 5);
  assert.equal(normalized.movies['13'].mode, 'delete-unmonitor');
  assert.equal(normalized.movies['42'].mode, 'keep-all');
  assert.equal(normalized.movies['100'].mode, 'keep-all');
  assert.deepEqual(normalizeMovieCleanupPreferences({}), DEFAULT_MOVIE_CLEANUP_PREFERENCES);
});

test('movie cleanup helpers mark only opted-in watched movies as eligible for delete and unmonitor', () => {
  const movie = {
    id: 13,
    title: 'Planet Earth',
    year: 2006,
    hasFile: true,
    monitored: true,
    movieFile: { id: 336 },
  };

  const matchingRow = {
    full_title: 'Planet Earth',
    title: 'Planet Earth',
    year: 2006,
    percent_complete: 100,
    watched_status: 1,
    stopped: Math.floor((Date.now() - (4 * 24 * 60 * 60 * 1000)) / 1000),
  };

  const nonMatchingRow = {
    full_title: 'Planet Earth II',
    title: 'Planet Earth II',
    year: 2016,
    percent_complete: 100,
    watched_status: 1,
    stopped: Math.floor(Date.now() / 1000),
  };

  assert.equal(getMovieHistoryBucketKey({ full_title: 'Planet Earth', year: 2006 }), 'planet earth::2006');
  assert.equal(getMovieHistoryBucketKey({ title: 'Planet Earth', year: 2006 }), 'planet earth::2006');
  assert.equal(getMovieHistoryBucketKey({ title: '', year: 2006 }), '');

  const deletePlan = buildMovieCleanupPlan({
    movie,
    policyMode: 'delete-unmonitor',
    historyRows: [matchingRow, nonMatchingRow],
    watchedThresholdPercent: 90,
    waitDays: 3,
    now: Date.now(),
  });

  assert.equal(deletePlan.isWatched, true);
  assert.equal(deletePlan.isEligible, true);
  assert.equal(deletePlan.shouldDeleteFile, true);
  assert.equal(deletePlan.shouldUnmonitor, true);
  assert.equal(deletePlan.matchingHistory.length, 1);

  const keepPlan = buildMovieCleanupPlan({
    movie,
    policyMode: 'keep-all',
    historyRows: [matchingRow],
    watchedThresholdPercent: 90,
    waitDays: 3,
    now: Date.now(),
  });

  assert.equal(keepPlan.isWatched, true);
  assert.equal(keepPlan.isEligible, false);
  assert.equal(keepPlan.shouldDeleteFile, false);
  assert.equal(keepPlan.shouldUnmonitor, false);
  assert.equal(getMovieCleanupMode({ movies: { '13': { mode: 'delete-unmonitor' } } }, 13), 'delete-unmonitor');
  assert.equal(getMovieCleanupMode({}, 13), 'keep-all');
});

test('movie watched cleanup source wiring persists opt-in preferences and exposes one-and-done controls in movie details', () => {
  const databaseSource = read('server/database.js');
  const appSource = read('server/app.js');
  const appConfigApiSource = read('src/lib/appConfigApi.js');
  const configHookSource = read('src/lib/useServiceConfig.js');
  const serviceApiSource = read('src/lib/serviceApi.js');
  const movieDetailsSource = read('src/pages/MovieDetails.jsx');

  assert.match(databaseSource, /DEFAULT_MOVIE_CLEANUP_PREFERENCES/);
  assert.match(databaseSource, /MOVIE_CLEANUP_PREFERENCES_KEY/);
  assert.match(databaseSource, /saveMovieCleanupPreferences\(preferences = \{\}\)/);
  assert.match(appSource, /\/api\/app-config\/movie-cleanup-preferences/);
  assert.match(appConfigApiSource, /updateMovieCleanupPreferences\(movieCleanupPreferences\)/);
  assert.match(configHookSource, /movieCleanupPreferences/);
  assert.match(configHookSource, /updateMovieCleanupPreferences/);
  assert.match(serviceApiSource, /updateMoviesMonitored/);
  assert.match(serviceApiSource, /deleteMovieFile/);

  assert.match(movieDetailsSource, /One-and-done/);
  assert.match(movieDetailsSource, /Delete file \+ unmonitor after watched/);
  assert.match(movieDetailsSource, /const \[oneAndDoneOpen, setOneAndDoneOpen\] = useState\(false\)/);
  assert.match(movieDetailsSource, /<Collapsible open=\{oneAndDoneOpen\} onOpenChange=\{setOneAndDoneOpen\}>/);
  assert.match(movieDetailsSource, /\{oneAndDoneOpen \? 'Hide' : 'Show'\}/);
  assert.match(movieDetailsSource, /toast\.success\(`Saved cleanup policy: \$\{savedLabel\}`\)/);
  assert.match(movieDetailsSource, /toast\.success\(`Applied movie cleanup: \$\{cleanupActionLabel\}`\)/);
});
