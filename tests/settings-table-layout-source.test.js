import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'pages', 'SettingsPage.jsx'), 'utf8');

test('Settings page uses a table overview for integrations instead of a stacked card list', () => {
  assert.match(source, /Table/);
  assert.match(source, /TableHeader/);
  assert.match(source, /TableRow/);
  assert.match(source, /Service/);
  assert.match(source, /Purpose/);
  assert.match(source, /Enabled/);
  assert.match(source, /Address/);
  assert.match(source, /Key/);
  assert.match(source, /Status/);
  assert.match(source, /Actions/);
  assert.doesNotMatch(source, /ServiceConfigCard/);
});

test('Settings page supports an expandable inline editor row instead of always-open service forms', () => {
  assert.match(source, /expandedService|editingService/);
  assert.match(source, /setExpandedService|setEditingService/);
  assert.match(source, /Base URL/);
  assert.match(source, /API Key|Plex Token/);
  assert.match(source, /Show key|Hide key|Eye|EyeOff/);
  assert.match(source, /Save/);
  assert.match(source, /Test/);
});

test('Settings overview row shows compact saved-state and connection-state indicators', () => {
  assert.match(source, /Saved|Missing/);
  assert.match(source, /Connected successfully|Failed to connect|Untested|Connected/);
  assert.match(source, /Test Connection|Test/);
  assert.match(source, /Edit/);
});

test('Settings service rows are alphabetized by service name', () => {
  const bazarrIndex = source.indexOf("name: 'Bazarr'");
  const lidarrIndex = source.indexOf("name: 'Lidarr'");
  const overseerrIndex = source.indexOf("name: 'Overseerr'");
  const plexIndex = source.indexOf("name: 'Plex'");
  const prowlarrIndex = source.indexOf("name: 'Prowlarr'");
  const radarrIndex = source.indexOf("name: 'Radarr'");
  const sonarrIndex = source.indexOf("name: 'Sonarr'");
  const tautulliIndex = source.indexOf("name: 'Tautulli'");

  assert.ok(bazarrIndex < lidarrIndex);
  assert.ok(lidarrIndex < overseerrIndex);
  assert.ok(overseerrIndex < plexIndex);
  assert.ok(plexIndex < prowlarrIndex);
  assert.ok(prowlarrIndex < radarrIndex);
  assert.ok(radarrIndex < sonarrIndex);
  assert.ok(sonarrIndex < tautulliIndex);
});
