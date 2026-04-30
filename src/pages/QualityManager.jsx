import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { radarrApi, sonarrApi } from '@/lib/serviceApi';
import { getRemediation } from '@/lib/qualityUtils';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import QualityProfileSelector from '@/components/quality/QualityProfileSelector';
import RemediationRow from '@/components/quality/RemediationRow';
import { toast } from 'sonner';

const PREF_KEY = 'media_hub_quality_prefs';

export default function QualityManager() {
  const { config, isServiceReady } = useServiceConfig();

  const [radarrProfiles, setRadarrProfiles] = useState([]);
  const [sonarrProfiles, setSonarrProfiles] = useState([]);
  const [movies, setMovies] = useState([]);
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | poor | minor | ok
  const [tab, setTab] = useState('movies');

  // Preferred profile IDs persisted in localStorage
  const [prefs, setPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PREF_KEY)) || {}; } catch { return {}; }
  });

  const savePrefs = (next) => {
    setPrefs(next);
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
  };

  const radarrReady = isServiceReady('radarr');
  const sonarrReady = isServiceReady('sonarr');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const promises = [];
    if (radarrReady) {
      promises.push(
        Promise.all([radarrApi.getQualityProfiles(config.radarr), radarrApi.getMovies(config.radarr)])
          .then(([profiles, mv]) => { setRadarrProfiles(profiles); setMovies(mv); })
          .catch(() => {})
      );
    }
    if (sonarrReady) {
      promises.push(
        Promise.all([sonarrApi.getQualityProfiles(config.sonarr), sonarrApi.getSeries(config.sonarr)])
          .then(([profiles, sv]) => { setSonarrProfiles(profiles); setSeries(sv); })
          .catch(() => {})
      );
    }
    await Promise.all(promises);
    setLoading(false);
  }, [radarrReady, sonarrReady]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (!radarrReady && !sonarrReady) {
    return (
      <div>
        <PageHeader title="Quality Manager" subtitle="Audit & remediate media quality" icon={ShieldCheck} accentColor="bg-primary/10" />
        <EmptyState icon={ShieldCheck} title="No services configured" description="Configure Radarr and/or Sonarr in Settings to use the Quality Manager." />
      </div>
    );
  }

  // Build enriched movie items
  const movieProfileObj = radarrProfiles.find(p => String(p.id) === String(prefs.movieProfileId));
  const tvProfileObj = sonarrProfiles.find(p => String(p.id) === String(prefs.tvProfileId));

  const enrichedMovies = movies.map(m => {
    const currentQuality = m.movieFile?.quality?.quality?.name || null;
    const preferredProfile = movieProfileObj?.name || null;
    const remediation = (currentQuality && preferredProfile)
      ? getRemediation(currentQuality, preferredProfile)
      : { status: 'ok', label: 'No File', color: 'emerald', action: null };
    return { ...m, currentQuality, preferredProfile, remediation, _type: 'movie' };
  });

  const enrichedSeries = series.map(s => {
    const currentQuality = s.episodeFileCount > 0
      ? (s.statistics?.episodeFileCount ? `${s.episodeFileCount} files` : null)
      : null;
    // For series we compare the assigned quality profile name vs preferred
    const assignedProfile = sonarrProfiles.find(p => p.id === s.qualityProfileId);
    const preferredProfile = tvProfileObj?.name || null;
    const remediation = (assignedProfile && preferredProfile)
      ? getRemediation(assignedProfile.name, preferredProfile)
      : { status: 'ok', label: 'No Files', color: 'emerald', action: null };
    // Show the assigned profile name as "current"
    return { ...s, currentQuality: assignedProfile?.name || 'Unknown', preferredProfile, remediation, _type: 'tv' };
  });

  const filtered = (items) => {
    if (filter === 'all') return items;
    return items.filter(i => i.remediation.status === filter);
  };

  const handleAction = async (item, action) => {
    setActioningId(item.id);
    try {
      if (action === 'search') {
        if (item._type === 'movie') {
          await radarrApi.commandSearch(config.radarr, [item.id]);
          toast.success(`Searching for upgrade: ${item.title}`);
        } else {
          await sonarrApi.commandSearch(config.sonarr, item.id);
          toast.success(`Searching for upgrade: ${item.title}`);
        }
      } else if (action === 'replace') {
        // Trigger an automatic search which will grab the best available release
        if (item._type === 'movie') {
          await radarrApi.commandSearch(config.radarr, [item.id]);
          toast.success(`Queued replacement search: ${item.title}`);
        } else {
          await sonarrApi.commandSearch(config.sonarr, item.id);
          toast.success(`Queued replacement search: ${item.title}`);
        }
      }
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    }
    setActioningId(null);
  };

  // Stats
  const allItems = [...enrichedMovies, ...enrichedSeries];
  const poorCount = allItems.filter(i => i.remediation.status === 'poor').length;
  const minorCount = allItems.filter(i => i.remediation.status === 'minor').length;
  const okCount = allItems.filter(i => i.remediation.status === 'ok').length;

  const currentItems = tab === 'movies' ? enrichedMovies : enrichedSeries;

  return (
    <div>
      <PageHeader title="Quality Manager" subtitle="Audit & remediate media quality for Plex" icon={ShieldCheck} accentColor="bg-primary/10">
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {/* Profile selector */}
      <QualityProfileSelector
        radarrProfiles={radarrProfiles}
        sonarrProfiles={sonarrProfiles}
        selectedMovie={String(prefs.movieProfileId || '')}
        selectedTv={String(prefs.tvProfileId || '')}
        onMovieChange={(id) => savePrefs({ ...prefs, movieProfileId: id })}
        onTvChange={(id) => savePrefs({ ...prefs, tvProfileId: id })}
      />

      {/* Summary stats */}
      {(prefs.movieProfileId || prefs.tvProfileId) && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 text-center cursor-pointer border-red-500/20 hover:border-red-500/40 transition-colors" onClick={() => setFilter(filter === 'poor' ? 'all' : 'poor')}>
            <p className="text-2xl font-bold text-red-400">{poorCount}</p>
            <p className="text-xs text-muted-foreground">Below Profile</p>
          </Card>
          <Card className="p-4 text-center cursor-pointer border-amber-500/20 hover:border-amber-500/40 transition-colors" onClick={() => setFilter(filter === 'minor' ? 'all' : 'minor')}>
            <p className="text-2xl font-bold text-amber-400">{minorCount}</p>
            <p className="text-xs text-muted-foreground">Upgradable</p>
          </Card>
          <Card className="p-4 text-center cursor-pointer border-emerald-500/20 hover:border-emerald-500/40 transition-colors" onClick={() => setFilter(filter === 'ok' ? 'all' : 'ok')}>
            <p className="text-2xl font-bold text-emerald-400">{okCount}</p>
            <p className="text-xs text-muted-foreground">Meets Profile</p>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center justify-between mb-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {radarrReady && <TabsTrigger value="movies">Movies ({enrichedMovies.length})</TabsTrigger>}
            {sonarrReady && <TabsTrigger value="tv">TV Shows ({enrichedSeries.length})</TabsTrigger>}
          </TabsList>
        </Tabs>
        {filter !== 'all' && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setFilter('all')}>
            Clear filter
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !(prefs.movieProfileId || prefs.tvProfileId) ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Select a preferred quality profile above to start auditing your library.
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y divide-border/0">
            {filtered(currentItems).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No items match this filter.</p>
            ) : (
              <div className="px-4">
                {filtered(currentItems).map(item => (
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