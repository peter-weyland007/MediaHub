import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { buildProtocolPreferencePriorityUpdates, getProtocolPreferenceState } from '../src/lib/indexerPriority.js';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('prefer-usenet priority updates rank enabled usenet indexers above enabled torrent indexers', () => {
  const updates = buildProtocolPreferencePriorityUpdates([
    { id: 1, name: 'Torrent B', protocol: 'torrent', enable: true, priority: 25, sortName: 'torrent-b' },
    { id: 2, name: 'Usenet A', protocol: 'usenet', enable: true, priority: 25, sortName: 'usenet-a' },
    { id: 3, name: 'Torrent A', protocol: 'torrent', enable: true, priority: 25, sortName: 'torrent-a' },
    { id: 4, name: 'Disabled Usenet', protocol: 'usenet', enable: false, priority: 25, sortName: 'disabled-usenet' },
  ], 'usenet');

  assert.deepEqual(updates.map(({ id, priority }) => ({ id, priority })), [
    { id: 2, priority: 50 },
    { id: 3, priority: 25 },
    { id: 1, priority: 24 },
  ]);
});

test('prefer-torrent priority updates rank enabled torrent indexers above enabled usenet indexers', () => {
  const updates = buildProtocolPreferencePriorityUpdates([
    { id: 1, name: 'Torrent B', protocol: 'torrent', enable: true, priority: 25, sortName: 'torrent-b' },
    { id: 2, name: 'Usenet A', protocol: 'usenet', enable: true, priority: 25, sortName: 'usenet-a' },
    { id: 3, name: 'Torrent A', protocol: 'torrent', enable: true, priority: 25, sortName: 'torrent-a' },
  ], 'torrent');

  assert.deepEqual(updates.map(({ id, priority }) => ({ id, priority })), [
    { id: 3, priority: 50 },
    { id: 1, priority: 49 },
    { id: 2, priority: 25 },
  ]);
});

test('protocol preference state reports whether usenet or torrent is currently preferred', () => {
  assert.deepEqual(getProtocolPreferenceState([
    { protocol: 'usenet', enable: true, priority: 50 },
    { protocol: 'torrent', enable: true, priority: 25 },
  ]), {
    preferredProtocol: 'usenet',
    label: 'Usenet preferred',
  });

  assert.deepEqual(getProtocolPreferenceState([
    { protocol: 'torrent', enable: true, priority: 50 },
    { protocol: 'usenet', enable: true, priority: 25 },
  ]), {
    preferredProtocol: 'torrent',
    label: 'Torrent preferred',
  });
});

test('Indexers page and Prowlarr API expose protocol preference controls', () => {
  const indexersSource = read('src/pages/Indexers.jsx');
  const serviceApiSource = read('src/lib/serviceApi.js');

  assert.match(indexersSource, /Prefer Usenet/);
  assert.match(indexersSource, /Prefer Torrent/);
  assert.match(indexersSource, /Protocol preference/);
  assert.match(indexersSource, /getProtocolPreferenceState/);
  assert.match(indexersSource, /buildProtocolPreferencePriorityUpdates/);
  assert.match(indexersSource, /updateIndexer/);
  assert.match(indexersSource, /priority/);
  assert.match(serviceApiSource, /updateIndexer/);
});
