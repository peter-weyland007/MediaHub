import React, { useState, useEffect } from 'react';
import { Music, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { lidarrApi } from '@/lib/serviceApi';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import MediaCard from '@/components/shared/MediaCard';

export default function MusicPage() {
  const { config, isServiceReady } = useServiceConfig();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const ready = isServiceReady('lidarr');

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

  if (!ready) {
    return (
      <div>
        <PageHeader title="Music" subtitle="Manage your Lidarr music library" icon={Music} accentColor="bg-emerald-500/10" />
        <EmptyState icon={Music} title="Lidarr not configured" description="Add your Lidarr URL and API key in settings to manage music." />
      </div>
    );
  }

  const filteredArtists = artists.filter(a => {
    if (filter === 'monitored') return a.monitored;
    if (filter === 'unmonitored') return !a.monitored;
    return true;
  });

  const getImage = (artist) => {
    const poster = artist.images?.find(i => i.coverType === 'poster') || artist.images?.[0];
    if (poster?.remoteUrl) return poster.remoteUrl;
    if (poster?.url) return `${config.lidarr.url}${poster.url}`;
    return null;
  };

  return (
    <div>
      <PageHeader title="Music" subtitle={`${artists.length} artists in library`} icon={Music} accentColor="bg-emerald-500/10">
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
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredArtists.map(artist => (
            <MediaCard
              key={artist.id}
              title={artist.artistName}
              subtitle={artist.statistics ? `${artist.statistics.albumCount || 0} albums` : ''}
              image={getImage(artist)}
              status={artist.monitored ? 'Monitored' : 'Unmonitored'}
              statusColor={artist.monitored ? 'bg-emerald-500/80 text-white' : 'bg-muted text-muted-foreground'}
            />
          ))}
        </div>
      )}
    </div>
  );
}