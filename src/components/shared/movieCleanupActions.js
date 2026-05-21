import { radarrApi } from '@/lib/serviceApi';

export async function runMovieCleanupAction({ radarrConfig, movie, mode }) {
  if (mode !== 'delete-unmonitor') {
    return;
  }

  const movieFileId = Number(movie?.movieFile?.id || 0);
  if (movieFileId) {
    await radarrApi.deleteMovieFile(radarrConfig, movieFileId);
  }

  if (movie?.id && movie?.monitored !== false) {
    await radarrApi.updateMoviesMonitored(radarrConfig, [movie.id], false);
  }
}
