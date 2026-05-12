import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  formatRequestHeadline,
  formatRequestMeta,
  getRequestStatusCounts,
  getRequestStatusFilterOptions,
  getRequestStatusKey,
  getVisibleRequests,
} from '../src/lib/requestDisplay.js';

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

test('request status key keeps pending requests pending even if Overseerr media payload has richer lifecycle states', () => {
  assert.equal(getRequestStatusKey({ status: 1, media: { status: 3 } }), 'pending');
  assert.equal(getRequestStatusKey({ status: 1, media: { status: 4 } }), 'pending');
  assert.equal(getRequestStatusKey({ status: 1, media: { status: 5 } }), 'pending');
  assert.equal(getRequestStatusKey({ status: 1, media: { status: 6 } }), 'pending');
});

test('request status key prefers richer Overseerr media lifecycle states before generic approval states', () => {
  assert.equal(getRequestStatusKey({ status: 1, media: { status: 2 } }), 'pending');
  assert.equal(getRequestStatusKey({ status: 2, media: { status: 2 } }), 'pending');
  assert.equal(getRequestStatusKey({ status: 2, media: { status: 3 } }), 'processing');
  assert.equal(getRequestStatusKey({ status: 2, media: { status: 4 } }), 'partially_available');
  assert.equal(getRequestStatusKey({ status: 2, media: { status: 5 } }), 'available');
  assert.equal(getRequestStatusKey({ status: 2, mediaDetails: { status: 5 } }), 'available');
  assert.equal(getRequestStatusKey({ status: 2, mediaDetails: {}, media: { status: 5 } }), 'available');
  assert.equal(getRequestStatusKey({ status: 2, media: { status: 1 } }), 'approved');
  assert.equal(getRequestStatusKey({ status: 4, media: {} }), 'failed');
  assert.equal(getRequestStatusKey({ status: 5, media: {} }), 'completed');
  assert.equal(getRequestStatusKey({ status: 4, media: { status: 5 } }), 'failed');
  assert.equal(getRequestStatusKey({ status: 5, media: { status: 3 } }), 'completed');
  assert.equal(getRequestStatusKey({ status: 3, media: { status: 5 } }), 'declined');
});

test('request status helpers build count panels and status filter options from normalized request states', () => {
  const requests = [
    { id: 1, status: 1, media: { status: 2 } },
    { id: 2, status: 2, media: { status: 3 } },
    { id: 3, status: 2, media: { status: 5 } },
    { id: 4, status: 5, media: { status: 5 } },
    { id: 5, status: 3, media: { status: 5 } },
  ];

  assert.deepEqual(getRequestStatusCounts(requests), [
    { key: 'all', count: 5 },
    { key: 'pending', count: 1 },
    { key: 'processing', count: 1 },
    { key: 'available', count: 1 },
    { key: 'completed', count: 1 },
    { key: 'declined', count: 1 },
  ]);

  assert.deepEqual(getRequestStatusFilterOptions(requests), [
    { key: 'all', count: 5 },
    { key: 'pending', count: 1 },
    { key: 'processing', count: 1 },
    { key: 'available', count: 1 },
    { key: 'completed', count: 1 },
    { key: 'declined', count: 1 },
  ]);
});

test('request status helpers filter visible rows by selected normalized status key', () => {
  const requests = [
    { id: 1, status: 1, media: { status: 2 } },
    { id: 2, status: 2, media: { status: 3 } },
    { id: 3, status: 2, media: { status: 5 } },
  ];

  assert.deepEqual(getVisibleRequests(requests, 'all').map((request) => request.id), [1, 2, 3]);
  assert.deepEqual(getVisibleRequests(requests, 'pending').map((request) => request.id), [1]);
  assert.deepEqual(getVisibleRequests(requests, 'processing').map((request) => request.id), [2]);
  assert.deepEqual(getVisibleRequests(requests, 'available').map((request) => request.id), [3]);
  assert.deepEqual(getVisibleRequests(requests, 'missing-status').map((request) => request.id), [1, 2, 3]);
});

test('Requests page defines summary count panels and a status filter control wired to normalized request states', () => {
  const source = read('src/pages/Requests.jsx');

  assert.match(source, /getRequestStatusCounts/);
  assert.match(source, /getRequestStatusFilterOptions/);
  assert.match(source, /getVisibleRequests/);
  assert.match(source, /const \[statusFilter, setStatusFilter\] = React\.useState\('all'\)/);
  assert.match(source, /React\.useEffect\(\(\) => \{\s*if \(!statusOptions\.some\(\(option\) => option\.key === statusFilter\)\) \{\s*setStatusFilter\('all'\);/s);
  assert.match(source, /<Select value=\{statusFilter\} onValueChange=\{setStatusFilter\}>/);
  assert.match(source, /SelectItem value=\{option\.key\}/);
  assert.match(source, /statusCounts\.map\(\(item\) =>/);
  assert.match(source, /filteredRequests\.map\(\(req\) =>/);
  assert.match(source, /overflow-x-auto pb-1/);
  assert.match(source, /flex min-w-max gap-3/);
});

test('Requests page defines explicit badges for available and processing request states', () => {
  const source = read('src/pages/Requests.jsx');

  assert.match(source, /available:\s*\{\s*label:\s*'Available'/);
  assert.match(source, /processing:\s*\{\s*label:\s*'Processing'/);
  assert.match(source, /partially_available:\s*\{\s*label:\s*'Partially Available'/);
  assert.match(source, /completed:\s*\{\s*label:\s*'Completed'/);
  assert.match(source, /failed:\s*\{\s*label:\s*'Failed'/);
  assert.match(source, /getRequestStatusKey/);
  assert.doesNotMatch(source, /statusColors\[req\.status\] \|\| statusColors\[1\]/);
});

test('Requests page uses shared readable request display helpers instead of leading with bare request ids', () => {
  const source = read('src/pages/Requests.jsx');

  assert.match(source, /formatRequestHeadline/);
  assert.match(source, /formatRequestMeta/);
  assert.doesNotMatch(source, /media\.title \|\| media\.name \|\| `Request #\$\{req\.id\}`/);
});
