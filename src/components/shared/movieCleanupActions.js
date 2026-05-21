import { radarrApi } from '../../lib/serviceApi.js';

export async function runMovieCleanupAction({ radarrConfig, movie, mode }) {
  if (mode !== 'delete-unmonitor') {
    return { deletedFile: false, unmonitored: false, verifiedMovie: movie || null };
  }

  let deletedFile = false;
  let unmonitored = false;

  const movieFileId = Number(movie?.movieFile?.id || 0);
  if (movieFileId) {
    await radarrApi.deleteMovieFile(radarrConfig, movieFileId);
    deletedFile = true;
  }

  if (movie?.id && movie?.monitored !== false) {
    await radarrApi.updateMoviesMonitored(radarrConfig, [movie.id], false);
    unmonitored = true;
  }

  const verifiedMovie = movie?.id ? await radarrApi.getMovie(radarrConfig, movie.id) : null;
  if (mode === 'delete-unmonitor' && verifiedMovie?.monitored !== false) {
    throw new Error('Radarr still reports this movie as monitored after cleanup');
  }

  return { deletedFile, unmonitored, verifiedMovie };
}
