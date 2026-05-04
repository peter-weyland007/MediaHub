import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Tv, Music, Languages, Activity, Bell, Library, Search, LayoutDashboard, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { fetchDashboardData } from '@/lib/mediaQueries';
import { serviceColors } from '@/lib/serviceApi';
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
  const {
    data: dashboardData,
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', config],
    queryFn: () => fetchDashboardData(config),
    enabled: !isLoadingConfig,
    refetchInterval: 30 * 1000,
    staleTime: 30 * 1000,
  });

  const statuses = dashboardData?.statuses || {};
  const stats = dashboardData?.stats || {};
  const queue = dashboardData?.queue || [];
  const loading = isPending && !dashboardData;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Overview of all your media services" icon={LayoutDashboard}>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        {services.map((service) => (
          <ServiceCard
            key={service.key}
            name={service.name}
            icon={service.icon}
            status={loading ? 'loading' : (statuses[service.key] || 'unconfigured')}
            stats={stats[service.key]}
            color={serviceColors[service.key]}
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
            queue.map((item, index) => <ActivityItem key={index} {...item} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
