import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  buildMoviePlaybackSummary,
  matchMovieHistoryRows,
  matchMoviePlexSessions,
} from '../src/components/shared/movieDetails.js';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('movie playback helpers match Tautulli movie rows and Plex sessions by title/year and summarize playback metrics', () => {
  const movie = { title: 'The Boy Who Could Fly', year: 1986 };
  const historyRows = [
    {
      title: 'The Boy Who Could Fly',
      full_title: 'The Boy Who Could Fly',
      user: 'Mark',
      date: 1710000000,
      stopped: 1710003600,
      transcode_decision: 'direct play',
      percent_complete: 100,
      originally_available_at: '1986-08-15',
      product: 'Plex Web',
      player: 'Chrome',
    },
    {
      title: 'The Boy Who Could Fly',
      full_title: 'The Boy Who Could Fly',
      user: 'Guest',
      date: 1710100000,
      stopped: 1710105400,
      transcode_decision: 'transcode',
      percent_complete: 92,
      originally_available_at: '1986-08-15',
      product: 'Plex for Roku',
      player: 'Roku TV',
    },
    {
      title: 'Alien',
      full_title: 'Alien',
      user: 'Other',
      date: 1710200000,
      stopped: 1710205400,
      transcode_decision: 'direct play',
      percent_complete: 100,
      originally_available_at: '1979-05-25',
    },
  ];
  const sessions = [
    { title: 'The Boy Who Could Fly', year: 1986, User: { title: 'Mark' }, Player: { product: 'Apple TV', state: 'playing' } },
    { title: 'Alien', year: 1979, User: { title: 'Other' }, Player: { product: 'Web', state: 'paused' } },
  ];

  const matchingHistory = matchMovieHistoryRows(movie, historyRows);
  const matchingSessions = matchMoviePlexSessions(movie, sessions);
  const summary = buildMoviePlaybackSummary(movie, matchingHistory, matchingSessions);

  assert.equal(matchingHistory.length, 2);
  assert.equal(matchingSessions.length, 1);
  assert.equal(summary.totalPlays, 2);
  assert.equal(summary.directPlays, 1);
  assert.equal(summary.transcodes, 1);
  assert.equal(summary.lastWatchedBy, 'Guest');
  assert.equal(summary.activeSessions, 1);
});

test('movie playback helpers match Tautulli original titles when short title aliases differ from the Radarr movie title', () => {
  const movie = { title: 'E.T. the Extra-Terrestrial', year: 1982 };
  const historyRows = [
    {
      title: 'E.T.',
      full_title: 'E.T.',
      original_title: 'E.T. the Extra-Terrestrial',
      user: 'Darkmatter5',
      date: 1778086299,
      stopped: 1778087713,
      transcode_decision: 'transcode',
      percent_complete: 20,
      originally_available_at: '1982-06-11',
      product: 'Plex for Samsung',
      player: 'TV 2025',
      platform: 'Tizen',
    },
  ];

  const matchingHistory = matchMovieHistoryRows(movie, historyRows);
  const summary = buildMoviePlaybackSummary(movie, historyRows, []);

  assert.equal(matchingHistory.length, 1);
  assert.equal(matchingHistory[0].percent_complete, 20);
  assert.equal(summary.totalPlays, 1);
  assert.equal(summary.transcodes, 1);
  assert.equal(summary.lastWatchedBy, 'Darkmatter5');
});

test('movie playback helpers match Tautulli subtitle variants when the playback title extends the Radarr title', () => {
  const movie = { title: 'Interview with the Vampire', year: 1994 };
  const historyRows = [
    {
      title: 'Interview with the Vampire: The Vampire Chronicles',
      full_title: 'Interview with the Vampire: The Vampire Chronicles',
      original_title: '',
      user: 'Darkmatter5',
      friendly_name: 'Darkmatter5',
      date: 1779931694,
      stopped: 1779934817,
      transcode_decision: 'direct play',
      percent_complete: 96,
      originally_available_at: '1994-11-11',
      platform: 'tvOS',
      player: 'Apple TV',
      product: 'Plex for Apple TV',
    },
  ];

  const matchingHistory = matchMovieHistoryRows(movie, historyRows);
  const summary = buildMoviePlaybackSummary(movie, historyRows, []);

  assert.equal(matchingHistory.length, 1);
  assert.equal(matchingHistory[0].percent_complete, 96);
  assert.equal(summary.totalPlays, 1);
  assert.equal(summary.directPlays, 1);
  assert.equal(summary.lastWatchedBy, 'Darkmatter5');
});

test('movie playback helpers prefer shared external ids over display-title differences when available', () => {
  const movie = { title: 'Interview with the Vampire', year: 1994, tmdbId: 628, imdbId: 'tt0110148' };
  const historyRows = [
    {
      title: 'Totally Different Library Title',
      full_title: 'Interview with the Vampire: Collector Cut',
      imdb_id: 'tt0110148',
      tmdb_id: 628,
      user: 'Darkmatter5',
      friendly_name: 'Darkmatter5',
      date: 1779931694,
      stopped: 1779934817,
      transcode_decision: 'direct play',
      percent_complete: 96,
      originally_available_at: '1994-11-11',
    },
  ];
  const sessions = [
    {
      title: 'Different Plex Display Title',
      year: 1994,
      Guid: [
        { id: 'imdb://tt0110148' },
        { id: 'tmdb://628' },
      ],
      User: { title: 'Darkmatter5' },
      Player: { product: 'Apple TV', state: 'playing' },
    },
  ];

  const matchingHistory = matchMovieHistoryRows(movie, historyRows);
  const matchingSessions = matchMoviePlexSessions(movie, sessions);
  const summary = buildMoviePlaybackSummary(movie, historyRows, sessions);

  assert.equal(matchingHistory.length, 1);
  assert.equal(matchingSessions.length, 1);
  assert.equal(summary.totalPlays, 1);
  assert.equal(summary.activeSessions, 1);
  assert.equal(summary.lastWatchedBy, 'Darkmatter5');
});

test('movie playback source wiring loads Tautulli/Plex data and renders playback info on movie details page', () => {
  const movieSource = read('src/pages/MovieDetails.jsx');
  const querySource = read('src/lib/mediaQueries.js');

  assert.match(querySource, /export const fetchMovieDetailsData = async \(radarrConfig, tautulliConfig, plexConfig, id, includeHistory, includeSessions\) => \{/);
  assert.match(querySource, /tautulliApi\.getHistory\(tautulliConfig, \{ media_type: 'movie'/);
  assert.match(querySource, /plexApi\.getSessions\(plexConfig\)/);
  assert.match(querySource, /const historyPromise = includeHistory/);
  assert.match(querySource, /const plexSessionsPromise = includeSessions/);
  assert.doesNotMatch(querySource, /const \[movie, files, historyRows = \[\], plexSessionsResponse = \{ MediaContainer: \{ Metadata: \[\] \} \} \] = await Promise\.all\(requests\);/);

  assert.match(movieSource, /Playback & watch history/);
  assert.match(movieSource, /Recent plays/);
  assert.match(movieSource, /Active Plex sessions/);
  assert.match(movieSource, /fetchMovieDetailsData\(config\.radarr, config\.tautulli, config\.plex, id, tautulliReady, plexReady\)/);
});

test('movie playback panel is rendered at the bottom of the details stack and is collapsed by default', () => {
  const movieSource = read('src/pages/MovieDetails.jsx');

  assert.match(movieSource, /import \{ Collapsible, CollapsibleContent, CollapsibleTrigger \} from '@\/components\/ui\/collapsible';/);
  assert.match(movieSource, /const \[playbackOpen, setPlaybackOpen\] = useState\(false\);/);
  assert.match(movieSource, /<Collapsible open=\{playbackOpen\} onOpenChange=\{setPlaybackOpen\}>/);
  assert.match(movieSource, /<CollapsibleTrigger asChild>/);
  assert.match(movieSource, /<CollapsibleContent/);

  const playbackIndex = movieSource.indexOf('Playback & watch history');
  const ratingsIndex = movieSource.indexOf('Ratings');
  const technicalIndex = movieSource.indexOf('Technical details');
  assert.ok(playbackIndex > ratingsIndex, 'playback panel should come after Ratings');
  assert.ok(playbackIndex > technicalIndex, 'playback panel should come after Technical details');
});
