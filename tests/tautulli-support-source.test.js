import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('Tautulli is part of persisted service defaults and frontend config defaults', () => {
  const databaseSource = read('server/database.js');
  const configSource = read('src/lib/useServiceConfig.js');

  assert.match(databaseSource, /tautulli:\s*\{\s*url:\s*'',\s*apiKey:\s*'',\s*enabled:\s*false\s*\}/s);
  assert.match(configSource, /tautulli:\s*\{\s*url:\s*'',\s*apiKey:\s*'',\s*enabled:\s*false\s*\}/s);
});

test('Tautulli is wired into Dashboard, Settings, and service API clients', () => {
  const dashboardSource = read('src/pages/Dashboard.jsx');
  const settingsSource = read('src/pages/SettingsPage.jsx');
  const serviceApiSource = read('src/lib/serviceApi.js');

  assert.match(dashboardSource, /name:\s*'Tautulli'/);
  assert.match(dashboardSource, /tautulliApi\./);
  assert.match(settingsSource, /name:\s*'Tautulli'/);
  assert.match(settingsSource, /tautulliApi\.getActivity/);
  assert.match(serviceApiSource, /export const tautulliApi =/);
  assert.match(serviceApiSource, /service:\s*'tautulli'/);
});

test('Tautulli is wired into the backend proxy with query-string API auth', () => {
  const appSource = read('server/app.js');

  assert.match(appSource, /tautulli:\s*\{/);
  assert.match(appSource, /pathPrefix:\s*'\/api\/v2'/);
  assert.match(appSource, /apikey=/);
  assert.match(appSource, /Accept:\s*'application\/json,text\/plain,\*\/\*'/);
});
