import { sonarrApi } from '@/lib/serviceApi';

/** @typedef {'keep-all' | 'unmonitor-only' | 'delete-unmonitor'} CleanupMode */
/** @typedef {{ id?: number, episodeFileId?: number }} CleanupEpisode */
/** @typedef {{ sonarrConfig?: any, episode?: CleanupEpisode, mode?: CleanupMode }} EpisodeCleanupActionInput */

/**
 * @param {EpisodeCleanupActionInput} input
 */
export async function runEpisodeCleanupAction({ sonarrConfig, episode, mode }) {
  if (!episode?.id) {
    throw new Error('Episode is required');
  }

  if (mode === 'delete-unmonitor') {
    if (episode.episodeFileId) {
      await sonarrApi.deleteEpisodeFile(sonarrConfig, episode.episodeFileId);
    }
    await sonarrApi.updateEpisodesMonitored(sonarrConfig, [episode.id], false);
    return { deletedFile: Boolean(episode.episodeFileId), unmonitored: true };
  }

  if (mode === 'unmonitor-only') {
    await sonarrApi.updateEpisodesMonitored(sonarrConfig, [episode.id], false);
    return { deletedFile: false, unmonitored: true };
  }

  return { deletedFile: false, unmonitored: false };
}
