import test from 'node:test';
import assert from 'node:assert/strict';

import { isOptimizationCandidate } from '../src/lib/qualityUtils.js';

test('unmonitored Radarr movies are excluded from optimization candidates', () => {
  assert.equal(isOptimizationCandidate({ monitored: false, movieFile: { path: '/movies/Alien.mkv' } }, 'movie'), false);
  assert.equal(isOptimizationCandidate({ monitored: true, movieFile: { path: '/movies/Aliens.mkv' } }, 'movie'), true);
});

test('unmonitored Sonarr series are excluded from optimization candidates', () => {
  assert.equal(isOptimizationCandidate({ monitored: false, statistics: { episodeCount: 10 } }, 'tv'), false);
  assert.equal(isOptimizationCandidate({ monitored: true, statistics: { episodeCount: 10 } }, 'tv'), true);
});
