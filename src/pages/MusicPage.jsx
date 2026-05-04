import React, { useState, useEffect, useMemo } from 'react';
import { Music, RefreshCw, Loader2, LayoutGrid, Rows3, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { lidarrApi } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import MediaCard from '@/components/shared/MediaCard';
import PosterDisplayControls from '@/components/shared/PosterDisplayControls';
import { getMediaGridClassName, getMediaGridStyle } from '@/components/shared/mediaDisplay';
import { musicSortOptions, sortMusicArtistsForDisplay } from '@/lib/mediaBrowserPreferences';
import { filterMusicArtistsForDisplay } from '@/lib/mediaSearch';

export default function MusicPage() {
  const { config, posterDisplayPreferences, mediaBrowserPreferences, updatePosterDisplayPreferences, updateMediaBrowserPreferences, isServiceReady } = useServiceConfig();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');

  const ready = isServiceReady('lidarr');
  const viewMode = mediaBrowserPreferences.music.viewMode;
  const sortBy = mediaBrowserPreferences.music.sortBy;

  const fetchArtists = async () => {
    if (!ready) return;
    setLoading(true);
    const data = await lidarrApi.getArtists(config.lidarr);
    setArtists(data);
    setLoading(false);
  };

  useEffect(() => {
    if (ready) {
      fetchArtists();
    } else {
      setLoading(false);
    }
  }, [ready]);

  const filteredArtists = useMemo(() => artists.filter((artist) => {
    if (filter === 'monitored') return artist.monitored;
    if (filter === 'unmonitored') return !artist.monitored;
    return true;
  }), [artists, filter]);

  const searchedArtists = useMemo(() => filterMusicArtistsForDisplay(filteredArtists, librarySearchTerm), [filteredArtists, librarySearchTerm]);
  const sortedArtists = useMemo(() => sortMusicArtistsForDisplay(searchedArtists, sortBy), [searchedArtists, sortBy]);

  if (!ready) {
    return (
      <div>
        <PageHeader title="Music" subtitle="Manage your Lidarr music library" icon={Music} accentColor="bg-emerald-500/10" />
        <EmptyState icon={Music} title="Lidarr not configured" description="Add your Lidarr URL and API key in settings to manage music." />
      </div>
    );
  }

  const getImage = (artist) => {
    const poster = artist.images?.find(i => i.coverType === 'poster') || artist.images?.[0];
    if (poster?.remoteUrl) return poster.remoteUrl;
    if (poster?.url) return `${config.lidarr.url}${poster.url}`;
    return null;
  };

  const saveMusicBrowserPreferences = (nextSection) => updateMediaBrowserPreferences({
    ...mediaBrowserPreferences,
    music: {
      ...mediaBrowserPreferences.music,
      ...nextSection,
    },
  });

  const toggleMusicSort = () => saveMusicBrowserPreferences({ sortBy: sortBy === 'title-asc' ? 'title-desc' : 'title-asc' });

  return (
    <div>
      <PageHeader title="Music" subtitle={`${artists.length} artists in library`} icon={Music} accentColor="bg-emerald-500/10">
        <PosterDisplayControls
          posterDisplayPreferences={posterDisplayPreferences}
          onChange={updatePosterDisplayPreferences}
        />
        <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
          <Button variant={viewMode === 'browse' ? 'secondary' : 'ghost'} size="sm" onClick={() => saveMusicBrowserPreferences({ viewMode: 'browse' })}>
            <LayoutGrid className="mr-2 h-4 w-4" />Browse
          </Button>
          <Button variant={viewMode === 'table' ? 'secondary' : 'ghost'} size="sm" onClick={() => saveMusicBrowserPreferences({ viewMode: 'table' })}>
            <Rows3 className="mr-2 h-4 w-4" />Table
          </Button>
        </div>
        <Input
          value={librarySearchTerm}
          onChange={(event) => setLibrarySearchTerm(event.target.value)}
          placeholder="Search library..."
          className="w-52"
        />
        <Select value={sortBy} onValueChange={(value) => saveMusicBrowserPreferences({ sortBy: value })}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {musicSortOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Artists</SelectItem>
            <SelectItem value="monitored">Monitored</SelectItem>
            <SelectItem value="unmonitored">Unmonitored</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchArtists} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : viewMode === 'table' ? (
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" className="-ml-3 h-8 px-3" onClick={toggleMusicSort}>
                    Artist <ArrowUpDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </TableHead>
                <TableHead>Albums</TableHead>
                <TableHead>Monitored</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedArtists.map(artist => (
                <TableRow key={artist.id}>
                  <TableCell className="font-medium">{artist.artistName}</TableCell>
                  <TableCell>{artist.statistics?.albumCount || 0}</TableCell>
                  <TableCell>{artist.monitored ? 'Yes' : 'No'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className={getMediaGridClassName(posterDisplayPreferences)} style={getMediaGridStyle(posterDisplayPreferences)}>
          {sortedArtists.map(artist => (
            <MediaCard
              key={artist.id}
              title={artist.artistName}
              subtitle={artist.statistics ? `${artist.statistics.albumCount || 0} albums` : ''}
              image={getImage(artist)}
              hidePoster={posterDisplayPreferences.hidePosters}
              posterSize={posterDisplayPreferences.posterSize}
              status={artist.monitored ? 'Monitored' : 'Unmonitored'}
              statusColor={artist.monitored ? 'bg-emerald-500/80 text-white' : 'bg-muted text-muted-foreground'}
            />
          ))}
        </div>
      )}
    </div>
  );
}