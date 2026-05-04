import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Tv } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { sonarrApi, tautulliApi } from '@/lib/serviceApi';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import {
  formatTvDate,
  getEpisodeDownloadStatus,
  getEpisodeLabel,
} from '@/components/shared/tvDetails';
import { buildShowCleanupSummary } from '@/components/shared/tvCleanup';
import { runEpisodeCleanupAction } from '@/components/shared/tvCleanupActions';
import { toast } from 'sonner';

export default function TvSeasonDetails() {
  const navigate = useNavigate();
  const { id: seriesId, seasonNumber } = useParams();
  const { config, isServiceReady, tvCleanupPreferences } = useServiceConfig();
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [episodeFiles, setEpisodeFiles] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [actioningId, setActioningId] = useState(null);

  const ready = isServiceReady('sonarr');
  const tautulliReady = isServiceReady('tautulli');
  const numericSeasonNumber = Number(seasonNumber || 0);

  useEffect(() => {
    let cancelled = false;

    const loadSeason = async () => {
      if (!ready || !seriesId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const requests = [
          sonarrApi.getSeriesById(config.sonarr, seriesId),
          sonarrApi.getEpisodes(config.sonarr, seriesId),
          sonarrApi.getEpisodeFiles(config.sonarr, seriesId),
        ];
        if (tautulliReady) {
          requests.push(tautulliApi.getHistory(config.tautulli, { media_type: 'episode', length: '500' }));
        }

        const [seriesData, allEpisodes, allEpisodeFiles, history = []] = await Promise.all(requests);

        if (!cancelled) {
          setSeries(seriesData);
          setEpisodes(Array.isArray(allEpisodes) ? allEpisodes : []);
          setEpisodeFiles(Array.isArray(allEpisodeFiles) ? allEpisodeFiles : []);
          setHistoryRows(Array.isArray(history) ? history : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Failed to load season details');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSeason();

    return () => {
      cancelled = true;
    };
  }, [config.sonarr, config.tautulli, ready, seriesId, tautulliReady, refreshToken]);

  const fileMap = useMemo(() => new Map(episodeFiles.map((file) => [Number(file.id), file])), [episodeFiles]);
  const seasonEpisodes = useMemo(() => {
    return episodes
      .filter((episode) => Number(episode.seasonNumber || 0) === numericSeasonNumber)
      .sort((left, right) => Number(left.episodeNumber || 0) - Number(right.episodeNumber || 0));
  }, [episodes, numericSeasonNumber]);
  const cleanupSummary = useMemo(() => buildShowCleanupSummary({
    series,
    episodes: seasonEpisodes,
    historyRows,
    preferences: tvCleanupPreferences,
  }), [series, seasonEpisodes, historyRows, tvCleanupPreferences]);
  const cleanupPlanByEpisodeId = useMemo(() => new Map(cleanupSummary.plans.map((item) => [Number(item.episode.id), item.plan])), [cleanupSummary]);

  const downloadedCount = seasonEpisodes.filter((episode) => episode.hasFile || fileMap.has(Number(episode.episodeFileId))).length;
  const monitoredCount = seasonEpisodes.filter((episode) => episode.monitored !== false).length;

  const handleCleanup = async (episode) => {
    const plan = cleanupPlanByEpisodeId.get(Number(episode.id));
    if (!plan?.isEligible) {
      toast('Episode is not eligible for cleanup yet.');
      return;
    }

    setActioningId(episode.id);
    try {
      await runEpisodeCleanupAction({ sonarrConfig: config.sonarr, episode, mode: cleanupSummary.policyMode });
      const cleanupActionLabel = cleanupSummary.policyMode === 'delete-unmonitor' ? 'Delete file + unmonitor' : 'Unmonitor only';
      const label = getEpisodeLabel(episode);
      toast.success(`Applied cleanup: ${label} → ${cleanupActionLabel}`);
      setRefreshToken((value) => value + 1);
    } catch (actionError) {
      toast.error(actionError.message || 'Failed to clean up episode');
    } finally {
      setActioningId(null);
    }
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="Season details" subtitle="Open a series season to inspect its episodes" icon={Tv} accentColor="bg-sky-500/10" />
        <EmptyState icon={Tv} title="Sonarr not configured" description="Add your Sonarr URL and API key in settings to inspect season details." />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Season details" subtitle="Loading episode list" icon={Tv} accentColor="bg-sky-500/10">
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

  if (error || !series) {
    return (
      <div>
        <PageHeader title="Season details" subtitle="We couldn't load that season" icon={Tv} accentColor="bg-sky-500/10">
          <Button variant="outline" size="sm" onClick={() => navigate('/tv-shows')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to TV Shows
          </Button>
        </PageHeader>
        <EmptyState icon={Tv} title="Season not available" description={error || 'That season could not be loaded from Sonarr.'} showSettings={false} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${series.title} • ${numericSeasonNumber === 0 ? 'Specials' : `Season ${numericSeasonNumber}`}`}
        subtitle={`${downloadedCount}/${seasonEpisodes.length || 0} downloaded • ${monitoredCount}/${seasonEpisodes.length || 0} monitored`}
        icon={Tv}
        accentColor="bg-sky-500/10"
      >
        <Button variant="outline" size="sm" onClick={() => navigate(`/tv-shows/${seriesId}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Series
        </Button>
      </PageHeader>

      <div className="space-y-6">
        <Card className="border-border/70 bg-card/95">
          <CardHeader><CardTitle>Download status</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Episodes</p><p className="mt-1 text-sm font-medium">{seasonEpisodes.length || 0}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Downloaded</p><p className="mt-1 text-sm font-medium">{downloadedCount}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Watched</p><p className="mt-1 text-sm font-medium">{cleanupSummary.watchedCount}</p></div>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Eligible</p><p className="mt-1 text-sm font-medium">{cleanupSummary.eligibleCount}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95">
          <CardHeader><CardTitle>Season episodes</CardTitle></CardHeader>
          <CardContent>
            {seasonEpisodes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Episode</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Air date</TableHead>
                    <TableHead>Download status</TableHead>
                    <TableHead>Watched</TableHead>
                    <TableHead>Eligible</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead className="text-right">Apply cleanup</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {seasonEpisodes.map((episode) => {
                    const episodeFile = fileMap.get(Number(episode.episodeFileId));
                    const plan = cleanupPlanByEpisodeId.get(Number(episode.id));
                    return (
                      <TableRow
                        key={episode.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/tv-shows/${seriesId}/episodes/${episode.id}`)}
                      >
                        <TableCell className="font-medium">{getEpisodeLabel(episode)}</TableCell>
                        <TableCell>{episode.title || 'Untitled episode'}</TableCell>
                        <TableCell>{formatTvDate(episode.airDateUtc || episode.airDate)}</TableCell>
                        <TableCell>{getEpisodeDownloadStatus(episode, episodeFile)}</TableCell>
                        <TableCell>{plan?.isWatched ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{plan?.isEligible ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{episodeFile?.quality?.quality?.name || '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={!plan?.isEligible || actioningId === episode.id}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCleanup(episode);
                            }}
                          >
                            {actioningId === episode.id ? 'Working…' : 'Apply cleanup'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">No episodes are available for this season yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
