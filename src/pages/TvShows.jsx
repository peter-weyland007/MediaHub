import React, { useState, useEffect } from 'react';
import { Tv, Search, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { sonarrApi } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import MediaCard from '@/components/shared/MediaCard';
import PosterDisplayControls from '@/components/shared/PosterDisplayControls';
import { getMediaGridClassName, getMediaGridStyle } from '@/components/shared/mediaDisplay';
import { toast } from 'sonner';

export default function TvShows() {
  const navigate = useNavigate();
  const {
    config,
    qualityPreferences,
    posterDisplayPreferences,
    updatePosterDisplayPreferences,
    isServiceReady,
  } = useServiceConfig();
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [rootFolders, setRootFolders] = useState([]);
  const [qualityProfiles, setQualityProfiles] = useState([]);
  const [selectedRoot, setSelectedRoot] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [filter, setFilter] = useState('all');

  const ready = isServiceReady('sonarr');

  const fetchSeries = async () => {
    if (!ready) return;
    setLoading(true);
    const data = await sonarrApi.getSeries(config.sonarr);
    setSeries(data);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    if (!ready) return;
    const [roots, profiles] = await Promise.all([
      sonarrApi.getRootFolders(config.sonarr),
      sonarrApi.getQualityProfiles(config.sonarr),
    ]);
    setRootFolders(roots);
    setQualityProfiles(profiles);
    if (roots.length) setSelectedRoot(roots[0].path);

    const preferredProfileId = qualityPreferences.tvProfileId ? String(qualityPreferences.tvProfileId) : '';
    const preferredProfileExists = preferredProfileId && profiles.some((profile) => String(profile.id) === preferredProfileId);
    if (preferredProfileExists) {
      setSelectedQuality(preferredProfileId);
    } else if (profiles.length) {
      setSelectedQuality(String(profiles[0].id));
    }
  };

  useEffect(() => {
    if (ready) {
      fetchSeries();
      fetchProfiles();
    } else {
      setLoading(false);
    }
  }, [ready, qualityPreferences.tvProfileId]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    const results = await sonarrApi.searchSeries(config.sonarr, searchTerm);
    setSearchResults(results);
    setSearching(false);
  };

  const addSeries = async (show) => {
    await sonarrApi.addSeries(config.sonarr, {
      ...show,
      rootFolderPath: selectedRoot,
      qualityProfileId: parseInt(selectedQuality),
      monitored: true,
      addOptions: { searchForMissingEpisodes: true },
    });
    toast.success(`Added "${show.title}"`);
    setSearchOpen(false);
    fetchSeries();
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="TV Shows" subtitle="Manage your Sonarr series library" icon={Tv} accentColor="bg-sky-500/10" />
        <EmptyState icon={Tv} title="Sonarr not configured" description="Add your Sonarr URL and API key in settings to manage TV shows." />
      </div>
    );
  }

  const filteredSeries = series.filter(s => {
    if (filter === 'continuing') return s.status === 'continuing';
    if (filter === 'ended') return s.status === 'ended';
    if (filter === 'monitored') return s.monitored;
    return true;
  });

  const getImage = (show) => {
    const poster = show.images?.find(i => i.coverType === 'poster');
    if (poster?.remoteUrl) return poster.remoteUrl;
    if (poster?.url) return `${config.sonarr.url}${poster.url}`;
    return null;
  };

  const getProgress = (show) => {
    if (!show.statistics?.episodeFileCount || !show.statistics?.episodeCount) return null;
    return `${show.statistics.episodeFileCount}/${show.statistics.episodeCount}`;
  };

  return (
    <div>
      <PageHeader title="TV Shows" subtitle={`${series.length} series in library`} icon={Tv} accentColor="bg-sky-500/10">
        <PosterDisplayControls
          posterDisplayPreferences={posterDisplayPreferences}
          onChange={updatePosterDisplayPreferences}
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shows</SelectItem>
            <SelectItem value="continuing">Continuing</SelectItem>
            <SelectItem value="ended">Ended</SelectItem>
            <SelectItem value="monitored">Monitored</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setSearchOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Add Series
        </Button>
        <Button variant="outline" size="sm" onClick={fetchSeries} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
            <div className={getMediaGridClassName(posterDisplayPreferences)} style={getMediaGridStyle(posterDisplayPreferences)}>
{filteredSeries.map(show => (
            <MediaCard
              key={show.id}
              title={show.title}
              subtitle={getProgress(show) ? `Episodes: ${getProgress(show)}` : show.year ? String(show.year) : ''}
              image={getImage(show)}
              hidePoster={posterDisplayPreferences.hidePosters}
              posterSize={posterDisplayPreferences.posterSize}
              status={show.status === 'continuing' ? 'Continuing' : 'Ended'}
              statusColor={show.status === 'continuing' ? 'bg-sky-500/80 text-white' : 'bg-muted text-muted-foreground'}
              badges={show.network ? [show.network] : []}
              onClick={() => navigate(`/tv-shows/${show.id}`)}
            />
          ))}
        </div>
      )}

      {/* Add Series Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add TV Series</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input placeholder="Search series..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Select value={selectedRoot} onValueChange={setSelectedRoot}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Root folder" /></SelectTrigger>
              <SelectContent>
                {rootFolders.map(f => <SelectItem key={f.path} value={f.path}>{f.path}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedQuality} onValueChange={setSelectedQuality}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Quality" /></SelectTrigger>
              <SelectContent>
                {qualityProfiles.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {searchResults.map((show, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="w-10 h-14 rounded bg-muted shrink-0 overflow-hidden">
                  {show.images?.find(i => i.coverType === 'poster')?.remoteUrl && (
                    <img src={show.images.find(i => i.coverType === 'poster').remoteUrl} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{show.title}</p>
                  <p className="text-xs text-muted-foreground">{show.year}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => addSeries(show)} disabled={series.some(s => s.tvdbId === show.tvdbId)}>
                  {series.some(s => s.tvdbId === show.tvdbId) ? 'Added' : 'Add'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}