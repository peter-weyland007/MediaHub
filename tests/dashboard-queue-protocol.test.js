import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

const mediaQueriesSource = read('src/lib/mediaQueries.js');
const activityItemSource = read('src/components/dashboard/ActivityItem.jsx');

test('dashboard queue normalizes a torrent-or-usenet label from Arr queue records', () => {
  assert.match(mediaQueriesSource, /const getQueueDownloadType = \(record\) =>/);
  assert.match(mediaQueriesSource, /record\?\.downloadProtocol/);
  assert.match(mediaQueriesSource, /record\?\.protocol/);
  assert.match(mediaQueriesSource, /downloadType:\s*getQueueDownloadType\(record\)/);
});

test('dashboard activity items render the normalized download transport when present', () => {
  assert.match(activityItemSource, /downloadType/);
  assert.match(activityItemSource, /\{downloadType\}/);
});
