import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Loader2, RefreshCw, Tv } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { fetchTvShowDetailsData, getServiceCacheKey } from '@/lib/mediaQueries';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import {
  buildSeasonRows,
  buildSeriesExternalLinks,
  formatTvDate,
  formatTvFileSize,
  getPrimarySeriesImage,
} from '@/components/shared/tvDetails';
import { buildShowCleanupSummary, TV_CLEANUP_MODE_OPTIONS } from '@/components/shared/tvCleanup';
import { runEpisodeCleanupAction } from '@/components/shared/tvCleanupActions';
import { toast } from 'sonner';

export default function TvShowDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    config,
    isServiceReady,
    tvCleanupPreferences,
    updateTvCleanupPreferences,
  } = useServiceConfig();
  const [actioning, setActioning] = useState(false);

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
    queryKey: ['tv-show-details', ...sonarrKey, String(id || ''), ...tautulliKey, tautulliReady ? 'history' : 'no-history'],
    queryFn: () => fetchTvShowDetailsData(config.sonarr, config.tautulli, id, tautulliReady),
    enabled: ready && Boolean(id),
    staleTime: 2 * 60 * 1000,
  });

  const series = data?.series || null;
  const episodes = data?.episodes || [];
  const episodeFiles = data?.episodeFiles || [];
  const historyRows = data?.historyRows || [];
  const posterImage = useMemo(() => getPrimarySeriesImage(series || {}, config.sonarr || {}), [series, config.sonarr]);
  const links = useMemo(() => buildSeriesExternalLinks(series || {}, config.sonarr || {}), [series, config.sonarr]);
  const totalEpisodeFiles = episodeFiles.length;
  const latestEpisodeFile = episodeFiles[0] || null;
  const stats = series?.statistics || {};
  const seasonRows = useMemo(() => buildSeasonRows(series || {}, episodes, episodeFiles), [series, episodes, episodeFiles]);
  const cleanupSummary = useMemo(() => buildShowCleanupSummary({
    series,
    episodes,
    historyRows,
    preferences: tvCleanupPreferences,
  }), [series, episodes, historyRows, tvCleanupPreferences]);
  const currentPolicyMode = cleanupSummary.policyMode || 'keep-all';

  const updateShowPolicy = async (mode) => {
    const nextPreferences = {
      ...tvCleanupPreferences,
      shows: {
        ...(tvCleanupPreferences?.shows || {}),
        [String(id)]: { mode },
      },
    };
    const savedLabel = TV_CLEANUP_MODE_OPTIONS.find((option) => option.value === mode)?.label || mode;

    try {
      await updateTvCleanupPreferences(nextPreferences);
      toast.success(`Saved cleanup policy: ${savedLabel}`);
    } catch {
      toast.error('Failed to save cleanup policy');
    }
  };

  const applyPolicyNow = async () => {
    const eligiblePlans = cleanupSummary.plans.filter((item) => item.plan.isEligible);
    if (!eligiblePlans.length) {
      toast('No watched episodes are eligible yet.');
      return;
    }

    setActioning(true);
    try {
      for (const item of eligiblePlans) {
        await runEpisodeCleanupAction({
          sonarrConfig: config.sonarr,
          episode: item.episode,
          mode: cleanupSummary.policyMode,
        });
      }
      const appliedLabel = TV_CLEANUP_MODE_OPTIONS.find((option) => option.value === cleanupSummary.policyMode)?.label || cleanupSummary.policyMode;
      toast.success(`Applied cleanup policy: ${appliedLabel} (${eligiblePlans.length} episodes)`);
      await refetch();
    } catch (actionError) {
      toast.error(actionError.message || 'Failed to apply cleanup policy');
    } finally {
      setActioning(false);
    }
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="TV details" subtitle="Open a series to see its metadata" icon={Tv} accentColor="bg-sky-500/10" />
        <EmptyState icon={Tv} title="Sonarr not configured" description="Add your Sonarr URL and API key in settings to view TV show details." />
      </div>
    );
  }

  if (isPending && !data) {
    return (
      <div>
        <PageHeader title="TV details" subtitle="Loading series metadata" icon={Tv} accentColor="bg-sky-500/10">
          <Button variant="outline" size="sm" onClick={() => navigate('/tv-shows')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to TV Shows
          </Button>
        </PageHeader>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !series) {
    return (
      <div>
        <PageHeader title="TV details" subtitle="We couldn't load that series" icon={Tv} accentColor="bg-sky-500/10">
          <Button variant="outline" size="sm" onClick={() => navigate('/tv-shows')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to TV Shows
          </Button>
        </PageHeader>
        <EmptyState icon={Tv} title="Series not available" description={error?.message || 'That series could not be found in Sonarr.'} showSettings={false} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={series.title} subtitle={`${series.year || 'Unknown year'} • ${series.network || 'Unknown network'}`} icon={Tv} accentColor="bg-sky-500/10">
        <Button variant="outline" size="sm" onClick={() => navigate('/tv-shows')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to TV Shows
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

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="overflow-hidden border-border/70 bg-card/95">
          <div className="aspect-[2/3] bg-muted">
            {posterImage ? (
              <img src={posterImage} alt={series.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl font-bold text-muted-foreground/20">
                {series.title?.[0]}
              </div>
            )}
          </div>
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Genres</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(series.genres || []).length > 0 ? (
                  series.genres.map((genre) => <Badge key={genre} variant="secondary">{genre}</Badge>)
                ) : (
                  <span className="text-sm text-muted-foreground">No genres available</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Links</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {links.imdb && <a href={links.imdb} target="_blank" rel="noreferrer"><Button variant="outline" size="sm">IMDb</Button></a>}
                {links.tvdb && <a href={links.tvdb} target="_blank" rel="noreferrer"><Button variant="outline" size="sm">TVDb</Button></a>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/95">
            <CardHeader><CardTitle>About this show</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">
                {series.overview || 'No description is available for this show yet.'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Network</p><p className="mt-1 text-sm font-medium">{series.network || 'Unknown'}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Series status</p><p className="mt-1 text-sm font-medium">{series.status || 'Unknown'}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">First aired</p><p className="mt-1 text-sm font-medium">{formatTvDate(series.firstAired)}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Rating</p><p className="mt-1 text-sm font-medium">{series.ratings?.value || '—'}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95">
            <CardHeader><CardTitle>Cleanup policy</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Tautulli watched signal • {tvCleanupPreferences.watchedThresholdPercent}% threshold • wait {tvCleanupPreferences.waitDays} day{tvCleanupPreferences.waitDays === 1 ? '' : 's'}</p>
                  <Select value={currentPolicyMode} onValueChange={updateShowPolicy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cleanup mode" />
                    </SelectTrigger>
                    <SelectContent>
                      {TV_CLEANUP_MODE_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={applyPolicyNow} disabled={actioning || cleanupSummary.policyMode === 'keep-all'}>
                  {actioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Apply policy now
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Episodes watched</p><p className="mt-1 text-sm font-medium">{cleanupSummary.watchedCount}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Eligible now</p><p className="mt-1 text-sm font-medium">{cleanupSummary.eligibleCount}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Current mode</p><p className="mt-1 text-sm font-medium">{TV_CLEANUP_MODE_OPTIONS.find((option) => option.value === cleanupSummary.policyMode)?.label || 'Keep everything'}</p></div>
              </div>
              <p className="text-xs text-muted-foreground">Modes: Keep everything • Unmonitor watched episodes, keep files • Delete watched episodes and unmonitor them</p>
              {!tautulliReady && (
                <p className="text-sm text-muted-foreground">Configure Tautulli to detect watched episodes before automated cleanup becomes eligible.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95">
            <CardHeader><CardTitle>Library coverage</CardTitle></CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Seasons</p><p className="mt-1 text-sm font-medium">{stats.seasonCount || seasonRows.length || 0}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Episodes downloaded</p><p className="mt-1 text-sm font-medium">{stats.episodeFileCount || 0}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Episodes tracked</p><p className="mt-1 text-sm font-medium">{stats.totalEpisodeCount || 0}</p></div>
                <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">On disk</p><p className="mt-1 text-sm font-medium">{formatTvFileSize(stats.sizeOnDisk)}</p></div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95">
            <CardHeader><CardTitle>Season guide</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {seasonRows.length > 0 ? (
                seasonRows.map((season) => (
                  <div key={season.seasonNumber} className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{season.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {season.downloadedEpisodes}/{season.totalEpisodes || 0} downloaded • {season.monitoredEpisodes}/{season.totalEpisodes || 0} monitored
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/tv-shows/${id}/seasons/${season.seasonNumber}`)}>
                      Open episodes
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No seasons are available for this series yet.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95">
            <CardHeader><CardTitle>Latest file snapshot</CardTitle></CardHeader>
            <CardContent>
              {latestEpisodeFile ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Files sampled</p><p className="mt-1 text-sm font-medium">{totalEpisodeFiles}</p></div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Quality</p><p className="mt-1 text-sm font-medium">{latestEpisodeFile.quality?.quality?.name || '—'}</p></div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Video</p><p className="mt-1 text-sm font-medium">{latestEpisodeFile.mediaInfo?.videoCodec || '—'}</p></div>
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Audio</p><p className="mt-1 text-sm font-medium">{latestEpisodeFile.mediaInfo?.audioCodec || '—'}</p></div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No downloaded episode files are available for this series yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
