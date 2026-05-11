import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('dialog cleanup guard removes stale Radix body locks and orphaned dark overlays on route/page restore', () => {
  const appSource = read('src/App.jsx');
  const cleanupSource = read('src/lib/dialogCleanup.js');

  assert.match(appSource, /useLocation/);
  assert.match(appSource, /cleanupStaleDialogArtifacts/);
  assert.match(appSource, /pageshow/);
  assert.match(cleanupSource, /querySelectorAll\('\[role="dialog"\]\[data-state="open"\], \[role="alertdialog"\]\[data-state="open"\]'\)/);
  assert.match(cleanupSource, /const hadBodyLock = hadScrollLock \|\| hadPointerLock/);
  assert.doesNotMatch(cleanupSource, /if \(!hadBodyLock\) \{/);
  assert.match(cleanupSource, /if \(hadBodyLock && \(body\.getAttribute\('style'\) \|\| ''\)\.trim\(\) === ''\) \{/);
  assert.match(cleanupSource, /data-scroll-locked/);
  assert.match(cleanupSource, /pointerEvents/);
  assert.match(cleanupSource, /fixed inset-0 z-50 bg-black\/80/);
  assert.match(cleanupSource, /const overlayState = node\.getAttribute\('data-state'\)/);
  assert.match(cleanupSource, /overlayState === 'open' \|\| overlayState === 'closed'/);
  assert.match(cleanupSource, /node\.getAttribute\('role'\) === 'dialog' \|\| node\.getAttribute\('role'\) === 'alertdialog'/);
});
