import React, { useState, useEffect } from 'react';
import { Film, Search, Plus, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { radarrApi } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import MediaCard from '@/components/shared/MediaCard';
import { toast } from 'sonner';

export default function Movies() {
  const { config, isServiceReady } = useServiceConfig();
  const [movies, setMovies] = useState([]);
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

  const ready = isServiceReady('radarr');

  const fetchMovies = async () => {
    if (!ready) return;
    setLoading(true);
    const data = await radarrApi.getMovies(config.radarr);
    setMovies(data);
    setLoading(false);
  };

  const fetchProfiles = async () => {
    if (!ready) return;
    const [roots, profiles] = await Promise.all([
      radarrApi.getRootFolders(config.radarr),
      radarrApi.getQualityProfiles(config.radarr),
    ]);
    setRootFolders(roots);
    setQualityProfiles(profiles);
    if (roots.length) setSelectedRoot(roots[0].path);
    if (profiles.length) setSelectedQuality(String(profiles[0].id));
  };

  useEffect(() => {
    if (ready) {
      fetchMovies();
      fetchProfiles();
    } else {
      setLoading(false);
    }
  }, [ready]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    const results = await radarrApi.searchMovie(config.radarr, searchTerm);
    setSearchResults(results);
    setSearching(false);
  };

  const addMovie = async (movie) => {
    await radarrApi.addMovie(config.radarr, {
      ...movie,
      rootFolderPath: selectedRoot,
      qualityProfileId: parseInt(selectedQuality),
      monitored: true,
      addOptions: { searchForMovie: true },
    });
    toast.success(`Added "${movie.title}"`);
    setSearchOpen(false);
    fetchMovies();
  };

  const deleteMovie = async (id) => {
    await radarrApi.deleteMovie(config.radarr, id, false);
    toast.success('Movie removed');
    fetchMovies();
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="Movies" subtitle="Manage your Radarr movie library" icon={Film} accentColor="bg-amber-500/10" />
        <EmptyState icon={Film} title="Radarr not configured" description="Add your Radarr URL and API key in settings to manage movies." />
      </div>
    );
  }

  const filteredMovies = movies.filter(m => {
    if (filter === 'monitored') return m.monitored;
    if (filter === 'unmonitored') return !m.monitored;
    if (filter === 'missing') return !m.hasFile;
    if (filter === 'downloaded') return m.hasFile;
    return true;
  });

  const getImage = (movie) => {
    const poster = movie.images?.find(i => i.coverType === 'poster');
    if (poster?.remoteUrl) return poster.remoteUrl;
    if (poster?.url) return `${config.radarr.url}${poster.url}`;
    return null;
  };

  return (
    <div>
      <PageHeader title="Movies" subtitle={`${movies.length} movies in library`} icon={Film} accentColor="bg-amber-500/10">
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
        <Button variant="outline" size="sm" onClick={fetchMovies} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMovies.map(movie => (
            <MediaCard
              key={movie.id}
              title={movie.title}
              subtitle={movie.year ? String(movie.year) : ''}
              image={getImage(movie)}
              status={movie.hasFile ? 'Downloaded' : movie.monitored ? 'Monitored' : 'Unmonitored'}
              statusColor={movie.hasFile ? 'bg-emerald-500/80 text-white' : movie.monitored ? 'bg-amber-500/80 text-white' : 'bg-muted text-muted-foreground'}
            />
          ))}
        </div>
      )}

      {/* Add Movie Dialog */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Movie</DialogTitle>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              placeholder="Search movies..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
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
            {searchResults.map((movie, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <div className="w-10 h-14 rounded bg-muted shrink-0 overflow-hidden">
                  {movie.images?.find(i => i.coverType === 'poster')?.remoteUrl && (
                    <img src={movie.images.find(i => i.coverType === 'poster').remoteUrl} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{movie.title}</p>
                  <p className="text-xs text-muted-foreground">{movie.year}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => addMovie(movie)} disabled={movies.some(m => m.tmdbId === movie.tmdbId)}>
                  {movies.some(m => m.tmdbId === movie.tmdbId) ? 'Added' : 'Add'}
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}