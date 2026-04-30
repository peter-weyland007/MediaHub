import React, { useState, useEffect } from 'react';
import { Film, Tv, Music, Bell, Library, Search, LayoutDashboard, Activity, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { radarrApi, sonarrApi, lidarrApi, overseerrApi, plexApi, prowlarrApi, serviceColors } from '@/lib/serviceApi';
import ServiceCard from '@/components/dashboard/ServiceCard';
import ActivityItem from '@/components/dashboard/ActivityItem';
import PageHeader from '@/components/shared/PageHeader';

const services = [
  { key: 'radarr', name: 'Radarr', icon: Film },
  { key: 'sonarr', name: 'Sonarr', icon: Tv },
  { key: 'lidarr', name: 'Lidarr', icon: Music },
  { key: 'overseerr', name: 'Overseerr', icon: Bell },
  { key: 'plex', name: 'Plex', icon: Library },
  { key: 'prowlarr', name: 'Prowlarr', icon: Search },
];

export default function Dashboard() {
  const { config, isServiceReady } = useServiceConfig();
  const [statuses, setStatuses] = useState({});
  const [stats, setStats] = useState({});
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const newStatuses = {};
    const newStats = {};
    const newQueue = [];

    const checks = [];

    if (isServiceReady('radarr')) {
      checks.push(
        radarrApi.getMovies(config.radarr)
          .then(movies => {
            newStatuses.radarr = 'connected';
            const monitored = movies.filter(m => m.monitored).length;
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

    if (isServiceReady('sonarr')) {
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

    if (isServiceReady('lidarr')) {
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

    if (isServiceReady('overseerr')) {
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

    if (isServiceReady('plex')) {
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

    if (isServiceReady('prowlarr')) {
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
      if (!isServiceReady(s.key) && !newStatuses[s.key]) {
        newStatuses[s.key] = 'unconfigured';
      }
    });

    setStatuses(newStatuses);
    setStats(newStats);
    setQueue(newQueue);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of all your media services" icon={LayoutDashboard}>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      {/* Service cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

      {/* Activity */}
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