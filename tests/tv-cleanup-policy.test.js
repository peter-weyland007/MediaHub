import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  DEFAULT_TV_CLEANUP_PREFERENCES,
  buildEpisodeCleanupPlan,
  getEpisodeHistoryBucketKey,
  getEpisodeIdentityKey,
  normalizeTvCleanupPreferences,
} from '../src/components/shared/tvCleanup.js';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('tv cleanup preferences normalize defaults, per-show modes, and manual overrides safely', () => {
  const normalized = normalizeTvCleanupPreferences({
    watchedThresholdPercent: 95,
    waitDays: 5,
    shows: {
      '13': { mode: 'delete-unmonitor' },
      '42': { mode: 'keep-all' },
      '100': { mode: 'nope' },
    },
    manualOverrides: {
      '1883::1::2': { watched: true, source: 'manual', watchedAt: '2026-05-01T12:00:00.000Z' },
      '1883::1::3': { watched: false },
    },
  });

  assert.equal(normalized.watchedThresholdPercent, 95);
  assert.equal(normalized.waitDays, 5);
  assert.equal(normalized.shows['13'].mode, 'delete-unmonitor');
  assert.equal(normalized.shows['42'].mode, 'keep-all');
  assert.equal(normalized.shows['100'].mode, 'keep-all');
  assert.equal(normalized.manualOverrides['1883::1::2'].watched, true);
  assert.equal(normalized.manualOverrides['1883::1::2'].source, 'manual');
  assert.equal(normalized.manualOverrides['1883::1::3'].watched, false);
  assert.deepEqual(normalizeTvCleanupPreferences({}), DEFAULT_TV_CLEANUP_PREFERENCES);
});

test('tv cleanup helpers match Tautulli history rows across multiple row shapes and mark only eligible watched episodes for cleanup', () => {
  const episode = {
    id: 2001,
    seriesId: 13,
    seasonNumber: 1,
    episodeNumber: 2,
    title: 'Behind Us, a Cliff',
    hasFile: true,
    monitored: true,
    episodeFileId: 336,
    airDateUtc: '2021-12-19T08:00:00Z',
  };

  const matchingRow = {
    grandparent_title: '1883',
    parent_media_index: 1,
    media_index: 2,
    percent_complete: 100,
    watched_status: 1,
    stopped: Math.floor((Date.now() - (4 * 24 * 60 * 60 * 1000)) / 1000),
  };

  const fallbackShapeRow = {
    full_title: '1883 - Behind Us, a Cliff',
    title: 'Behind Us, a Cliff',
    parent_media_index: 1,
    media_index: 2,
    originally_available_at: '2021-12-19',
    percent_complete: 96,
    watched_status: 0,
    stopped: Math.floor((Date.now() - (4 * 24 * 60 * 60 * 1000)) / 1000),
  };

  const nonMatchingRow = {
    grandparent_title: '1883',
    parent_media_index: 1,
    media_index: 3,
    percent_complete: 100,
    watched_status: 1,
    stopped: Math.floor(Date.now() / 1000),
  };

  assert.equal(getEpisodeHistoryBucketKey({ grandparent_title: '1883', parent_media_index: 1, media_index: 2 }), '1883::1::2');
  assert.equal(getEpisodeHistoryBucketKey({ full_title: '1883 - Behind Us, a Cliff', title: 'Behind Us, a Cliff', parent_media_index: 1, media_index: 2 }), '1883::1::2');
  assert.equal(getEpisodeHistoryBucketKey({ grandparent_title: '', parent_media_index: 1, media_index: 2 }), '');

  const deletePlan = buildEpisodeCleanupPlan({
    episode,
    seriesTitle: '1883',
    policyMode: 'delete-unmonitor',
    historyRows: [matchingRow, fallbackShapeRow, nonMatchingRow],
    manualOverrides: {},
    watchedThresholdPercent: 90,
    waitDays: 3,
    now: Date.now(),
  });

  assert.equal(deletePlan.isWatched, true);
  assert.equal(deletePlan.isEligible, true);
  assert.equal(deletePlan.shouldDeleteFile, true);
  assert.equal(deletePlan.shouldUnmonitor, true);
  assert.equal(deletePlan.matchingHistory.length, 2);

  const keepPlan = buildEpisodeCleanupPlan({
    episode,
    seriesTitle: '1883',
    policyMode: 'keep-all',
    historyRows: [matchingRow],
    manualOverrides: {},
    watchedThresholdPercent: 90,
    waitDays: 3,
    now: Date.now(),
  });

  assert.equal(keepPlan.isWatched, true);
  assert.equal(keepPlan.isEligible, false);
  assert.equal(keepPlan.shouldDeleteFile, false);
  assert.equal(keepPlan.shouldUnmonitor, false);

  const overrideKey = getEpisodeIdentityKey('1883', episode);
  const manualOverridePlan = buildEpisodeCleanupPlan({
    episode,
    seriesTitle: '1883',
    policyMode: 'delete-unmonitor',
    historyRows: [],
    manualOverrides: {
      [overrideKey]: { watched: true, source: 'manual', watchedAt: '2026-05-01T12:00:00.000Z' },
    },
    watchedThresholdPercent: 90,
    waitDays: 0,
    now: Date.now(),
  });

  assert.equal(manualOverridePlan.isWatched, true);
  assert.equal(manualOverridePlan.watchSource, 'manual');
  assert.equal(manualOverridePlan.matchingHistory.length, 0);
});

test('TV watched cleanup source wiring persists preferences and exposes Tautulli-backed cleanup actions in TV pages', () => {
  const databaseSource = read('server/database.js');
  const appSource = read('server/app.js');
  const appConfigApiSource = read('src/lib/appConfigApi.js');
  const configHookSource = read('src/lib/useServiceConfig.js');
  const serviceApiSource = read('src/lib/serviceApi.js');
  const showSource = read('src/pages/TvShowDetails.jsx');
  const seasonSource = read('src/pages/TvSeasonDetails.jsx');
  const episodeSource = read('src/pages/TvEpisodeDetails.jsx');

  assert.match(databaseSource, /DEFAULT_TV_CLEANUP_PREFERENCES/);
  assert.match(databaseSource, /TV_CLEANUP_PREFERENCES_KEY/);
  assert.match(databaseSource, /saveTvCleanupPreferences\(preferences = \{\}\)/);
  assert.match(appSource, /\/api\/app-config\/tv-cleanup-preferences/);
  assert.match(appConfigApiSource, /updateTvCleanupPreferences\(tvCleanupPreferences\)/);
  assert.match(configHookSource, /tvCleanupPreferences/);
  assert.match(configHookSource, /updateTvCleanupPreferences/);
  assert.match(serviceApiSource, /updateEpisodesMonitored/);
  assert.match(serviceApiSource, /deleteEpisodeFile/);
  assert.match(serviceApiSource, /getHistory:\s*async/);

  assert.match(showSource, /toast\.success\(`Saved cleanup policy: \$\{savedLabel\}`\)/);
  assert.match(showSource, /toast\.success\(`Applied cleanup policy: \$\{appliedLabel\} \(\$\{eligiblePlans\.length\} episodes\)`\)/);
  assert.match(showSource, /Delete watched episodes and unmonitor them/);

  assert.match(seasonSource, /Watched/);
  assert.match(seasonSource, /Eligible/);
  assert.match(seasonSource, /Apply cleanup/);
  assert.match(seasonSource, /toast\.success\(`Applied cleanup: \$\{label\} → \$\{cleanupActionLabel\}`\)/);

  assert.match(episodeSource, /manualOverrides/);
  assert.match(episodeSource, /Mark watched manually/);
  assert.match(episodeSource, /Clear manual override/);
  assert.match(episodeSource, /watchSource/);
  assert.match(episodeSource, /toast\.success\(`Saved manual watched override: \$\{overrideLabel\}`\)/);
  assert.match(episodeSource, /toast\.success\(`Saved episode cleanup: \$\{cleanupActionLabel\}`\)/);
});
