import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Loader2, HardDrive, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { radarrApi, sonarrApi, tautulliApi } from '@/lib/serviceApi';
import {
  buildOptimizationQualityProfilePayload,
  getOptimizationRecommendation,
  MEDIA_NEXUS_OPTIMIZATION_PROFILE_NAME,
} from '@/lib/qualityUtils';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import QualityProfileSelector from '@/components/quality/QualityProfileSelector';
import RemediationRow from '@/components/quality/RemediationRow';
import { toast } from 'sonner';

const strategyOptions = [
  { value: 'balanced', label: 'Balanced', hint: 'Mix of Plex-friendliness and disk efficiency', icon: ShieldCheck },
  { value: 'space', label: 'Save Disk Space', hint: 'Favor smaller encodes and oversized-file cleanup', icon: HardDrive },
  { value: 'compatibility', label: 'Plex Compatibility', hint: 'Favor formats that direct play on more Plex clients', icon: PlayCircle },
];

export default function QualityManager() {
  const {
    config,
    qualityPreferences,
    optimizationPreferences,
    updateQualityPreferences,
    updateOptimizationPreferences,
    isServiceReady,
  } = useServiceConfig();

  const [radarrProfiles, setRadarrProfiles] = useState([]);
  const [sonarrProfiles, setSonarrProfiles] = useState([]);
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [applyingProfiles, setApplyingProfiles] = useState(false);
  const [filter, setFilter] = useState('all');
  const [tab, setTab] = useState('movies');
  const [playbackEvidence, setPlaybackEvidence] = useState({
    movies: { plays: 0, transcodes: 0, directPlays: 0, lastUser: null },
    tv: { plays: 0, transcodes: 0, directPlays: 0, lastUser: null },
  });

  const qualityPrefs = qualityPreferences || {};
  const optimizationPrefs = optimizationPreferences || {};

  const saveQualityPrefs = async (next, options = {}) => {
    const { notify = true } = options;
    try {
      await updateQualityPreferences(next);
      if (notify) {
        toast.success('Preferred quality profiles updated');
      }
    } catch {
      if (notify) {
        toast.error('Failed to save quality preferences');
      }
      throw new Error('Failed to save quality preferences');
    }
  };

  const saveOptimizationPrefs = async (next) => {
    try {
      await updateOptimizationPreferences(next);
      toast.success('Optimization strategy updated');
    } catch {
      toast.error('Failed to save optimization strategy');
    }
  };

  const radarrReady = isServiceReady('radarr');
  const sonarrReady = isServiceReady('sonarr');
  const tautulliReady = isServiceReady('tautulli');

  const summarizeHistory = (rows) => {
    const plays = rows.length;
    const transcodes = rows.filter((row) => String(row.transcode_decision || row.transcode_decision_count || '').toLowerCase().includes('transcode')).length;
    const directPlays = rows.filter((row) => String(row.transcode_decision || row.media_type || '').toLowerCase().includes('direct')).length;
    const lastRow = rows[0];
    return {
      plays,
      transcodes,
      directPlays,
      lastUser: lastRow?.friendly_name || lastRow?.user || null,
    };
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const promises = [];

    if (radarrReady) {
      promises.push(
        Promise.all([
          radarrApi.getQualityProfiles(config.radarr),
          radarrApi.getMovies(config.radarr),
        ]).then(([profiles, items]) => {
          setRadarrProfiles(profiles);
          setMovies(items);
        }).catch(() => {})
      );
    }

    if (sonarrReady) {
      promises.push(
        Promise.all([
          sonarrApi.getQualityProfiles(config.sonarr),
          sonarrApi.getSeries(config.sonarr),
        ]).then(([profiles, items]) => {
          setSonarrProfiles(profiles);
          setSeries(items);
        }).catch(() => {})
      );
    }

    if (tautulliReady) {
      promises.push(
        Promise.all([
          tautulliApi.getHistory(config.tautulli, { media_type: 'movie', length: '100' }),
          tautulliApi.getHistory(config.tautulli, { media_type: 'episode', length: '100' }),
        ]).then(([movieHistory, tvHistory]) => {
          setPlaybackEvidence({
            movies: summarizeHistory(movieHistory),
            tv: summarizeHistory(tvHistory),
          });
        }).catch(() => {
          setPlaybackEvidence({
            movies: { plays: 0, transcodes: 0, directPlays: 0, lastUser: null },
            tv: { plays: 0, transcodes: 0, directPlays: 0, lastUser: null },
          });
        })
      );
    }

    await Promise.all(promises);
    setLoading(false);
  }, [radarrReady, sonarrReady, tautulliReady, config.radarr, config.sonarr, config.tautulli]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (!radarrReady && !sonarrReady) {
    return (
      <div>
        <PageHeader title="Library Optimization" subtitle="Reduce disk usage and improve Plex compatibility" icon={ShieldCheck} accentColor="bg-primary/10" />
        <EmptyState icon={ShieldCheck} title="No services configured" description="Configure Radarr and/or Sonarr in Settings to start optimizing your library." />
      </div>
    );
  }

  const movieProfileObj = radarrProfiles.find((p) => String(p.id) === String(qualityPrefs.movieProfileId));
  const tvProfileObj = sonarrProfiles.find((p) => String(p.id) === String(qualityPrefs.tvProfileId));

  const enrichedMovies = movies.map((movie) => {
    const currentQuality = movie.movieFile?.quality?.quality?.name || 'No file';
    const preferredProfile = movieProfileObj?.name || 'Not set';
    const remediation = getOptimizationRecommendation({
      ...movie,
      currentQuality,
      preferredProfile,
    }, optimizationPrefs, 'movie');

    return {
      ...movie,
      currentQuality,
      preferredProfile,
      remediation,
      _type: 'movie',
    };
  });

  const enrichedSeries = series.map((show) => {
    const assignedProfile = sonarrProfiles.find((p) => p.id === show.qualityProfileId);
    const currentQuality = assignedProfile?.name || 'Unknown';
    const preferredProfile = tvProfileObj?.name || 'Not set';
    const remediation = getOptimizationRecommendation({
      ...show,
      currentQuality,
      preferredProfile,
    }, optimizationPrefs, 'tv');

    return {
      ...show,
      currentQuality,
      preferredProfile,
      remediation,
      _type: 'tv',
    };
  });

  const filtered = (items) => {
    if (filter === 'all') return items;
    return items.filter((item) => item.remediation.status === filter);
  };

  const handleAction = async (item, action) => {
    setActioningId(item.id);
    try {
      if (item._type === 'movie') {
        await radarrApi.commandSearch(config.radarr, [item.id]);
      } else {
        await sonarrApi.commandSearch(config.sonarr, item.id);
      }

      toast.success(
        action === 'replace'
          ? `Queued search for a more optimal release: ${item.title}`
          : `Searching alternatives for ${item.title}`
      );
    } catch (error) {
      toast.error(`Failed: ${error.message}`);
    }
    setActioningId(null);
  };

  const applyOptimizationGoalProfile = async () => {
    const shouldApply = window.confirm('Build or update a MediaHub Profile in Radarr and Sonarr from these settings?');
    if (!shouldApply) {
      return;
    }

    setApplyingProfiles(true);
    try {
      const nextQualityPrefs = { ...qualityPrefs };
      let syncedServices = 0;

      if (radarrReady) {
        const schema = await radarrApi.getQualityProfileSchema(config.radarr);
        const existing = radarrProfiles.find((profile) => profile.name === MEDIA_NEXUS_OPTIMIZATION_PROFILE_NAME)
          || radarrProfiles.find((profile) => String(profile.id) === String(qualityPrefs.movieProfileId))
          || null;
        const payload = buildOptimizationQualityProfilePayload(schema, optimizationPrefs, existing);
        const savedProfile = existing
          ? await radarrApi.updateQualityProfile(config.radarr, existing.id, payload)
          : await radarrApi.createQualityProfile(config.radarr, payload);

        nextQualityPrefs.movieProfileId = String(savedProfile.id);
        syncedServices += 1;
      }

      if (sonarrReady) {
        const schema = await sonarrApi.getQualityProfileSchema(config.sonarr);
        const existing = sonarrProfiles.find((profile) => profile.name === MEDIA_NEXUS_OPTIMIZATION_PROFILE_NAME)
          || sonarrProfiles.find((profile) => String(profile.id) === String(qualityPrefs.tvProfileId))
          || null;
        const payload = buildOptimizationQualityProfilePayload(schema, optimizationPrefs, existing);
        const savedProfile = existing
          ? await sonarrApi.updateQualityProfile(config.sonarr, existing.id, payload)
          : await sonarrApi.createQualityProfile(config.sonarr, payload);

        nextQualityPrefs.tvProfileId = String(savedProfile.id);
        syncedServices += 1;
      }

      if (!syncedServices) {
        toast.error('Radarr or Sonarr needs to be configured first');
        return;
      }

      await saveQualityPrefs(nextQualityPrefs, { notify: false });
      toast.success('Optimization Goal profile synced to Radarr/Sonarr');
      await fetchAll();
    } catch (error) {
      toast.error(`Failed to sync profile: ${error.message}`);
    } finally {
      setApplyingProfiles(false);
    }
  };

  const allItems = [...enrichedMovies, ...enrichedSeries];
  const poorCount = allItems.filter((item) => item.remediation.status === 'poor').length;
  const minorCount = allItems.filter((item) => item.remediation.status === 'minor').length;
  const okCount = allItems.filter((item) => item.remediation.status === 'ok').length;
  const currentItems = tab === 'movies' ? enrichedMovies : enrichedSeries;
  const strategyMeta = strategyOptions.find((option) => option.value === optimizationPrefs.strategy) || strategyOptions[0];

  return (
    <div>
      <PageHeader
        title="Library Optimization"
        subtitle="Prioritize smaller files, better Plex compatibility, or a balanced middle ground"
        icon={ShieldCheck}
        accentColor="bg-primary/10"
      >
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr] mb-6">
        <QualityProfileSelector
          radarrProfiles={radarrProfiles}
          sonarrProfiles={sonarrProfiles}
          selectedMovie={String(qualityPrefs.movieProfileId || '')}
          selectedTv={String(qualityPrefs.tvProfileId || '')}
          onMovieChange={(id) => saveQualityPrefs({ ...qualityPrefs, movieProfileId: id })}
          onTvChange={(id) => saveQualityPrefs({ ...qualityPrefs, tvProfileId: id })}
        />

        <Card>
          <CardContent className="p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Optimization Goal</p>
              <p className="text-xs text-muted-foreground">Tell MediaHub whether to lean toward smaller files, easier Plex playback, or a safer compromise.</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Primary strategy</p>
                <Select value={optimizationPrefs.strategy || 'balanced'} onValueChange={(value) => saveOptimizationPrefs({ ...optimizationPrefs, strategy: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {strategyOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Target container</p>
                <Select value={optimizationPrefs.targetContainer || 'mp4'} onValueChange={(value) => saveOptimizationPrefs({ ...optimizationPrefs, targetContainer: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mp4">MP4</SelectItem>
                    <SelectItem value="mkv">MKV</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Preferred video codec</p>
                <Select value={optimizationPrefs.preferredVideoCodec || 'h264'} onValueChange={(value) => saveOptimizationPrefs({ ...optimizationPrefs, preferredVideoCodec: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="h264">H.264</SelectItem>
                    <SelectItem value="hevc">HEVC / H.265</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Preferred audio codec</p>
                <Select value={optimizationPrefs.preferredAudioCodec || 'aac'} onValueChange={(value) => saveOptimizationPrefs({ ...optimizationPrefs, preferredAudioCodec: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aac">AAC</SelectItem>
                    <SelectItem value="ac3">AC3</SelectItem>
                    <SelectItem value="eac3">EAC3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Maximum target resolution</p>
              <Select value={optimizationPrefs.maxResolution || '1080p'} onValueChange={(value) => saveOptimizationPrefs({ ...optimizationPrefs, maxResolution: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2160p">2160p</SelectItem>
                  <SelectItem value="1080p">1080p</SelectItem>
                  <SelectItem value="720p">720p</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
              <p className="text-sm font-medium text-foreground">{strategyMeta.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{strategyMeta.hint}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-background/60 p-2">
                  <p className="text-lg font-semibold text-red-400">{poorCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">High Impact</p>
                </div>
                <div className="rounded-md bg-background/60 p-2">
                  <p className="text-lg font-semibold text-amber-400">{minorCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Review</p>
                </div>
                <div className="rounded-md bg-background/60 p-2">
                  <p className="text-lg font-semibold text-emerald-400">{okCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ready</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Build or update a MediaHub Profile in Radarr/Sonarr from these settings, then use it as the preferred target.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyOptimizationGoalProfile}
                  disabled={applyingProfiles || (!radarrReady && !sonarrReady)}
                  className="w-full"
                >
                  {applyingProfiles ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                  Push Optimization Goal settings to Radarr/Sonarr as a Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-foreground">Playback Evidence</p>
            <p className="text-xs text-muted-foreground">Tautulli helps MediaHub see what Plex clients are actually doing, not just what the file looks like on disk.</p>
          </div>
          {tautulliReady ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Movies</p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className="font-semibold text-foreground">{playbackEvidence.movies.plays}</span>
                  <span className="text-muted-foreground">plays</span>
                  <span className="font-semibold text-amber-400">{playbackEvidence.movies.transcodes}</span>
                  <span className="text-muted-foreground">transcodes</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Direct play wins: {playbackEvidence.movies.directPlays}. Last user: {playbackEvidence.movies.lastUser || 'n/a'}.</p>
              </div>
              <div className="rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">TV</p>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className="font-semibold text-foreground">{playbackEvidence.tv.plays}</span>
                  <span className="text-muted-foreground">plays</span>
                  <span className="font-semibold text-amber-400">{playbackEvidence.tv.transcodes}</span>
                  <span className="text-muted-foreground">transcodes</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Direct play wins: {playbackEvidence.tv.directPlays}. Last user: {playbackEvidence.tv.lastUser || 'n/a'}.</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-background/30 p-3 text-xs text-muted-foreground">
              Add Tautulli in Settings to bring real playback history into optimization decisions.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {radarrReady && <TabsTrigger value="movies">Movies ({enrichedMovies.length})</TabsTrigger>}
            {sonarrReady && <TabsTrigger value="tv">TV Shows ({enrichedSeries.length})</TabsTrigger>}
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="poor">High Impact</SelectItem>
              <SelectItem value="minor">Review</SelectItem>
              <SelectItem value="ok">Ready</SelectItem>
            </SelectContent>
          </Select>
          {filter !== 'all' && (
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setFilter('all')}>
              Clear filter
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !(qualityPrefs.movieProfileId || qualityPrefs.tvProfileId) ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Pick your preferred movie and TV quality profiles above so MediaHub can judge what should stay, what should be replaced, and what may be oversized for Plex.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            {filtered(currentItems).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No items match this filter.</p>
            ) : (
              <div className="px-4">
                {filtered(currentItems).map((item) => (
                  <RemediationRow
                    key={item.id}
                    item={item}
                    type={item._type}
                    remediation={item.remediation}
                    onAction={handleAction}
                    actioning={actioningId === item.id}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
