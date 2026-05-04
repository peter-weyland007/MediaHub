import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('Bazarr is part of persisted service defaults and frontend config defaults', () => {
  const databaseSource = read('server/database.js');
  const configSource = read('src/lib/useServiceConfig.js');

  assert.match(databaseSource, /bazarr:\s*\{\s*url:\s*'',\s*apiKey:\s*'',\s*enabled:\s*false\s*\}/s);
  assert.match(configSource, /bazarr:\s*\{\s*url:\s*'',\s*apiKey:\s*'',\s*enabled:\s*false\s*\}/s);
});

test('Bazarr is wired into Dashboard, Settings, and service API clients', () => {
  const dashboardSource = read('src/pages/Dashboard.jsx');
  const settingsSource = read('src/pages/SettingsPage.jsx');
  const serviceApiSource = read('src/lib/serviceApi.js');

  assert.match(dashboardSource, /name:\s*'Bazarr'/);
  assert.match(dashboardSource, /fetchDashboardData/);
  assert.match(read('src/lib/mediaQueries.js'), /bazarrApi\./);
  assert.match(settingsSource, /name:\s*'Bazarr'/);
  assert.match(settingsSource, /bazarrApi\.getSystemStatus/);
  assert.match(serviceApiSource, /export const bazarrApi =/);
  assert.match(serviceApiSource, /service:\s*'bazarr'/);
});

test('Bazarr is wired into the backend proxy with Bazarr-specific API-key header casing', () => {
  const appSource = read('server/app.js');

  assert.match(appSource, /bazarr:\s*\{/);
  assert.match(appSource, /pathPrefix:\s*'\/api'/);
  assert.match(appSource, /'X-API-KEY': config\.apiKey/);
});
