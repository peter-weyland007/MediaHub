import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  formatMovieRuntime,
  formatMovieFileSize,
  getPrimaryMovieImage,
  buildMovieExternalLinks,
  getMovieFactItems,
  getMovieRatings,
  resolveLibraryItemDetailsPath,
  resolveLibrarySeriesDetailsPath,
} from '../src/components/shared/movieDetails.js';
import { buildSeriesExternalLinks } from '../src/components/shared/tvDetails.js';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('movie detail helpers format runtime and file sizes for readable display', () => {
  assert.equal(formatMovieRuntime(113), '1h 53m');
  assert.equal(formatMovieRuntime(45), '45m');
  assert.equal(formatMovieRuntime(undefined), 'Unknown');
  assert.equal(formatMovieFileSize(7655262256), '7.1 GB');
  assert.equal(formatMovieFileSize(0), '—');
});

test('movie detail helpers prefer title slugs for source-app links and keep external metadata links', () => {
  const movie = {
    id: 3,
    imdbId: 'tt0289043',
    tmdbId: 170,
    titleSlug: '170',
    images: [
      { coverType: 'fanart', remoteUrl: 'https://image.tmdb.org/fanart.jpg' },
      { coverType: 'poster', remoteUrl: 'https://image.tmdb.org/poster.jpg' },
    ],
  };

  assert.equal(getPrimaryMovieImage(movie, { url: 'http://radarr.local' }), 'https://image.tmdb.org/poster.jpg');
  assert.deepEqual(buildMovieExternalLinks(movie, { url: 'http://radarr.local' }), {
    radarr: 'http://radarr.local/movie/170',
    imdb: 'https://www.imdb.com/title/tt0289043/',
    tmdb: 'https://www.themoviedb.org/movie/170',
  });
});

test('series detail helpers prefer title slugs for Sonarr links', () => {
  const series = {
    id: 1,
    title: 'Devil in Disguise: John Wayne Gacy',
    titleSlug: 'devil-in-disguise-john-wayne-gacy',
    imdbId: 'tt31314754',
    tvdbId: 446150,
  };

  assert.deepEqual(buildSeriesExternalLinks(series, { url: 'http://sonarr.local/' }), {
    sonarr: 'http://sonarr.local/series/devil-in-disguise-john-wayne-gacy',
    imdb: 'https://www.imdb.com/title/tt31314754/',
    tvdb: 'https://thetvdb.com/dereferrer/series/446150',
  });
});

test('movie detail helpers expose key facts for studio, runtime, status, quality, and branded rating metadata', () => {
  const facts = getMovieFactItems({
    studio: 'DNA Films',
    status: 'released',
    minimumAvailability: 'released',
    movieFile: {
      size: 7655262256,
      quality: { quality: { name: 'WEBDL-1080p' } },
      mediaInfo: { videoCodec: 'x264', audioCodec: 'EAC3', runTime: '1:57:27' },
    },
  });

  assert.deepEqual(facts.map((item) => item.label), [
    'Studio',
    'Status',
    'Availability',
    'Quality',
    'Video',
    'Audio',
    'File size',
    'File runtime',
  ]);
  assert.equal(facts.find((item) => item.label === 'Quality')?.value, 'WEBDL-1080p');

  const ratings = getMovieRatings({
    ratings: {
      imdb: { value: 6.64 },
      tmdb: { value: 6.34 },
      metacritic: { value: 67.2 },
      rottenTomatoes: { value: 59.4 },
      trakt: { value: 6.82734 },
      letterboxd: { value: '' },
    },
  });

  assert.deepEqual(ratings.map((item) => item.label), ['IMDb', 'TMDb', 'Metacritic', 'Rotten Tomatoes', 'Trakt']);
  assert.deepEqual(ratings.map((item) => item.value), ['6.6', '6.3', '67', '59', '6.8']);
  assert.equal(ratings[0].iconLabel, 'IMDb');
  assert.equal(ratings[1].iconLabel, 'TMDb');
  assert.equal(getMovieRatings({ ratings: { imdb: { value: '' }, tmdb: { value: null } } }).length, 0);
});

test('movie detail helpers can resolve Plex library movies and shows into shared details routes', () => {
  const moviePath = resolveLibraryItemDetailsPath(
    { type: 'movie', title: '28 Days Later', year: 2002 },
    [
      { id: 999, title: 'Alien', year: 1979 },
      { id: 3, title: '28 Days Later', year: 2002 },
    ],
  );

  const seriesPath = resolveLibrarySeriesDetailsPath(
    { type: 'show', title: '1883', year: 2021 },
    [
      { id: 16, title: 'Adventures of the Gummi Bears', year: 1985 },
      { id: 13, title: '1883', year: 2021 },
    ],
  );

  assert.equal(moviePath, '/movies/3');
  assert.equal(seriesPath, '/tv-shows/13');
  assert.equal(resolveLibraryItemDetailsPath({ type: 'show', title: 'Voyager', year: 1995 }, []), '');
  assert.equal(resolveLibrarySeriesDetailsPath({ type: 'movie', title: 'Alien', year: 1979 }, []), '');
});

test('App routes and media library pages wire up shared movie and TV details experiences', () => {
  const appSource = read('src/App.jsx');
  const moviesSource = read('src/pages/Movies.jsx');
  const tvShowsSource = read('src/pages/TvShows.jsx');

  assert.match(appSource, /import MovieDetails from '@\/pages\/MovieDetails';/);
  assert.match(appSource, /import TvShowDetails from '@\/pages\/TvShowDetails';/);
  assert.match(appSource, /path="\/movies\/:id" element={<MovieDetails \/>}/);
  assert.match(appSource, /path="\/tv-shows\/:id" element={<TvShowDetails \/>}/);
  assert.match(moviesSource, /useNavigate/);
  assert.match(moviesSource, /navigate\(`\/movies\/\$\{movie\.id\}`\)/);
  assert.match(moviesSource, /prefetchQuery/);
  assert.match(tvShowsSource, /useNavigate/);
  assert.match(tvShowsSource, /navigate\(`\/tv-shows\/\$\{show\.id\}`\)/);
  assert.match(tvShowsSource, /prefetchQuery/);
});

test('Library page wires movie and show items into shared details routes and toasts on unmatched items', () => {
  const source = read('src/pages/PlexLibrary.jsx');

  assert.match(source, /useNavigate/);
  assert.match(source, /import \{ toast \} from 'sonner';/);
  assert.match(source, /fetchPlexLibraryLinksData/);
  assert.match(source, /resolveLibraryItemDetailsPath/);
  assert.match(source, /resolveLibrarySeriesDetailsPath/);
  assert.match(source, /onClick=\{\(\) => handleItemClick\(item\)\}/);
  assert.match(source, /toast\('No linked details available for this item yet\.'/);
  assert.match(source, /navigate\(detailsPath\)/);
  assert.match(source, /prefetchQuery/);
});

test('movie details and TV details pages load service metadata and render their key sections plus source links', () => {
  const movieSource = read('src/pages/MovieDetails.jsx');
  const tvSource = read('src/pages/TvShowDetails.jsx');
  const seasonSource = read('src/pages/TvSeasonDetails.jsx');
  const episodeSource = read('src/pages/TvEpisodeDetails.jsx');

  assert.match(movieSource, /useParams/);
  assert.match(movieSource, /useQuery/);
  assert.match(movieSource, /fetchMovieDetailsData\(config\.radarr, config\.tautulli, config\.plex, id, tautulliReady, plexReady\)/);
  assert.match(movieSource, /buildMovieExternalLinks/);
  assert.match(movieSource, /About this movie/);
  assert.match(movieSource, /Ratings/);
  assert.match(movieSource, /getMovieRatings\(movie \|\| \{\}\)/);
  assert.match(movieSource, /ratingItems\.map\(\(rating\) =>/);
  assert.match(movieSource, /rating\.iconLabel/);
  assert.match(movieSource, /className="grid gap-2 grid-cols-5"/);
  assert.match(movieSource, /className="rounded-lg border border-border\/70 bg-muted\/20 px-2 py-2"/);
  assert.match(movieSource, /className="flex items-center justify-between gap-2"/);
  assert.match(movieSource, /min-w-\[2\.5rem\]/);
  assert.match(movieSource, /text-lg font-semibold text-foreground leading-none"/);
  assert.doesNotMatch(movieSource, /text-\[10px\] uppercase tracking-\[0\.1em\] text-muted-foreground/);
  assert.doesNotMatch(movieSource, /<p className="text-\[10px\] uppercase tracking-\[0\.1em\] text-muted-foreground">\{rating\.label\}<\/p>/);
  assert.doesNotMatch(movieSource, /<CardTitle>Ratings<\/CardTitle>/);
  assert.match(movieSource, /Playback & watch history/);
  assert.match(movieSource, /Technical details/);
  assert.match(movieSource, /Open in Radarr/);
  assert.match(movieSource, /IMDb/);
  assert.match(movieSource, /TMDb/);

  assert.match(tvSource, /useParams/);
  assert.match(tvSource, /useQuery/);
  assert.match(tvSource, /fetchTvShowDetailsData\(config\.sonarr, config\.tautulli, id, tautulliReady\)/);
  assert.match(tvSource, /navigate\(`\/tv-shows\/\$\{id\}\/seasons\/\$\{season\.seasonNumber\}`\)/);
  assert.match(tvSource, /Season guide/);
  assert.match(tvSource, /Open episodes/);
  assert.match(tvSource, /About this show/);
  assert.match(tvSource, /Series status/);
  assert.match(tvSource, /Library coverage/);
  assert.match(tvSource, /Open in Sonarr/);
  assert.match(tvSource, /IMDb/);
  assert.match(tvSource, /TVDb/);

  assert.match(seasonSource, /useQuery/);
  assert.match(seasonSource, /fetchTvShowDetailsData\(config\.sonarr, config\.tautulli, seriesId, tautulliReady\)/);
  assert.match(seasonSource, /Season episodes/);
  assert.match(seasonSource, /Download status/);
  assert.match(seasonSource, /onClick=\{\(\) => navigate\(`\/tv-shows\/\$\{seriesId\}\/episodes\/\$\{episode\.id\}`\)\}/);

  assert.match(episodeSource, /useQuery/);
  assert.match(episodeSource, /fetchTvShowDetailsData\(config\.sonarr, config\.tautulli, seriesId, tautulliReady\)/);
  assert.match(episodeSource, /Episode summary/);
  assert.match(episodeSource, /File details/);
  assert.match(episodeSource, /Subtitles/);
  assert.match(episodeSource, /Open in Sonarr/);
});

test('App routes wire up TV season and episode drill-down routes', () => {
  const appSource = read('src/App.jsx');

  assert.match(appSource, /import TvSeasonDetails from '@\/pages\/TvSeasonDetails';/);
  assert.match(appSource, /import TvEpisodeDetails from '@\/pages\/TvEpisodeDetails';/);
  assert.match(appSource, /path="\/tv-shows\/:id\/seasons\/:seasonNumber" element={<TvSeasonDetails \/>}/);
  assert.match(appSource, /path="\/tv-shows\/:id\/episodes\/:episodeId" element={<TvEpisodeDetails \/>}/);
});
