import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('/Users/itadmin/Desktop/Projects/MediaHub/src/pages/Dashboard.jsx', 'utf8');

test('Dashboard waits for app config before fetching service statuses', () => {
  assert.match(source, /isLoadingConfig/);
  assert.match(source, /if \(isLoadingConfig\) return;/);
  assert.match(source, /useEffect\(\(\) => \{\s*fetchAll\(\);\s*\}, \[fetchAll\]\)/s);
});

test('Dashboard fetch callback is not re-created from unstable readiness helpers', () => {
  assert.match(source, /const serviceReady = \(service\) => \{/);
  assert.doesNotMatch(source, /\}, \[config, isLoadingConfig, isServiceReady\]\);/s);
  assert.match(source, /\}, \[config, isLoadingConfig\]\);/s);
});
