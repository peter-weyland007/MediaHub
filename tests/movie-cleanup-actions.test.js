import test from 'node:test';
import assert from 'node:assert/strict';

import { radarrApi } from '../src/lib/serviceApi.js';
import { runMovieCleanupAction } from '../src/components/shared/movieCleanupActions.js';

const originalDeleteMovieFile = radarrApi.deleteMovieFile;
const originalUpdateMoviesMonitored = radarrApi.updateMoviesMonitored;
const originalGetMovie = radarrApi.getMovie;

const restoreRadarrApi = () => {
  radarrApi.deleteMovieFile = originalDeleteMovieFile;
  radarrApi.updateMoviesMonitored = originalUpdateMoviesMonitored;
  radarrApi.getMovie = originalGetMovie;
};

test.afterEach(() => {
  restoreRadarrApi();
});

test('runMovieCleanupAction deletes the file, unmonitors the movie, and verifies final Radarr state', async () => {
  const calls = [];
  radarrApi.deleteMovieFile = async (_config, movieFileId) => {
    calls.push(['deleteMovieFile', movieFileId]);
  };
  radarrApi.updateMoviesMonitored = async (_config, movieIds, monitored) => {
    calls.push(['updateMoviesMonitored', movieIds, monitored]);
  };
  radarrApi.getMovie = async (_config, movieId) => {
    calls.push(['getMovie', movieId]);
    return { id: movieId, monitored: false, hasFile: false };
  };

  const result = await runMovieCleanupAction({
    radarrConfig: { url: 'http://radarr.local', apiKey: 'token' },
    movie: { id: 630, monitored: true, hasFile: true, movieFile: { id: 77 } },
    mode: 'delete-unmonitor',
  });

  assert.deepEqual(calls, [
    ['deleteMovieFile', 77],
    ['updateMoviesMonitored', [630], false],
    ['getMovie', 630],
  ]);
  assert.deepEqual(result, {
    deletedFile: true,
    unmonitored: true,
    verifiedMovie: { id: 630, monitored: false, hasFile: false },
  });
});

test('runMovieCleanupAction throws if Radarr still reports the movie as monitored after cleanup', async () => {
  radarrApi.deleteMovieFile = async () => {};
  radarrApi.updateMoviesMonitored = async () => {};
  radarrApi.getMovie = async (config, movieId) => ({ id: movieId, monitored: true, hasFile: false });

  await assert.rejects(
    () => runMovieCleanupAction({
      radarrConfig: { url: 'http://radarr.local', apiKey: 'token' },
      movie: { id: 630, monitored: true, hasFile: true, movieFile: { id: 77 } },
      mode: 'delete-unmonitor',
    }),
    /Radarr still reports this movie as monitored/
  );
});
