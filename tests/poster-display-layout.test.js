import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  getMediaGridClassName,
  getMediaGridStyle,
  getPosterDensityLabel,
  getPosterDensityOptions,
} from '../src/components/shared/mediaDisplay.js';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';

const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('media display helper returns poster and compact grid layouts based on poster visibility', () => {
  assert.match(getMediaGridClassName({ hidePosters: false }), /--poster-card-min/);
  assert.match(getMediaGridClassName({ hidePosters: true }), /--compact-card-min/);

  assert.deepEqual(getMediaGridStyle({ hidePosters: false, posterSize: 'large' }), {
    '--poster-card-min': '14rem',
  });

  assert.deepEqual(getMediaGridStyle({ hidePosters: true, posterSize: 'compact' }), {
    '--compact-card-min': '16rem',
  });

  assert.deepEqual(getMediaGridStyle({ hidePosters: true, posterSize: 'default' }), {
    '--compact-card-min': '20rem',
  });

  assert.deepEqual(getMediaGridStyle({ hidePosters: true, posterSize: 'large' }), {
    '--compact-card-min': '24rem',
  });
});

test('poster display controls adapt labels for compact no-poster mode', () => {
  assert.equal(getPosterDensityLabel({ hidePosters: false }), 'Poster size');
  assert.equal(getPosterDensityLabel({ hidePosters: true }), 'Density');
  assert.deepEqual(getPosterDensityOptions({ hidePosters: false }), ['Compact', 'Default', 'Large']);
  assert.deepEqual(getPosterDensityOptions({ hidePosters: true }), ['Dense', 'Comfortable', 'Spacious']);
});

test('media library pages use shared grid layout helpers', () => {
  for (const relativePath of [
    'src/pages/Movies.jsx',
    'src/pages/TvShows.jsx',
    'src/pages/MusicPage.jsx',
    'src/pages/PlexLibrary.jsx',
  ]) {
    const source = read(relativePath);
    assert.match(source, /getMediaGridClassName/);
    assert.match(source, /getMediaGridStyle/);
  }
});

test('poster display controls use density copy helpers in no-poster mode', () => {
  const source = read('src/components/shared/PosterDisplayControls.jsx');
  assert.match(source, /getPosterDensityLabel/);
  assert.match(source, /getPosterDensityOptions/);
  assert.match(source, /densityLabel/);
  assert.match(source, /compactLabel/);
});
