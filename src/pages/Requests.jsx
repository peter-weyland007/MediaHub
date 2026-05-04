import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, CheckCircle, XCircle, RefreshCw, Loader2, Clock, Film, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { fetchRequestsData, getServiceCacheKey } from '@/lib/mediaQueries';
import { overseerrApi, radarrApi, sonarrApi } from '@/lib/serviceApi';
import { formatRequestHeadline, formatRequestMeta, getRequestDetailPath } from '@/lib/requestDisplay';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusColors = {
  1: { label: 'Pending', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Clock },
  2: { label: 'Approved', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  3: { label: 'Declined', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function Requests() {
  const { config, isServiceReady } = useServiceConfig();
  const ready = isServiceReady('overseerr');
  const radarrReady = isServiceReady('radarr');
  const sonarrReady = isServiceReady('sonarr');
  const serviceKey = getServiceCacheKey(config.overseerr);

  const {
    data: requests = [],
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['requests', ...serviceKey],
    queryFn: () => fetchRequestsData(config.overseerr),
    enabled: ready,
    staleTime: 30 * 1000,
  });

  const { data: requestRouteLookup = { movieLookup: new Map(), tvLookup: new Map() } } = useQuery({
    queryKey: ['request-route-lookup', String(config.radarr?.url || ''), String(config.radarr?.enabled || false), String(config.sonarr?.url || ''), String(config.sonarr?.enabled || false)],
    enabled: radarrReady || sonarrReady,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [movies, series] = await Promise.all([
        radarrReady ? radarrApi.getMovies(config.radarr) : Promise.resolve([]),
        sonarrReady ? sonarrApi.getSeries(config.sonarr) : Promise.resolve([]),
      ]);

      return {
        movieLookup: new Map((Array.isArray(movies) ? movies : []).map((movie) => [Number(movie.tmdbId), Number(movie.id)]).filter(([tmdbId, id]) => Number.isFinite(tmdbId) && Number.isFinite(id))),
        tvLookup: new Map((Array.isArray(series) ? series : []).flatMap((show) => {
          const entries = [];
          const seriesId = Number(show.id);
          if (!Number.isFinite(seriesId)) {
            return entries;
          }
          const tvdbId = Number(show.tvdbId);
          const tmdbId = Number(show.tmdbId);
          if (Number.isFinite(tvdbId)) entries.push([tvdbId, seriesId]);
          if (Number.isFinite(tmdbId)) entries.push([tmdbId, seriesId]);
          return entries;
        })),
      };
    },
  });

  const handleApprove = async (id) => {
    await overseerrApi.approveRequest(config.overseerr, id);
    toast.success('Request approved');
    await refetch();
  };

  const handleDecline = async (id) => {
    await overseerrApi.declineRequest(config.overseerr, id);
    toast.success('Request declined');
    await refetch();
  };

  if (!ready) {
    return (
      <div>
        <PageHeader title="Requests" subtitle="Manage Overseerr media requests" icon={Bell} accentColor="bg-violet-500/10" />
        <EmptyState icon={Bell} title="Overseerr not configured" description="Add your Overseerr URL and API key in settings to manage requests." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Requests" subtitle={`${requests.length} requests`} icon={Bell} accentColor="bg-violet-500/10">
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {isPending && requests.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : requests.length === 0 ? (
        <EmptyState icon={Bell} title="No requests" description="No media requests found." showSettings={false} />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const media = req.media || {};
            const statusConf = statusColors[req.status] || statusColors[1];
            const StatusIcon = statusConf.icon;
            const isMovie = req.type === 'movie';
            const posterPath = media.posterPath ? `https://image.tmdb.org/t/p/w92${media.posterPath}` : null;
            const detailPath = getRequestDetailPath(req, requestRouteLookup.movieLookup, requestRouteLookup.tvLookup);

            return (
              <Card key={req.id} className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-16 rounded-lg bg-muted shrink-0 overflow-hidden">
                    {posterPath && <img src={posterPath} className="w-full h-full object-cover" alt="" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {isMovie ? <Film className="w-3.5 h-3.5 text-amber-400" /> : <Tv className="w-3.5 h-3.5 text-sky-400" />}
                      {detailPath ? (
                        <Link to={detailPath} className="font-semibold text-sm truncate text-foreground hover:underline" onClick={(event) => event.stopPropagation()}>
                          {formatRequestHeadline(req)}
                        </Link>
                      ) : (
                        <p className="font-semibold text-sm truncate">
                          {formatRequestHeadline(req)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn('text-[10px]', statusConf.color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConf.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatRequestMeta(req)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        by {req.requestedBy?.displayName || req.requestedBy?.email || 'Unknown'}
                      </span>
                    </div>
                  </div>

                  {req.status === 1 && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10" onClick={() => handleApprove(req.id)}>
                        <CheckCircle className="w-4 h-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => handleDecline(req.id)}>
                        <XCircle className="w-4 h-4 mr-1" />Decline
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
