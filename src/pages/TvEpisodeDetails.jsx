import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Tv } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { fetchTvShowDetailsData, getServiceCacheKey } from '@/lib/mediaQueries';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import {
  buildSeriesExternalLinks,
  formatTvDate,
  formatTvFileSize,
  getEpisodeDownloadStatus,
  getEpisodeLabel,
  getEpisodeSubtitleItems,
} from '@/components/shared/tvDetails';
import { buildEpisodeCleanupPlan, getShowCleanupMode } from '@/components/shared/tvCleanup';
import { runEpisodeCleanupAction } from '@/components/shared/tvCleanupActions';
import { toast } from 'sonner';

export default function TvEpisodeDetails() {
  const navigate = useNavigate();
  const { id: seriesId, episodeId } = useParams();
  const { config, isServiceReady, tvCleanupPreferences, updateTvCleanupPreferences } = useServiceConfig();
  const [actioningMode, setActioningMode] = useState('');

  const ready = isServiceReady('sonarr');
  const tautulliReady = isServiceReady('tautulli');
  const sonarrKey = getServiceCacheKey(config.sonarr);
  const tautulliKey = getServiceCacheKey(config.tautulli);

  const {
    data,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tv-episode-details', ...sonarrKey, String(seriesId || ''), String(episodeId || ''), ...tautulliKey, tautulliReady ? 'history' : 'no-history'],
    queryFn: () => fetchTvShowDetailsData(config.sonarr, config.tautulli, seriesId, tautulliReady),
    enabled: ready && Boolean(seriesId),
    staleTime: 2 * 60 * 1000,
  });

  const series = data?.series || null;
  const episodes = data?.episodes || [];
  const episodeFiles = data?.episodeFiles || [];
  const historyRows = data?.historyRows || [];

  const episode = useMemo(() => (
    episodes.find((item) => Number(item.id) === Number(episodeId || 0)) || null
  ), [episodes, episodeId]);
  const episodeFile = useMemo(() => {
    if (!episode) return null;
    return episodeFiles.find((item) => Number(item.id) === Number(episode.episodeFileId || 0)) || null;
  }, [episode, episodeFiles]);
  const links = useMemo(() => buildSeriesExternalLinks(series || {}, config.sonarr || {}), [series, config.sonarr]);
  const subtitleItems = useMemo(() => getEpisodeSubtitleItems(episodeFile || {}), [episodeFile]);
  const policyMode = useMemo(() => getShowCleanupMode(tvCleanupPreferences, seriesId), [tvCleanupPreferences, seriesId]);
  const cleanupPlan = useMemo(() => buildEpisodeCleanupPlan({
    episode,
    seriesTitle: series?.title,
    policyMode,
    historyRows,
    manualOverrides: tvCleanupPreferences?.manualOverrides,
    watchedThresholdPercent: tvCleanupPreferences?.watchedThresholdPercent,
    waitDays: tvCleanupPreferences?.waitDays,
  }), [episode, series, policyMode, historyRows, tvCleanupPreferences]);

  const saveManualOverride = async (watched) => {
    if (!episode || !series?.title) return;

    const episodeKey = `${String(series.title).trim().toLowerCase()}::${Number(episode.seasonNumber || 0)}::${Number(episode.episodeNumber || 0)}`;
    const nextManualOverrides = { ...(tvCleanupPreferences?.manualOverrides || {}) };

    if (watched) {
      nextManualOverrides[episodeKey] = {
        watched: true,
        source: 'manual',
        watchedAt: new Date().toISOString(),
      };
    } else {
      delete nextManualOverrides[episodeKey];
    }

    try {
      await updateTvCleanupPreferences({
        ...tvCleanupPreferences,
        manualOverrides: nextManualOverrides,
      });
      toast.success(`Saved manual watched override: ${watched ? 'watched' : 'cleared'}`);
      await refetch();
    } catch (actionError) {
      toast.error(actionError.message || 'Failed to save manual watched override');
    }
  };

  const handleAction = async (mode) => {
    if (!episode) return;

    setActioningMode(mode);
    try {
      await runEpisodeCleanupAction({ sonarrConfig: config.sonarr, episode, mode });
      const cleanupActionLabel = mode === 'delete-unmonitor' ? 'Delete file + unmonitor' : mode === 'unmonitor-only' ? 'Unmonitor only' : 'Mark for cleanup';
      toast.success(`Saved episode cleanup: ${cleanupActionLabel}`);
      await refetch();
    } catch (actionError) {
      toast.error(actionError.message || 'Failed to update episode cleanup state');
    } finally {
      setActioningMode('');
    }
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="Episode details" subtitle="Open an episode to inspect its file and metadata" icon={Tv} accentColor="bg-sky-500/10" />
        <EmptyState icon={Tv} title="Sonarr not configured" description="Add your Sonarr URL and API key in settings to inspect episode details." />
      </div>
    );
  }

  if (isPending && !data) {
    return (
      <div>
        <PageHeader title="Episode details" subtitle="Loading episode metadata" icon={Tv} accentColor="bg-sky-500/10">
          <Button variant="outline" size="sm" onClick={() => navigate(`/tv-shows/${seriesId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Series
          </Button>
        </PageHeader>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !series || !episode) {
    return (
      <div>
        <PageHeader title="Episode details" subtitle="We couldn't load that episode" icon={Tv} accentColor="bg-sky-500/10">
          <Button variant="outline" size="sm" onClick={() => navigate(`/tv-shows/${seriesId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Series
          </Button>
        </PageHeader>
        <EmptyState icon={Tv} title="Episode not available" description={error?.message || 'That episode could not be loaded from Sonarr.'} showSettings={false} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${series.title} • ${getEpisodeLabel(episode)}`}
        subtitle={episode.title || 'Untitled episode'}
        icon={Tv}
        accentColor="bg-sky-500/10"
      >
        <Button variant="outline" size="sm" onClick={() => navigate(`/tv-shows/${seriesId}/seasons/${episode.seasonNumber}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Season
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </Button>
        {links.sonarr && (
          <a href={links.sonarr} target="_blank" rel="noreferrer">
            <Button size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />Open in Sonarr
            </Button>
          </a>
        )}
      </PageHeader>

      <div className="space-y-6">
        <Card className="border-border/70 bg-card/95">
          <CardHeader><CardTitle>Episode summary</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-7 text-muted-foreground">
              {episode.overview || 'No summary is available for this episode yet.'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Air date</p><p className="mt-1 text-sm font-medium">{formatTvDate(episode.airDateUtc || episode.airDate)}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Download status</p><p className="mt-1 text-sm font-medium">{getEpisodeDownloadStatus(episode, episodeFile)}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Monitored</p><p className="mt-1 text-sm font-medium">{episode.monitored === false ? 'No' : 'Yes'}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Season</p><p className="mt-1 text-sm font-medium">{episode.seasonNumber === 0 ? 'Specials' : `Season ${episode.seasonNumber}`}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95">
          <CardHeader><CardTitle>Watching & cleanup</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Watched</p><p className="mt-1 text-sm font-medium">{cleanupPlan.isWatched ? 'Yes' : 'No'}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Eligible</p><p className="mt-1 text-sm font-medium">{cleanupPlan.isEligible ? 'Yes' : 'No'}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Policy mode</p><p className="mt-1 text-sm font-medium">{policyMode}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Last watched</p><p className="mt-1 text-sm font-medium">{cleanupPlan.lastWatchedAt ? formatTvDate(cleanupPlan.lastWatchedAt) : 'Never seen in Tautulli'}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Watch source</p><p className="mt-1 text-sm font-medium">{cleanupPlan.watchSource}</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" disabled={actioningMode !== ''} onClick={() => saveManualOverride(true)}>
                Mark watched manually
              </Button>
              <Button variant="outline" disabled={actioningMode !== '' || cleanupPlan.watchSource !== 'manual'} onClick={() => saveManualOverride(false)}>
                Clear manual override
              </Button>
              <Button variant="outline" disabled={!cleanupPlan.isEligible || !policyMode || policyMode === 'keep-all' || actioningMode !== ''} onClick={() => handleAction(policyMode)}>
                Mark for cleanup
              </Button>
              <Button variant="destructive" disabled={!episodeFile || actioningMode !== ''} onClick={() => handleAction('delete-unmonitor')}>
                Delete file + unmonitor
              </Button>
              <Button variant="secondary" disabled={episode.monitored === false || actioningMode !== ''} onClick={() => handleAction('unmonitor-only')}>
                Unmonitor only
              </Button>
            </div>
            {!tautulliReady && (
              <p className="text-sm text-muted-foreground">Tautulli is not configured, so watched eligibility cannot be confirmed automatically.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95">
          <CardHeader><CardTitle>File details</CardTitle></CardHeader>
          <CardContent>
            {episodeFile ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Quality</p><p className="mt-1 text-sm font-medium">{episodeFile.quality?.quality?.name || '—'}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Video</p><p className="mt-1 text-sm font-medium">{episodeFile.mediaInfo?.videoCodec || '—'}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Audio</p><p className="mt-1 text-sm font-medium">{episodeFile.mediaInfo?.audioCodec || '—'}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">File size</p><p className="mt-1 text-sm font-medium">{formatTvFileSize(episodeFile.size)}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Runtime</p><p className="mt-1 text-sm font-medium">{episodeFile.mediaInfo?.runTime || '—'}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Path</p><p className="mt-1 break-all text-sm font-medium">{episodeFile.path || '—'}</p></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No downloaded file is attached to this episode yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95">
          <CardHeader><CardTitle>Subtitles</CardTitle></CardHeader>
          <CardContent>
            {subtitleItems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {subtitleItems.map((subtitle) => <Badge key={subtitle} variant="secondary">{subtitle}</Badge>)}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No subtitle details are available for this episode file yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
