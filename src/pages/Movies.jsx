import React, { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Film, Search, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { fetchMovieDetailsData, fetchMovieReferenceData, getServiceCacheKey } from '@/lib/mediaQueries';
import { radarrApi } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import MediaCard from '@/components/shared/MediaCard';
import PosterDisplayControls from '@/components/shared/PosterDisplayControls';
import { getMediaGridClassName, getMediaGridStyle } from '@/components/shared/mediaDisplay';
import { toast } from 'sonner';

export default function Movies() {
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

  const ready = isServiceReady('radarr');
  const serviceKey = getServiceCacheKey(config.radarr);

  const {
    data: moviesData,
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['movies', ...serviceKey],
    queryFn: () => radarrApi.getMovies(config.radarr),
    enabled: ready,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const {
    data: referenceData,
    refetch: refetchReferenceData,
  } = useQuery({
    queryKey: ['movies-reference', ...serviceKey, String(qualityPreferences.movieProfileId || '')],
    queryFn: () => fetchMovieReferenceData(config.radarr),
    enabled: ready,
    staleTime: 10 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const movies = moviesData || [];
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

    const preferredProfileId = qualityPreferences.movieProfileId ? String(qualityPreferences.movieProfileId) : '';
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
  }, [qualityProfiles, qualityPreferences.movieProfileId]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const results = await radarrApi.searchMovie(config.radarr, searchTerm);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([refetch(), refetchReferenceData()]);
  };

  const addMovie = async (movie) => {
    await radarrApi.addMovie(config.radarr, {
      ...movie,
      rootFolderPath: selectedRoot,
      qualityProfileId: parseInt(selectedQuality, 10),
      monitored: true,
      addOptions: { searchForMovie: true },
    });
    toast.success(`Added "${movie.title}"`);
    setSearchOpen(false);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['movies'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const deleteMovie = async (id) => {
    await radarrApi.deleteMovie(config.radarr, id, false);
    toast.success('Movie removed');
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['movies'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const filteredMovies = useMemo(() => movies.filter((movie) => {
    if (filter === 'monitored') return movie.monitored;
    if (filter === 'unmonitored') return !movie.monitored;
    if (filter === 'missing') return !movie.hasFile;
    if (filter === 'downloaded') return movie.hasFile;
    return true;
  }), [movies, filter]);

  const getImage = (movie) => {
    const poster = movie.images?.find((image) => image.coverType === 'poster');
    if (poster?.remoteUrl) return poster.remoteUrl;
    if (poster?.url) return `${config.radarr.url}${poster.url}`;
    return null;
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="Movies" subtitle="Manage your Radarr movie library" icon={Film} accentColor="bg-amber-500/10" />
        <EmptyState icon={Film} title="Radarr not configured" description="Add your Radarr URL and API key in settings to manage movies." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Movies" subtitle={`${movies.length} movies in library`} icon={Film} accentColor="bg-amber-500/10">
        <PosterDisplayControls
          posterDisplayPreferences={posterDisplayPreferences}
          onChange={updatePosterDisplayPreferences}
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Movies</SelectItem>
            <SelectItem value="monitored">Monitored</SelectItem>
            <SelectItem value="unmonitored">Unmonitored</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
            <SelectItem value="downloaded">Downloaded</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => setSearchOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Add Movie
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {isPending && !moviesData ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={getMediaGridClassName(posterDisplayPreferences)} style={getMediaGridStyle(posterDisplayPreferences)}>
          {filteredMovies.map((movie) => (
            <MediaCard
              key={movie.id}
              title={movie.title}
              subtitle={movie.year ? String(movie.year) : ''}
              image={getImage(movie)}
              hidePoster={posterDisplayPreferences.hidePosters}
              posterSize={posterDisplayPreferences.posterSize}
              status={movie.hasFile ? 'Downloaded' : movie.monitored ? 'Monitored' : 'Unmonitored'}
              statusColor={movie.hasFile ? 'bg-emerald-500/80 text-white' : movie.monitored ? 'bg-amber-500/80 text-white' : 'bg-muted text-muted-foreground'}
              onClick={() => {
                queryClient.prefetchQuery({
                  queryKey: ['movie-details', ...serviceKey, String(movie.id)],
                  queryFn: () => fetchMovieDetailsData(config.radarr, movie.id),
                  staleTime: 2 * 60 * 1000,
                });
                navigate(`/movies/${movie.id}`);
              }}
              onDelete={() => deleteMovie(movie.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Movie</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Search movies..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
            />
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
            {searchResults.map((movie, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="w-10 h-14 rounded bg-muted shrink-0 overflow-hidden">
                  {movie.images?.find((image) => image.coverType === 'poster')?.remoteUrl && (
                    <img src={movie.images.find((image) => image.coverType === 'poster').remoteUrl} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{movie.title}</p>
                  <p className="text-xs text-muted-foreground">{movie.year}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => addMovie(movie)} disabled={movies.some((existingMovie) => existingMovie.tmdbId === movie.tmdbId)}>
                  {movies.some((existingMovie) => existingMovie.tmdbId === movie.tmdbId) ? 'Added' : 'Add'}
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
