import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, ListChecks, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { buildShowCleanupSummary } from '@/components/shared/tvCleanup';
import { getEpisodeLabel } from '@/components/shared/tvDetails';
import { runEpisodeCleanupAction } from '@/components/shared/tvCleanupActions';
import { toast } from 'sonner';

const modeLabels = {
  'keep-all': 'Keep everything',
  'unmonitor-only': 'Unmonitor watched episodes, keep files',
  'delete-unmonitor': 'Delete watched episodes and unmonitor them',
};

export default function TvCleanupQueue() {
  const { config, isServiceReady, tvCleanupPreferences, updateTvCleanupPreferences } = useServiceConfig();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [historyRows, setHistoryRows] = useState([]);
  const [series, setSeries] = useState([]);
  const [filter, setFilter] = useState('eligible');
  const [actioningId, setActioningId] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const sonarrReady = isServiceReady('sonarr');
  const tautulliReady = isServiceReady('tautulli');

  useEffect(() => {
    let cancelled = false;

    const loadQueue = async () => {
      if (!sonarrReady || !tautulliReady) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const [seriesList, history] = await Promise.all([
          sonarrApi.getSeries(config.sonarr),
          tautulliApi.getHistory(config.tautulli, { media_type: 'episode', length: '500' }),
        ]);

        const hydratedSeries = await Promise.all((seriesList || []).map(async (series) => {
          const [episodes, episodeFiles] = await Promise.all([
            sonarrApi.getEpisodes(config.sonarr, series.id),
            sonarrApi.getEpisodeFiles(config.sonarr, series.id),
          ]);
          return {
            ...series,
            episodes: Array.isArray(episodes) ? episodes : [],
            episodeFiles: Array.isArray(episodeFiles) ? episodeFiles : [],
          };
        }));

        if (!cancelled) {
          setSeries(hydratedSeries);
          setHistoryRows(Array.isArray(history) ? history : []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || 'Failed to load watched cleanup queue');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadQueue();
    return () => { cancelled = true; };
  }, [config.sonarr, config.tautulli, sonarrReady, tautulliReady, refreshToken]);

  const queueRows = useMemo(() => {
    const rows = [];
    for (const show of series) {
      const summary = buildShowCleanupSummary({
        series: show,
        episodes: show.episodes,
        historyRows,
        preferences: tvCleanupPreferences,
      });
      for (const item of summary.plans) {
        if (summary.policyMode === 'keep-all') continue;
        const episodeFile = show.episodeFiles.find((file) => Number(file.id) === Number(item.episode.episodeFileId || 0)) || null;
        rows.push({
          seriesId: show.id,
          seriesTitle: show.title,
          policyMode: summary.policyMode,
          episode: item.episode,
          episodeFile,
          plan: item.plan,
          manualOverrides: tvCleanupPreferences?.manualOverrides || {},
        });
      }
    }
    return rows;
  }, [series, historyRows, tvCleanupPreferences]);

  const filteredRows = useMemo(() => {
    if (filter === 'eligible') {
      return queueRows.filter((row) => row.plan.isEligible);
    }
    if (filter === 'watched') {
      return queueRows.filter((row) => row.plan.isWatched);
    }
    return queueRows;
  }, [queueRows, filter]);

  const handleManualOverride = async (row, watched) => {
    const episodeKey = `${String(row.seriesTitle).trim().toLowerCase()}::${Number(row.episode.seasonNumber || 0)}::${Number(row.episode.episodeNumber || 0)}`;
    const nextManualOverrides = { ...(tvCleanupPreferences?.manualOverrides || {}) };
    const label = `${row.seriesTitle} ${getEpisodeLabel(row.episode)}`;

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
      toast.success(`Saved queue watched override: ${label}`);
      setRefreshToken((value) => value + 1);
    } catch (actionError) {
      toast.error(actionError.message || 'Failed to save queue watched override');
    }
  };

  const handleCleanup = async (row) => {
    setActioningId(row.episode.id);
    try {
      await runEpisodeCleanupAction({ sonarrConfig: config.sonarr, episode: row.episode, mode: row.policyMode });
      const cleanupActionLabel = row.policyMode === 'delete-unmonitor' ? 'Delete file + unmonitor' : 'Unmonitor only';
      const label = `${row.seriesTitle} ${getEpisodeLabel(row.episode)}`;
      toast.success(`Applied queue cleanup: ${label} → ${cleanupActionLabel}`);
      setRefreshToken((value) => value + 1);
    } catch (actionError) {
      toast.error(actionError.message || 'Failed to apply queue cleanup');
    } finally {
      setActioningId(null);
    }
  };

  if (!sonarrReady || !tautulliReady) {
    return (
      <div>
        <PageHeader title="Watched Cleanup" subtitle="Review watched TV episodes that can be safely cleaned up" icon={ListChecks} accentColor="bg-sky-500/10" />
        <EmptyState icon={ListChecks} title="Sonarr and Tautulli required" description="Configure both Sonarr and Tautulli in Settings to build a watched cleanup queue." />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Watched Cleanup" subtitle="Building eligible episode queue" icon={ListChecks} accentColor="bg-sky-500/10">
          <Button variant="outline" size="sm" disabled>
            <Loader2 className="w-4 h-4 animate-spin" />
          </Button>
        </PageHeader>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <PageHeader title="Watched Cleanup" subtitle="We couldn't build the cleanup queue" icon={ListChecks} accentColor="bg-sky-500/10" />
        <EmptyState icon={ListChecks} title="Cleanup queue unavailable" description={error} showSettings={false} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Watched Cleanup" subtitle="Review watched TV episodes that match your cleanup policies" icon={ListChecks} accentColor="bg-sky-500/10">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="eligible">Eligible episodes</SelectItem>
            <SelectItem value="watched">Watched episodes</SelectItem>
            <SelectItem value="all">All policy episodes</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setRefreshToken((value) => value + 1)}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </PageHeader>

      <Card className="border-border/70 bg-card/95 mb-6">
        <CardHeader><CardTitle>Eligible episodes</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Eligible now</p><p className="mt-1 text-sm font-medium">{queueRows.filter((row) => row.plan.isEligible).length}</p></div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Watched</p><p className="mt-1 text-sm font-medium">{queueRows.filter((row) => row.plan.isWatched).length}</p></div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Queue rows</p><p className="mt-1 text-sm font-medium">{queueRows.length}</p></div>
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Modes</p><p className="mt-1 text-sm font-medium">Unmonitor watched episodes, keep files / Delete watched episodes and unmonitor them</p></div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 bg-card/95">
        <CardContent>
          {filteredRows.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No queue items match this filter yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Show</TableHead>
                  <TableHead>Episode</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Watched</TableHead>
                  <TableHead>Eligible</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead className="text-right">Apply eligible cleanup</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => {
                  const label = `${row.seriesTitle} ${getEpisodeLabel(row.episode)}`;
                  const cleanupActionLabel = row.policyMode === 'delete-unmonitor' ? 'Delete file + unmonitor' : 'Unmonitor only';
                  return (
                    <TableRow key={row.episode.id}>
                      <TableCell>
                        <Link className="font-medium text-primary hover:underline" to={`/tv-shows/${row.seriesId}`}>{row.seriesTitle}</Link>
                      </TableCell>
                      <TableCell>
                        <Link className="hover:underline" to={`/tv-shows/${row.seriesId}/episodes/${row.episode.id}`}>{label}</Link>
                      </TableCell>
                      <TableCell>{modeLabels[row.policyMode]}</TableCell>
                      <TableCell>{row.plan.isWatched ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{row.plan.isEligible ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{row.episodeFile ? 'Present' : 'Missing'}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleManualOverride(row, true)}>
                            Mark watched manually
                          </Button>
                          <Button size="sm" variant="ghost" disabled={row.plan.watchSource !== 'manual'} onClick={() => handleManualOverride(row, false)}>
                            Clear manual override
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" disabled={!row.plan.isEligible || actioningId === row.episode.id} onClick={() => handleCleanup(row)}>
                          {actioningId === row.episode.id ? 'Working…' : cleanupActionLabel}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
