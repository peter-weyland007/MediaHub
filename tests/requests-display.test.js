import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { formatRequestHeadline, formatRequestMeta } from '../src/lib/requestDisplay.js';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('request display prefers actual media titles and falls back to readable type-aware labels', () => {
  assert.equal(
    formatRequestHeadline({ id: 456, type: 'movie', media: { title: 'Alien', releaseDate: '1979-05-25' } }),
    'Alien',
  );

  assert.equal(
    formatRequestHeadline({ id: 457, type: 'tv', media: { name: 'Severance', firstAirDate: '2022-02-18' } }),
    'Severance',
  );

  assert.equal(
    formatRequestHeadline({ id: 458, type: 'movie', media: {} }),
    'Unknown movie request',
  );

  assert.equal(
    formatRequestHeadline({ id: 459, type: 'tv', media: {} }),
    'Unknown series request',
  );
});

test('request display meta adds year and request id so rows stay identifiable without leading with the id', () => {
  assert.equal(
    formatRequestMeta({ id: 456, type: 'movie', media: { releaseDate: '1979-05-25' } }),
    'Movie • 1979 • Request #456',
  );

  assert.equal(
    formatRequestMeta({ id: 457, type: 'tv', media: { firstAirDate: '2022-02-18' } }),
    'Series • 2022 • Request #457',
  );

  assert.equal(
    formatRequestMeta({ id: 458, type: 'movie', media: {} }),
    'Movie • Request #458',
  );
});

test('Requests page uses shared readable request display helpers instead of leading with bare request ids', () => {
  const source = read('src/pages/Requests.jsx');

  assert.match(source, /formatRequestHeadline/);
  assert.match(source, /formatRequestMeta/);
  assert.doesNotMatch(source, /media\.title \|\| media\.name \|\| `Request #\$\{req\.id\}`/);
});
