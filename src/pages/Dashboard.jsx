import React, { useState, useEffect, useCallback } from 'react';
import { Film, Tv, Music, Languages, Activity, Bell, Library, Search, LayoutDashboard, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { radarrApi, sonarrApi, lidarrApi, bazarrApi, tautulliApi, overseerrApi, plexApi, prowlarrApi, serviceColors } from '@/lib/serviceApi';
import ServiceCard from '@/components/dashboard/ServiceCard';
import ActivityItem from '@/components/dashboard/ActivityItem';
import PageHeader from '@/components/shared/PageHeader';

const services = [
  { key: 'radarr', name: 'Radarr', icon: Film },
  { key: 'sonarr', name: 'Sonarr', icon: Tv },
  { key: 'lidarr', name: 'Lidarr', icon: Music },
  { key: 'bazarr', name: 'Bazarr', icon: Languages },
  { key: 'tautulli', name: 'Tautulli', icon: Activity },
  { key: 'overseerr', name: 'Overseerr', icon: Bell },
  { key: 'plex', name: 'Plex', icon: Library },
  { key: 'prowlarr', name: 'Prowlarr', icon: Search },
];

export default function Dashboard() {
  const { config, isLoadingConfig } = useServiceConfig();
  const [statuses, setStatuses] = useState({});
  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  const serviceReady = (service) => {
    const current = config[service];
    return current && current.enabled && current.url && current.apiKey;
  };

  const fetchAll = useCallback(async () => {
    if (isLoadingConfig) return;

    setLoading(true);
    const newStatuses = {};
    const newStats = {};
    const newQueue = [];

    const checks = [];

    if (serviceReady('radarr')) {
      checks.push(
        radarrApi.getMovies(config.radarr)
          .then(movies => {
            newStatuses.radarr = 'connected';
            const downloaded = movies.filter(m => m.hasFile).length;
            newStats.radarr = [
              { label: 'Movies', value: movies.length },
              { label: 'Downloaded', value: downloaded },
            ];
          })
          .catch(() => { newStatuses.radarr = 'error'; })
      );
      checks.push(
        radarrApi.getQueue(config.radarr)
          .then(q => {
            (q.records || []).forEach(r => {
              newQueue.push({
                title: r.title || r.movie?.title || 'Unknown',
                service: 'Radarr',
                status: r.status === 'completed' ? 'completed' : 'downloading',
                progress: r.sizeleft && r.size ? ((1 - r.sizeleft / r.size) * 100) : 0,
                size: r.size ? `${(r.size / 1073741824).toFixed(1)} GB` : null,
              });
            });
          })
          .catch(() => {})
      );
    }

    if (serviceReady('sonarr')) {
      checks.push(
        sonarrApi.getSeries(config.sonarr)
          .then(series => {
            newStatuses.sonarr = 'connected';
            newStats.sonarr = [
              { label: 'Series', value: series.length },
              { label: 'Monitored', value: series.filter(s => s.monitored).length },
            ];
          })
          .catch(() => { newStatuses.sonarr = 'error'; })
      );
      checks.push(
        sonarrApi.getQueue(config.sonarr)
          .then(q => {
            (q.records || []).forEach(r => {
              newQueue.push({
                title: r.title || r.series?.title || 'Unknown',
                service: 'Sonarr',
                status: r.status === 'completed' ? 'completed' : 'downloading',
                progress: r.sizeleft && r.size ? ((1 - r.sizeleft / r.size) * 100) : 0,
                size: r.size ? `${(r.size / 1073741824).toFixed(1)} GB` : null,
              });
            });
          })
          .catch(() => {})
      );
    }

    if (serviceReady('lidarr')) {
      checks.push(
        lidarrApi.getArtists(config.lidarr)
          .then(artists => {
            newStatuses.lidarr = 'connected';
            newStats.lidarr = [
              { label: 'Artists', value: artists.length },
              { label: 'Monitored', value: artists.filter(a => a.monitored).length },
            ];
          })
          .catch(() => { newStatuses.lidarr = 'error'; })
      );
    }

    if (serviceReady('bazarr')) {
      checks.push(
        Promise.all([
          bazarrApi.getMovies(config.bazarr),
          bazarrApi.getSeries(config.bazarr),
        ])
          .then(([moviesResponse, seriesResponse]) => {
            const movies = Array.isArray(moviesResponse) ? moviesResponse : (moviesResponse?.data ?? []);
            const series = Array.isArray(seriesResponse) ? seriesResponse : (seriesResponse?.data ?? []);
            newStatuses.bazarr = 'connected';
            newStats.bazarr = [
              { label: 'Movies', value: movies.length },
              { label: 'Series', value: series.length },
            ];
          })
          .catch(() => { newStatuses.bazarr = 'error'; })
      );
    }

    if (serviceReady('tautulli')) {
      checks.push(
        tautulliApi.getActivity(config.tautulli)
          .then(activity => {
            newStatuses.tautulli = 'connected';
            newStats.tautulli = [
              { label: 'Streams', value: Number(activity.stream_count || 0) },
              { label: 'Transcodes', value: Number(activity.stream_count_transcode || 0) },
            ];
          })
          .catch(() => { newStatuses.tautulli = 'error'; })
      );
    }

    if (serviceReady('overseerr')) {
      checks.push(
        overseerrApi.getRequestCount(config.overseerr)
          .then(counts => {
            newStatuses.overseerr = 'connected';
            newStats.overseerr = [
              { label: 'Pending', value: counts.pending || 0 },
              { label: 'Approved', value: counts.approved || 0 },
            ];
          })
          .catch(() => { newStatuses.overseerr = 'error'; })
      );
    }

    if (serviceReady('plex')) {
      checks.push(
        plexApi.getLibraries(config.plex)
          .then(data => {
            newStatuses.plex = 'connected';
            const libs = data?.MediaContainer?.Directory || [];
            newStats.plex = [
              { label: 'Libraries', value: libs.length },
              { label: 'Items', value: libs.reduce((sum, l) => sum + (parseInt(l.count) || 0), 0) },
            ];
          })
          .catch(() => { newStatuses.plex = 'error'; })
      );
    }

    if (serviceReady('prowlarr')) {
      checks.push(
        prowlarrApi.getIndexers(config.prowlarr)
          .then(indexers => {
            newStatuses.prowlarr = 'connected';
            newStats.prowlarr = [
              { label: 'Indexers', value: indexers.length },
              { label: 'Active', value: indexers.filter(i => i.enable).length },
            ];
          })
          .catch(() => { newStatuses.prowlarr = 'error'; })
      );
    }

    await Promise.allSettled(checks);

    services.forEach(s => {
      if (!serviceReady(s.key) && !newStatuses[s.key]) {
        newStatuses[s.key] = 'unconfigured';
      }
    });

    setStatuses(newStatuses);
    setStats(newStats);
    setQueue(newQueue);
    setLoading(false);
  }, [config, isLoadingConfig]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of all your media services" icon={LayoutDashboard}>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        {services.map(s => (
          <ServiceCard
            key={s.key}
            name={s.name}
            icon={s.icon}
            status={loading ? 'loading' : (statuses[s.key] || 'unconfigured')}
            stats={stats[s.key]}
            color={serviceColors[s.key]}
          />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Download Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No active downloads</p>
          ) : (
            queue.map((item, i) => <ActivityItem key={i} {...item} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
