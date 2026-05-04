import React, { useEffect, useState } from 'react';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { Library, RefreshCw, Loader2, Play, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServiceConfig } from '@/lib/useServiceConfig';
import {
  fetchMovieDetailsData,
  fetchPlexLibrariesData,
  fetchPlexLibraryContentData,
  fetchPlexLibraryLinksData,
  fetchPlexSessionsData,
  fetchTvShowDetailsData,
  getServiceCacheKey,
} from '@/lib/mediaQueries';
import { toast } from 'sonner';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import MediaCard from '@/components/shared/MediaCard';
import PosterDisplayControls from '@/components/shared/PosterDisplayControls';
import { getMediaGridClassName, getMediaGridStyle } from '@/components/shared/mediaDisplay';
import { resolveLibraryItemDetailsPath, resolveLibrarySeriesDetailsPath } from '@/components/shared/movieDetails';

export default function PlexLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { config, posterDisplayPreferences, updatePosterDisplayPreferences, isServiceReady } = useServiceConfig();
  const [selectedLib, setSelectedLib] = useState(null);

  const ready = isServiceReady('plex');
  const radarrReady = isServiceReady('radarr');
  const sonarrReady = isServiceReady('sonarr');
  const tautulliReady = isServiceReady('tautulli');
  const plexKey = getServiceCacheKey(config.plex);
  const radarrKey = getServiceCacheKey(config.radarr);
  const sonarrKey = getServiceCacheKey(config.sonarr);
  const tautulliKey = getServiceCacheKey(config.tautulli);

  const { data: libraries = [], isPending: loadingLibraries, isFetching: fetchingLibraries, refetch: refetchLibraries } = useQuery({
    queryKey: ['plex-libraries', ...plexKey],
    queryFn: () => fetchPlexLibrariesData(config.plex),
    enabled: ready,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!libraries.length) {
      setSelectedLib(null);
      return;
    }

    setSelectedLib((current) => {
      if (current && libraries.some((library) => library.key === current)) {
        return current;
      }
      return libraries[0].key;
    });
  }, [libraries]);

  const { data: content = [], isPending: loadingContent, isFetching: fetchingContent, refetch: refetchContent } = useQuery({
    queryKey: ['plex-library-content', ...plexKey, String(selectedLib || '')],
    queryFn: () => fetchPlexLibraryContentData(config.plex, selectedLib),
    enabled: ready && Boolean(selectedLib),
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['plex-sessions', ...plexKey],
    queryFn: () => fetchPlexSessionsData(config.plex),
    enabled: ready,
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
    placeholderData: keepPreviousData,
  });

  const { data: linkData = { radarrMovies: [], sonarrSeries: [] } } = useQuery({
    queryKey: ['plex-library-links', ...radarrKey, ...sonarrKey, radarrReady ? 'radarr-ready' : 'radarr-off', sonarrReady ? 'sonarr-ready' : 'sonarr-off'],
    queryFn: () => fetchPlexLibraryLinksData(config.radarr, config.sonarr, radarrReady, sonarrReady),
    enabled: radarrReady || sonarrReady,
    staleTime: 60 * 1000,
    placeholderData: keepPreviousData,
  });

  const radarrMovies = linkData.radarrMovies || [];
  const sonarrSeries = linkData.sonarrSeries || [];

  if (!ready) {
    return (
      <div>
        <PageHeader title="Library" subtitle="Browse your Plex media library" icon={Library} accentColor="bg-orange-500/10" />
        <EmptyState icon={Library} title="Plex not configured" description="Add your Plex URL and token in settings to browse your library." />
      </div>
    );
  }

  const getThumb = (item) => {
    if (item.thumb) return `${config.plex.url}${item.thumb}?X-Plex-Token=${config.plex.apiKey}`;
    return null;
  };

  const handleRefresh = async () => {
    await Promise.all([refetchLibraries(), refetchContent()]);
  };

  const handleItemClick = async (item) => {
    const detailsPath = item.type === 'show'
      ? resolveLibrarySeriesDetailsPath(item, sonarrSeries)
      : resolveLibraryItemDetailsPath(item, radarrMovies);

    if (!detailsPath) {
      toast('No linked details available for this item yet.');
      return;
    }

    const itemId = detailsPath.split('/').pop();
    if (item.type === 'show' && itemId) {
      queryClient.prefetchQuery({
        queryKey: ['tv-show-details', ...sonarrKey, String(itemId), ...tautulliKey, tautulliReady ? 'history' : 'no-history'],
        queryFn: () => fetchTvShowDetailsData(config.sonarr, config.tautulli, itemId, tautulliReady),
        staleTime: 2 * 60 * 1000,
      });
    }
    if (item.type !== 'show' && itemId) {
      queryClient.prefetchQuery({
        queryKey: ['movie-details', ...radarrKey, String(itemId)],
        queryFn: () => fetchMovieDetailsData(config.radarr, itemId),
        staleTime: 2 * 60 * 1000,
      });
    }

    navigate(detailsPath);
  };

  return (
    <div>
      <PageHeader title="Library" subtitle="Browse your Plex media" icon={Library} accentColor="bg-orange-500/10">
        <PosterDisplayControls
          posterDisplayPreferences={posterDisplayPreferences}
          onChange={updatePosterDisplayPreferences}
        />
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={fetchingLibraries || fetchingContent}>
          <RefreshCw className={`w-4 h-4 ${(fetchingLibraries || fetchingContent) ? 'animate-spin' : ''}`} />
        </Button>
      </PageHeader>

      {sessions.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              Now Playing
              <Badge variant="secondary" className="ml-1">{sessions.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {sessions.map((session, index) => (
                <div key={index} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{session.title}</p>
                    <p className="text-xs text-muted-foreground">{session.User?.title || 'Unknown user'}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {session.Player?.state || 'playing'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {loadingLibraries && libraries.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <Tabs value={selectedLib || ''} onValueChange={setSelectedLib}>
            <TabsList className="mb-6">
              {libraries.map((library) => (
                <TabsTrigger key={library.key} value={library.key}>
                  {library.title}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {loadingContent && content.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className={getMediaGridClassName(posterDisplayPreferences)} style={getMediaGridStyle(posterDisplayPreferences)}>
              {content.slice(0, 60).map((item, index) => (
                <MediaCard
                  key={index}
                  title={item.title}
                  subtitle={item.year ? String(item.year) : item.parentTitle || ''}
                  image={getThumb(item)}
                  hidePoster={posterDisplayPreferences.hidePosters}
                  posterSize={posterDisplayPreferences.posterSize}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
