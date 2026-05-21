import test from 'node:test';
import assert from 'node:assert/strict';

import { radarrApi } from '../src/lib/serviceApi.js';
import { runMovieCleanupAction, runMovieReplacementAction } from '../src/components/shared/movieCleanupActions.js';

const originalDeleteMovieFile = radarrApi.deleteMovieFile;
const originalUpdateMoviesMonitored = radarrApi.updateMoviesMonitored;
const originalCommandRescanMovie = radarrApi.commandRescanMovie;
const originalCommandSearch = radarrApi.commandSearch;
const originalGetMovie = radarrApi.getMovie;

const restoreRadarrApi = () => {
  radarrApi.deleteMovieFile = originalDeleteMovieFile;
  radarrApi.updateMoviesMonitored = originalUpdateMoviesMonitored;
  radarrApi.commandRescanMovie = originalCommandRescanMovie;
  radarrApi.commandSearch = originalCommandSearch;
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

test('runMovieReplacementAction deletes the file, keeps the movie monitored, rescans, and queues a replacement search', async () => {
  const calls = [];
  radarrApi.deleteMovieFile = async (_config, movieFileId) => {
    calls.push(['deleteMovieFile', movieFileId]);
  };
  radarrApi.commandRescanMovie = async (_config, movieId) => {
    calls.push(['commandRescanMovie', movieId]);
    return { id: 9001, status: 'queued' };
  };
  radarrApi.updateMoviesMonitored = async (_config, movieIds, monitored) => {
    calls.push(['updateMoviesMonitored', movieIds, monitored]);
  };
  radarrApi.commandSearch = async (_config, movieIds) => {
    calls.push(['commandSearch', movieIds]);
    return { id: 9002, status: 'queued', body: { movieIds } };
  };
  radarrApi.getMovie = async (_config, movieId) => {
    calls.push(['getMovie', movieId]);
    return { id: movieId, monitored: true, hasFile: false };
  };

  const result = await runMovieReplacementAction({
    radarrConfig: { url: 'http://radarr.local', apiKey: 'token' },
    movie: { id: 630, monitored: false, hasFile: true, movieFile: { id: 77 } },
  });

  assert.deepEqual(calls, [
    ['deleteMovieFile', 77],
    ['commandRescanMovie', 630],
    ['updateMoviesMonitored', [630], true],
    ['commandSearch', [630]],
    ['getMovie', 630],
  ]);
  assert.deepEqual(result, {
    deletedFile: true,
    rescanCommand: { id: 9001, status: 'queued' },
    searchCommand: { id: 9002, status: 'queued', body: { movieIds: [630] } },
    verifiedMovie: { id: 630, monitored: true, hasFile: false },
  });
});

test('runMovieReplacementAction throws if Radarr still reports the movie as missing or unmonitored after replacement kickoff', async () => {
  radarrApi.deleteMovieFile = async () => {};
  radarrApi.commandRescanMovie = async () => ({ id: 1, status: 'queued' });
  radarrApi.updateMoviesMonitored = async () => {};
  radarrApi.commandSearch = async () => ({ id: 2, status: 'queued' });
  radarrApi.getMovie = async (_config, movieId) => ({ id: movieId, monitored: false, hasFile: false });

  await assert.rejects(
    () => runMovieReplacementAction({
      radarrConfig: { url: 'http://radarr.local', apiKey: 'token' },
      movie: { id: 630, monitored: false, hasFile: true, movieFile: { id: 77 } },
    }),
    /Radarr still reports this movie as unmonitored after replacement was queued/
  );
});
