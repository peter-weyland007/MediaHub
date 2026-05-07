import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Film, Loader2, PlayCircle, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useServiceConfig } from '@/lib/useServiceConfig';
import { fetchMovieDetailsData, getServiceCacheKey } from '@/lib/mediaQueries';
import EmptyState from '@/components/shared/EmptyState';
import PageHeader from '@/components/shared/PageHeader';
import {
  buildMovieExternalLinks,
  buildMoviePlaybackSummary,
  formatMoviePlaybackClient,
  formatMoviePlaybackDate,
  formatMoviePlaybackDecision,
  formatMoviePlexSessionLabel,
  formatMovieRuntime,
  getMovieFactItems,
  getMoviePlaybackCards,
  getMovieRatings,
  getPrimaryMovieImage,
} from '@/components/shared/movieDetails';

function DetailFactGrid({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-sm font-medium text-foreground break-words">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export default function MovieDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { config, isServiceReady } = useServiceConfig();

  const ready = isServiceReady('radarr');
  const tautulliReady = isServiceReady('tautulli');
  const plexReady = isServiceReady('plex');
  const serviceKey = getServiceCacheKey(config.radarr);
  const tautulliKey = getServiceCacheKey(config.tautulli);
  const plexKey = getServiceCacheKey(config.plex);
  const {
    data: movie,
    isPending,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['movie-details', ...serviceKey, String(id || ''), ...tautulliKey, tautulliReady ? 'history' : 'no-history', ...plexKey, plexReady ? 'plex-sessions' : 'no-plex'],
    queryFn: () => fetchMovieDetailsData(config.radarr, config.tautulli, config.plex, id, tautulliReady, plexReady),
    enabled: ready && Boolean(id),
    staleTime: 2 * 60 * 1000,
  });

  const links = useMemo(() => buildMovieExternalLinks(movie || {}, config.radarr || {}), [movie, config.radarr]);
  const posterImage = useMemo(() => getPrimaryMovieImage(movie || {}, config.radarr || {}), [movie, config.radarr]);
  const ratingItems = useMemo(() => getMovieRatings(movie || {}), [movie]);
  const factItems = useMemo(() => getMovieFactItems(movie || {}), [movie]);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const playbackCards = useMemo(() => getMoviePlaybackCards(movie || {}, movie?.historyRows || [], movie?.plexSessions || []), [movie]);
  const playbackSummary = useMemo(() => buildMoviePlaybackSummary(movie || {}, movie?.historyRows || [], movie?.plexSessions || []), [movie]);

  if (!ready) {
    return (
      <div>
        <PageHeader title="Movie details" subtitle="Open a movie from your library to see its metadata" icon={Film} accentColor="bg-amber-500/10" />
        <EmptyState icon={Film} title="Radarr not configured" description="Add your Radarr URL and API key in settings to view movie details." />
      </div>
    );
  }

  if (isPending && !movie) {
    return (
      <div>
        <PageHeader title="Movie details" subtitle="Loading movie metadata" icon={Film} accentColor="bg-amber-500/10">
          <Button variant="outline" size="sm" onClick={() => navigate('/movies')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Movies
          </Button>
        </PageHeader>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div>
        <PageHeader title="Movie details" subtitle="We couldn't load that movie" icon={Film} accentColor="bg-amber-500/10">
          <Button variant="outline" size="sm" onClick={() => navigate('/movies')}>
            <ArrowLeft className="mr-2 h-4 w-4" />Back to Movies
          </Button>
        </PageHeader>
        <EmptyState icon={Film} title="Movie not available" description={error?.message || 'That movie could not be found in Radarr.'} showSettings={false} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={movie.title} subtitle={`${movie.year || 'Unknown year'} • ${formatMovieRuntime(movie.runtime)}`} icon={Film} accentColor="bg-amber-500/10">
        <Button variant="outline" size="sm" onClick={() => navigate('/movies')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Movies
        </Button>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />Refresh
        </Button>
        {links.radarr && (
          <a href={links.radarr} target="_blank" rel="noreferrer">
            <Button size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />Open in Radarr
            </Button>
          </a>
        )}
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="overflow-hidden border-border/70 bg-card/95">
          <div className="aspect-[2/3] bg-muted">
            {posterImage ? (
              <img src={posterImage} alt={movie.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-6xl font-bold text-muted-foreground/20">
                {movie.title?.[0]}
              </div>
            )}
          </div>
          <CardContent className="space-y-4 p-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Genres</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(movie.genres || []).length > 0 ? (
                  movie.genres.map((genre) => (
                    <Badge key={genre} variant="secondary">{genre}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">No genres available</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Links</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {links.imdb && (
                  <a href={links.imdb} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">IMDb</Button>
                  </a>
                )}
                {links.tmdb && (
                  <a href={links.tmdb} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">TMDb</Button>
                  </a>
                )}
                {movie.website && (
                  <a href={movie.website} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm">Official Site</Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/70 bg-card/95">
            <CardHeader>
              <CardTitle>About this movie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-7 text-muted-foreground">
                {movie.overview || 'No description is available for this movie yet.'}
              </p>
              <DetailFactGrid items={factItems.slice(0, 4)} />
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Ratings</p>
                {ratingItems.length > 0 ? (
                  <div className="grid gap-2 grid-cols-5">
                    {ratingItems.map((rating) => (
                      <div key={rating.label} className="rounded-lg border border-border/70 bg-muted/20 px-2 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-flex min-w-[2.5rem] items-center justify-center rounded-md border px-1.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${rating.iconClassName}`}>{rating.iconLabel}</span>
                          <p className="text-lg font-semibold text-foreground leading-none">{rating.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No ratings are available for this movie yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/95">
            <CardHeader>
              <CardTitle>Technical details</CardTitle>
            </CardHeader>
            <CardContent>
              <DetailFactGrid items={factItems.slice(4)} />
            </CardContent>
          </Card>

          <Collapsible open={playbackOpen} onOpenChange={setPlaybackOpen}>
            <Card className="border-border/70 bg-card/95">
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left">
                  <CardHeader className="cursor-pointer select-none">
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2"><PlayCircle className="h-4 w-4 text-fuchsia-400" />Playback & watch history</span>
                      <Badge variant="outline">{playbackOpen ? 'Hide' : 'Show'}</Badge>
                    </CardTitle>
                  </CardHeader>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-5">
                  <DetailFactGrid items={playbackCards} />
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]">
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Recent plays</p>
                      {(playbackSummary.matchingHistory || []).length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {playbackSummary.matchingHistory.slice(0, 5).map((row, index) => (
                            <div key={`${row.date || row.stopped || 'play'}-${index}`} className="flex items-start justify-between gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground">{row.friendly_name || row.user || 'Unknown user'}</p>
                                <p className="text-xs text-muted-foreground">{formatMoviePlaybackClient(row)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">{formatMoviePlaybackDate(Number(row.stopped || row.date || 0) * 1000)}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <Badge variant="secondary">{formatMoviePlaybackDecision(row)}</Badge>
                                <p className="mt-2 text-xs text-muted-foreground">{Number(row.percent_complete || 0) ? `${Math.round(Number(row.percent_complete || 0))}% watched` : 'Playback recorded'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">{tautulliReady ? 'No matching Tautulli history was found for this movie yet.' : 'Configure Tautulli in Settings to pull watch history for this movie.'}</p>
                      )}
                    </div>

                    <div className="rounded-lg border border-border/70 bg-muted/20 p-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Active Plex sessions</p>
                      {(playbackSummary.matchingSessions || []).length > 0 ? (
                        <div className="mt-3 space-y-3">
                          {playbackSummary.matchingSessions.map((session, index) => (
                            <div key={`${session.title || 'session'}-${session.User?.title || 'user'}-${index}`} className="rounded-lg border border-border/70 bg-background/40 p-3">
                              <p className="text-sm font-medium text-foreground">{session.User?.title || 'Unknown user'}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{formatMoviePlexSessionLabel(session)}</p>
                              <p className="mt-2 text-xs text-muted-foreground">State: {session.Player?.state || 'playing'}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-sm text-muted-foreground">{plexReady ? 'No active Plex sessions currently match this movie.' : 'Configure Plex in Settings to show active sessions for this movie.'}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}
