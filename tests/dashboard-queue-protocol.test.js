import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const read = (relativePath) => fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');

const mediaQueriesSource = read('src/lib/mediaQueries.js');
const activityItemSource = read('src/components/dashboard/ActivityItem.jsx');

test('dashboard queue normalizes a torrent-or-usenet label from Arr queue records and carries detail routes', () => {
  assert.match(mediaQueriesSource, /const getQueueDownloadType = \(record\) =>/);
  assert.match(mediaQueriesSource, /record\?\.downloadProtocol/);
  assert.match(mediaQueriesSource, /record\?\.protocol/);
  assert.match(mediaQueriesSource, /detailPath:\s*record\.movieId\s*\?\s*`?\/movies\/\$?\{?record\.movieId\}?`?\s*:\s*''/);
  assert.match(mediaQueriesSource, /detailPath:\s*record\.seriesId\s*\?\s*`?\/tv-shows\/\$?\{?record\.seriesId\}?`?\s*:\s*''/);
  assert.match(mediaQueriesSource, /downloadType:\s*getQueueDownloadType\(record\)/);
});

test('dashboard activity items render queue titles as detail links when a route is available', () => {
  assert.match(activityItemSource, /detailPath/);
  assert.match(activityItemSource, /import \{ Link \} from 'react-router-dom';/);
  assert.match(activityItemSource, /<Link to=\{detailPath\}/);
  assert.match(activityItemSource, /\{title\}/);
  assert.match(activityItemSource, /\{downloadType\}/);
});
