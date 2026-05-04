import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Tv, Search, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { fetchTvReferenceData, fetchTvShowDetailsData, getServiceCacheKey } from '@/lib/mediaQueries';
import { sonarrApi } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import MediaCard from '@/components/shared/MediaCard';
import PosterDisplayControls from '@/components/shared/PosterDisplayControls';
import { getMediaGridClassName, getMediaGridStyle } from '@/components/shared/mediaDisplay';
import { toast } from 'sonner';

export default function TvShows() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    config,
    qualityPreferences,
    posterDisplayPreferences,
    updatePosterDisplayPreferences,
    isServiceReady,
  } = useServiceConfig();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedRoot, setSelectedRoot] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [filter, setFilter] = useState('all');

  const ready = isServiceReady('sonarr');
  const serviceKey = getServiceCacheKey(config.sonarr);

  const {
    data: seriesData,
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['tv-shows', ...serviceKey],
    queryFn: () => sonarrApi.getSeries(config.sonarr),
    enabled: ready,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const {
    data: referenceData,
    refetch: refetchReferenceData,
  } = useQuery({
    queryKey: ['tv-shows-reference', ...serviceKey, String(qualityPreferences.tvProfileId || '')],
    queryFn: () => fetchTvReferenceData(config.sonarr),
    enabled: ready,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const series = seriesData || [];
  const rootFolders = referenceData?.rootFolders || [];
  const qualityProfiles = referenceData?.qualityProfiles || [];

  useEffect(() => {
    if (!rootFolders.length) {
      setSelectedRoot('');
      return;
    }

    setSelectedRoot((current) => {
      if (current && rootFolders.some((folder) => folder.path === current)) {
        return current;
      }
      return rootFolders[0].path;
    });
  }, [rootFolders]);

  useEffect(() => {
    if (!qualityProfiles.length) {
      setSelectedQuality('');
      return;
    }

    const preferredProfileId = qualityPreferences.tvProfileId ? String(qualityPreferences.tvProfileId) : '';
    const preferredProfileExists = preferredProfileId && qualityProfiles.some((profile) => String(profile.id) === preferredProfileId);

    setSelectedQuality((current) => {
      if (current && qualityProfiles.some((profile) => String(profile.id) === current)) {
        return current;
      }
      if (preferredProfileExists) {
        return preferredProfileId;
      }
      return String(qualityProfiles[0].id);
    });
  }, [qualityProfiles, qualityPreferences.tvProfileId]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const results = await sonarrApi.searchSeries(config.sonarr, searchTerm);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([refetch(), refetchReferenceData()]);
  };

  const addSeries = async (show) => {
    await sonarrApi.addSeries(config.sonarr, {
      ...show,
      rootFolderPath: selectedRoot,
      qualityProfileId: parseInt(selectedQuality, 10),
      monitored: true,
      addOptions: { searchForMissingEpisodes: true },
    });
    toast.success(`Added "${show.title}"`);
    setSearchOpen(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tv-shows'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const filteredSeries = useMemo(() => series.filter((show) => {
    if (filter === 'continuing') return show.status === 'continuing';
    if (filter === 'ended') return show.status === 'ended';
    if (filter === 'monitored') return show.monitored;
    return true;
  }), [series, filter]);

  const getImage = (show) => {
    const poster = show.images?.find((image) => image.coverType === 'poster');
    if (poster?.remoteUrl) return poster.remoteUrl;
    if (poster?.url) return `${config.sonarr.url}${poster.url}`;
    return null;
  };

  const getProgress = (show) => {
    if (!show.statistics?.episodeFileCount || !show.statistics?.episodeCount) return null;
    return `${show.statistics.episodeFileCount}/${show.statistics.episodeCount}`;
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="TV Shows" subtitle="Manage your Sonarr series library" icon={Tv} accentColor="bg-sky-500/10" />
        <EmptyState icon={Tv} title="Sonarr not configured" description="Add your Sonarr URL and API key in settings to manage TV shows." />
      </div>
    );
  }

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
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {isPending && !seriesData ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={getMediaGridClassName(posterDisplayPreferences)} style={getMediaGridStyle(posterDisplayPreferences)}>
          {filteredSeries.map((show) => (
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
              onClick={() => {
                queryClient.prefetchQuery({
                  queryKey: ['tv-show-details', ...serviceKey, String(show.id), String(config.tautulli?.url || ''), String(config.tautulli?.enabled || false)],
                  queryFn: () => fetchTvShowDetailsData(config.sonarr, config.tautulli, show.id, isServiceReady('tautulli')),
                  staleTime: 2 * 60 * 1000,
                });
                navigate(`/tv-shows/${show.id}`);
              }}
            />
          ))}
        </div>
      )}

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add TV Series</DialogTitle></DialogHeader>
          <div className="flex gap-2">
            <Input placeholder="Search series..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && handleSearch()} />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
          <div className="flex gap-2">
            <Select value={selectedRoot} onValueChange={setSelectedRoot}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Root folder" /></SelectTrigger>
              <SelectContent>
                {rootFolders.map((folder) => <SelectItem key={folder.path} value={folder.path}>{folder.path}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={selectedQuality} onValueChange={setSelectedQuality}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Quality" /></SelectTrigger>
              <SelectContent>
                {qualityProfiles.map((profile) => <SelectItem key={profile.id} value={String(profile.id)}>{profile.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {searchResults.map((show, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="w-10 h-14 rounded bg-muted shrink-0 overflow-hidden">
                  {show.images?.find((image) => image.coverType === 'poster')?.remoteUrl && (
                    <img src={show.images.find((image) => image.coverType === 'poster').remoteUrl} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{show.title}</p>
                  <p className="text-xs text-muted-foreground">{show.year}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => addSeries(show)} disabled={series.some((existingShow) => existingShow.tvdbId === show.tvdbId)}>
                  {series.some((existingShow) => existingShow.tvdbId === show.tvdbId) ? 'Added' : 'Add'}
                </Button>
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => refreshAll()} disabled={isFetching}>Refresh library data</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
