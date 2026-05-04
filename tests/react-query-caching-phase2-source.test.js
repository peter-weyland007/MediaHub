import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (relativePath) => fs.readFileSync(`/Users/itadmin/Desktop/Projects/MediaHub/${relativePath}`, 'utf8');

test('season and episode detail pages use cached queries instead of mount-only loading orchestration', () => {
  for (const relativePath of ['src/pages/TvSeasonDetails.jsx', 'src/pages/TvEpisodeDetails.jsx']) {
    const source = read(relativePath);
    assert.match(source, /useQuery/);
    assert.doesNotMatch(source, /const \[loading, setLoading\] = useState\(true\);/);
    assert.doesNotMatch(source, /useEffect\([\s\S]*load(?:Season|Episode)\(/s);
  }
});

test('Plex library page uses cached queries for libraries, content, sessions, and cross-links', () => {
  const source = read('src/pages/PlexLibrary.jsx');
  assert.match(source, /useQuery/);
  assert.match(source, /queryKey:\s*\['plex-libraries'/);
  assert.match(source, /queryKey:\s*\['plex-library-content'/);
  assert.match(source, /queryKey:\s*\['plex-sessions'/);
  assert.match(source, /queryKey:\s*\['plex-library-links'/);
  assert.match(source, /refetchLibraries|handleRefresh/);
  assert.match(source, /useEffect\(/);
});

test('Requests and Indexers pages use cached queries with manual refetch instead of mount-only fetchers', () => {
  for (const [relativePath, keyPattern] of [
    ['src/pages/Requests.jsx', /queryKey:\s*\['requests'/],
    ['src/pages/Indexers.jsx', /queryKey:\s*\['indexers'/],
  ]) {
    const source = read(relativePath);
    assert.match(source, /useQuery/);
    assert.match(source, keyPattern);
    assert.match(source, /refetch\(/);
    assert.doesNotMatch(source, /useEffect\(/);
  }
});
