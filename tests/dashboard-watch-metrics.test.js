import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMovieWatchStats, buildSeriesWatchStats } from '../src/components/shared/dashboardMetrics.js';

test('movie dashboard watch metrics count watched titles from Tautulli history aliases and format count plus percentage', () => {
  const summary = buildMovieWatchStats(
    [
      { title: 'E.T. the Extra-Terrestrial', originalTitle: 'E.T. the Extra-Terrestrial' },
      { title: 'Alien', originalTitle: 'Alien' },
      { title: 'The Boy Who Could Fly' },
    ],
    [
      { title: 'E.T.', full_title: 'E.T.', original_title: 'E.T. the Extra-Terrestrial' },
      { title: 'Alien', full_title: 'Alien' },
    ],
  );

  assert.equal(summary.totalCount, 3);
  assert.equal(summary.watchedCount, 2);
  assert.equal(summary.watchedPercentage, '67%');
  assert.equal(summary.watchedDisplay, '2 (67%)');
});

test('series dashboard watch metrics count watched shows from Tautulli episode history and format count plus percentage', () => {
  const summary = buildSeriesWatchStats(
    [
      { title: '1883', cleanTitle: '1883' },
      { title: 'The Last of Us', cleanTitle: 'thelastofus' },
      { title: 'Severance' },
      { title: 'Andor' },
    ],
    [
      { grandparent_title: '1883', parent_media_index: 1, media_index: 2, percent_complete: 100, watched_status: 1 },
      { full_title: 'The Last of Us - When You\'re Lost in the Darkness', title: 'When You\'re Lost in the Darkness', parent_media_index: 1, media_index: 1, percent_complete: 96 },
      { grandparent_title: 'Random Show', parent_media_index: 1, media_index: 1, percent_complete: 100 },
    ],
  );

  assert.equal(summary.totalCount, 4);
  assert.equal(summary.watchedCount, 2);
  assert.equal(summary.watchedPercentage, '50%');
  assert.equal(summary.watchedDisplay, '2 (50%)');
});
