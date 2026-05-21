import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, ExternalLink, Film, Loader2, PlayCircle, RefreshCw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  getMovieRuntimeIssue,
  getPrimaryMovieImage,
} from '@/components/shared/movieDetails';
import { buildMovieCleanupPlan, getMovieCleanupMode, MOVIE_CLEANUP_MODE_OPTIONS } from '@/components/shared/movieCleanup';
import { runMovieCleanupAction, runMovieReplacementAction } from '@/components/shared/movieCleanupActions';
import { toast } from 'sonner';

function DetailFactGrid({ items }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border/70 bg-muted/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{item.label}</p>
          {item.value ? <p className="mt-1 text-sm font-medium text-foreground break-words">{item.value}</p> : null}
          {Array.isArray(item.inlineParts) && item.inlineParts.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              {item.inlineParts.map((part, index) => (
                <React.Fragment key={`${item.label}-inline-${index}`}>
                  {index > 0 ? <span className="mx-1.5">·</span> : null}
                  <span className="font-medium text-foreground">{part.value}</span>
                </React.Fragment>
              ))}
            </p>
          ) : Array.isArray(item.equation) && item.equation.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {item.equation.map((part, index) => (
                <React.Fragment key={`${item.label}-equation-${index}`}>
                  {index > 0 ? <span className="text-muted-foreground">{part.operator}</span> : null}
                  <span className="rounded-md border border-border/60 bg-background/40 px-2 py-1">
                    <span className="mr-1 uppercase tracking-[0.14em] text-muted-foreground">{part.label}</span>
                    <span className="font-medium text-foreground">{part.value}</span>
                  </span>
                </React.Fragment>
              ))}
            </div>
          ) : Array.isArray(item.details) && item.details.length > 0 ? (
            <div className="mt-3 space-y-1.5">
              {item.details.map((detail) => (
                <div key={`${item.label}-${detail.label}`} className="flex items-center justify-between gap-3 text-xs">
                  <span className="uppercase tracking-[0.14em] text-muted-foreground">{detail.label}</span>
                  <span className="text-right font-medium text-foreground">{detail.value}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default function MovieDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const {
    config,
    isServiceReady,
    movieCleanupPreferences,
    updateMovieCleanupPreferences,
  } = useServiceConfig();

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
  const runtimeIssue = useMemo(() => getMovieRuntimeIssue(movie || {}), [movie]);
  const [oneAndDoneOpen, setOneAndDoneOpen] = useState(false);
  const [playbackOpen, setPlaybackOpen] = useState(false);
  const [actioningCleanup, setActioningCleanup] = useState(false);
  const [actioningReplacement, setActioningReplacement] = useState(false);
  const playbackCards = useMemo(() => getMoviePlaybackCards(movie || {}, movie?.historyRows || [], movie?.plexSessions || []), [movie]);
  const playbackSummary = useMemo(() => buildMoviePlaybackSummary(movie || {}, movie?.historyRows || [], movie?.plexSessions || []), [movie]);
  const cleanupMode = useMemo(() => getMovieCleanupMode(movieCleanupPreferences, id), [movieCleanupPreferences, id]);
  const cleanupPlan = useMemo(() => buildMovieCleanupPlan({
    movie,
    policyMode: cleanupMode,
    historyRows: movie?.historyRows || [],
    watchedThresholdPercent: movieCleanupPreferences?.watchedThresholdPercent,
    waitDays: movieCleanupPreferences?.waitDays,
  }), [movie, cleanupMode, movieCleanupPreferences]);

  const updateMoviePolicy = async (mode) => {
    const nextPreferences = {
      ...movieCleanupPreferences,
      movies: {
        ...(movieCleanupPreferences?.movies || {}),
        [String(id)]: { mode },
      },
    };
    const savedLabel = MOVIE_CLEANUP_MODE_OPTIONS.find((option) => option.value === mode)?.label || mode;

    try {
      await updateMovieCleanupPreferences(nextPreferences);
      toast.success(`Saved cleanup policy: ${savedLabel}`);
    } catch {
      toast.error('Failed to save cleanup policy');
    }
  };

  const applyMovieCleanup = async () => {
    if (!cleanupPlan.isEligible) {
      toast('This movie is not eligible for cleanup yet.');
      return;
    }

    setActioningCleanup(true);
    try {
      await runMovieCleanupAction({
        radarrConfig: config.radarr,
        movie,
        mode: cleanupMode,
      });
      const cleanupActionLabel = cleanupMode === 'delete-unmonitor' ? 'Delete file + unmonitor' : 'Keep after watched';
      toast.success(`Applied movie cleanup: ${cleanupActionLabel}`);
      await refetch();
    } catch (actionError) {
      toast.error(actionError.message || 'Failed to apply movie cleanup');
    } finally {
      setActioningCleanup(false);
    }
  };

  const replaceMovieFile = async () => {
    if (!runtimeIssue.isSuspicious) {
      toast('This movie does not currently look like a bad runtime mismatch.');
      return;
    }

    setActioningReplacement(true);
    try {
      await runMovieReplacementAction({
        radarrConfig: config.radarr,
        movie,
      });
      toast.success('Deleted the current file and queued a fresh Radarr search.');
      await refetch();
    } catch (actionError) {
      toast.error(actionError.message || 'Failed to replace the current movie file');
    } finally {
      setActioningReplacement(false);
    }
  };

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

          {runtimeIssue.isSuspicious ? (
            <Card className="border-amber-500/40 bg-card/95">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>Potential bad file</span>
                  <Badge variant="secondary">Delta {runtimeIssue.delta}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Delete the current file, keep this movie monitored, and ask Radarr to search again.</p>
                <p className="text-xs text-muted-foreground">Runtime says {runtimeIssue.fileRuntime} file • {runtimeIssue.metaRuntime} metadata • {runtimeIssue.delta} delta.</p>
                <Button onClick={replaceMovieFile} disabled={actioningReplacement}>
                  {actioningReplacement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Replace bad file
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Collapsible open={oneAndDoneOpen} onOpenChange={setOneAndDoneOpen}>
            <Card className="border-border/70 bg-card/95">
              <CollapsibleTrigger asChild>
                <button type="button" className="w-full text-left">
                  <CardHeader className="cursor-pointer select-none">
                    <CardTitle className="flex items-center justify-between gap-3">
                      <span>One-and-done</span>
                      <Badge variant="outline">{oneAndDoneOpen ? 'Hide' : 'Show'}</Badge>
                    </CardTitle>
                  </CardHeader>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Opt-in cleanup for documentaries or other watch-once titles • Tautulli watched signal • {movieCleanupPreferences.watchedThresholdPercent}% threshold • wait {movieCleanupPreferences.waitDays} day{movieCleanupPreferences.waitDays === 1 ? '' : 's'}</p>
                      <Select value={cleanupMode} onValueChange={updateMoviePolicy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select movie cleanup mode" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOVIE_CLEANUP_MODE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={applyMovieCleanup} disabled={actioningCleanup || cleanupMode === 'keep-all'}>
                      {actioningCleanup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Delete now + unmonitor
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Policy</p><p className="mt-1 text-sm font-medium">{MOVIE_CLEANUP_MODE_OPTIONS.find((option) => option.value === cleanupMode)?.label || 'Keep after watched'}</p></div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Watched</p><p className="mt-1 text-sm font-medium">{cleanupPlan.isWatched ? 'Yes' : 'No'}</p></div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Eligible</p><p className="mt-1 text-sm font-medium">{cleanupPlan.isEligible ? 'Yes' : 'No'}</p></div>
                    <div className="rounded-lg border border-border/70 bg-muted/20 p-3"><p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Last watched</p><p className="mt-1 text-sm font-medium">{formatMoviePlaybackDate(cleanupPlan.lastWatchedAt)}</p></div>
                  </div>
                  <p className="text-xs text-muted-foreground">Modes: Keep after watched • Delete file + unmonitor after watched</p>
                  {!tautulliReady && (
                    <p className="text-sm text-muted-foreground">Configure Tautulli in Settings before watched-based cleanup can trigger automatically.</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

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
