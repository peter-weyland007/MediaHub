import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('QualityManager is upgraded into a library optimization workflow with saved optimization preferences', () => {
  const pageSource = read('src/pages/QualityManager.jsx');
  const hookSource = read('src/lib/useServiceConfig.js');
  const apiSource = read('src/lib/appConfigApi.js');

  assert.match(pageSource, /Library Optimization/);
  assert.match(pageSource, /Save Disk Space/);
  assert.match(pageSource, /Plex Compatibility/);
  assert.match(pageSource, /optimizationPreferences/);
  assert.match(pageSource, /updateOptimizationPreferences/);
  assert.match(pageSource, /Playback Evidence/);
  assert.match(pageSource, /tautulliApi\./);
  assert.match(pageSource, /Push Optimization Goal settings to Radarr\/Sonarr as a Profile/);
  assert.match(pageSource, /applyOptimizationGoalProfile/);
  assert.match(hookSource, /optimizationPreferences/);
  assert.match(apiSource, /updateOptimizationPreferences/);
});

test('qualityUtils includes optimization-specific recommendation helpers', () => {
  const source = read('src/lib/qualityUtils.js');

  assert.match(source, /getOptimizationRecommendation/);
  assert.match(source, /strategy/);
  assert.match(source, /Plex Compatibility|Save Disk Space/);
  assert.match(source, /buildOptimizationQualityProfilePayload/);
  assert.match(source, /MediaHub Profile/);
});

test('optimization goal sync can create or update a MediaHub profile in Radarr and Sonarr', () => {
  const serviceApiSource = read('src/lib/serviceApi.js');
  const pageSource = read('src/pages/QualityManager.jsx');

  assert.match(serviceApiSource, /getQualityProfileSchema/);
  assert.match(serviceApiSource, /createQualityProfile/);
  assert.match(serviceApiSource, /updateQualityProfile/);
  assert.match(pageSource, /MediaHub Profile/);
  assert.match(pageSource, /saveQualityPrefs/);
  assert.match(pageSource, /buildOptimizationQualityProfilePayload/);
  assert.match(pageSource, /Push Optimization Goal settings to Radarr\/Sonarr as a Profile/);
});
