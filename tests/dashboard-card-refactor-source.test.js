import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('ServiceCard uses a lighter summary-first layout instead of heavy stat panels', () => {
  const source = read('src/components/dashboard/ServiceCard.jsx');

  assert.match(source, /compact|summary|metric/i);
  assert.match(source, /rounded-full/);
  assert.match(source, /statusLabel/);
  assert.match(source, /stats\.slice\(0, 2\)/);
  assert.match(source, /status === 'error'/);
  assert.match(source, /status === 'unconfigured'/);
  assert.doesNotMatch(source, />Live</);
  assert.doesNotMatch(source, /hover:border-border/);
  assert.doesNotMatch(source, /text-lg font-bold/);
  assert.doesNotMatch(source, /grid-cols-2 gap-2/);
});

test('Dashboard uses a wider, lower-density card grid for service status cards', () => {
  const source = read('src/pages/Dashboard.jsx');

  assert.match(source, /xl:grid-cols-4/);
  assert.doesNotMatch(source, /lg:grid-cols-3 gap-4/);
});
