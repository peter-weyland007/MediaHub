import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('watched cleanup queue is routed, discoverable in nav, and wired to TV cleanup data sources', () => {
  const appSource = read('src/App.jsx');
  const sidebarSource = read('src/components/layout/Sidebar.jsx');
  const pageSource = read('src/pages/TvCleanupQueue.jsx');

  assert.match(appSource, /import TvCleanupQueue from '@\/pages\/TvCleanupQueue';/);
  assert.match(appSource, /path="\/tv-cleanup" element={<TvCleanupQueue \/>}/);

  assert.match(sidebarSource, /path: '\/tv-cleanup', label: 'Watched Cleanup'/);

  assert.match(pageSource, /PageHeader title="Watched Cleanup"/);
  assert.match(pageSource, /tautulliApi\.getHistory\(config\.tautulli, \{ media_type: 'episode', length: '500' \}\)/);
  assert.match(pageSource, /sonarrApi\.getSeries\(config\.sonarr\)/);
  assert.match(pageSource, /sonarrApi\.getEpisodes\(config\.sonarr, series\.id\)/);
  assert.match(pageSource, /sonarrApi\.getEpisodeFiles\(config\.sonarr, series\.id\)/);
  assert.match(pageSource, /buildShowCleanupSummary/);
  assert.match(pageSource, /manualOverrides/);
  assert.match(pageSource, /Apply eligible cleanup/);
  assert.match(pageSource, /Eligible episodes/);
  assert.match(pageSource, /Mark watched manually/);
  assert.match(pageSource, /Clear manual override/);
  assert.match(pageSource, /Unmonitor watched episodes, keep files/);
  assert.match(pageSource, /Delete watched episodes and unmonitor them/);
  assert.match(pageSource, /toast\.success\(`Saved queue watched override: \$\{label\}`\)/);
  assert.match(pageSource, /toast\.success\(`Applied queue cleanup: \$\{label\} → \$\{cleanupActionLabel\}`\)/);
});
