import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';

const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('MediaCard supports poster visibility and poster size props', () => {
  const source = read('src/components/shared/MediaCard.jsx');

  assert.match(source, /hidePoster/);
  assert.match(source, /posterSize/);
  assert.match(source, /data-poster-size=/);
  assert.match(source, /!hidePoster/);
});

test('media library pages render shared poster display controls', () => {
  for (const relativePath of [
    'src/pages/Movies.jsx',
    'src/pages/TvShows.jsx',
    'src/pages/MusicPage.jsx',
    'src/pages/PlexLibrary.jsx',
  ]) {
    const source = read(relativePath);
    assert.match(source, /PosterDisplayControls/);
    assert.match(source, /posterDisplayPreferences/);
  }
});
