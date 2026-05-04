import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (relativePath) => fs.readFileSync(`/Users/itadmin/Desktop/Projects/MediaHub/${relativePath}`, 'utf8');

test('query client defines hybrid caching defaults for background refresh and in-memory reuse', () => {
  const source = read('src/lib/query-client.js');

  assert.match(source, /staleTime:\s*30\s*\*\s*1000|staleTime:\s*30000/);
  assert.match(source, /gcTime:\s*10\s*\*\s*60\s*\*\s*1000|gcTime:\s*600000/);
  assert.match(source, /refetchOnWindowFocus:\s*false/);
});

test('service config hook is backed by a shared app-config query cache', () => {
  const source = read('src/lib/useServiceConfig.js');

  assert.match(source, /useQuery/);
  assert.match(source, /APP_CONFIG_QUERY_KEY|queryKey:\s*\['app-config'\]/);
  assert.match(source, /queryFn:\s*async \(\) => normalizeAppConfig\(await appConfigApi\.getConfig\(\)\)|queryFn:\s*appConfigApi\.getConfig|queryFn:\s*\(\)\s*=>\s*appConfigApi\.getConfig\(\)/);
  assert.match(source, /useQueryClient/);
  assert.match(source, /setQueryData\(APP_CONFIG_QUERY_KEY|setQueryData\(\['app-config'\]/);
});

test('Dashboard uses a cached query plus scheduled polling instead of mount-only useEffect fetching', () => {
  const source = read('src/pages/Dashboard.jsx');

  assert.match(source, /useQuery/);
  assert.match(source, /queryKey:\s*\['dashboard'/);
  assert.match(source, /refetchInterval:\s*30\s*\*\s*1000|refetchInterval:\s*30000/);
  assert.doesNotMatch(source, /useEffect\(\(\) => \{\s*fetchAll\(\);\s*\}, \[fetchAll\]\)/s);
});

test('Movies and TV pages use cached queries for list data and reference data', () => {
  for (const relativePath of ['src/pages/Movies.jsx', 'src/pages/TvShows.jsx']) {
    const source = read(relativePath);

    assert.match(source, /useQuery/);
    assert.match(source, /queryKey:\s*\[(?:'|")(?:movies|tv-shows|series)(?:'|")/);
    assert.match(source, /refetch\(/);
    assert.doesNotMatch(source, /useEffect\([\s\S]*fetch(?:Movies|Series)\(\)[\s\S]*qualityPreferences\./s);
  }
});

test('detail pages use cached queries instead of local loading state orchestration', () => {
  for (const relativePath of ['src/pages/MovieDetails.jsx', 'src/pages/TvShowDetails.jsx']) {
    const source = read(relativePath);

    assert.match(source, /useQuery/);
    assert.doesNotMatch(source, /const \[loading, setLoading\] = useState\(true\);/);
    assert.doesNotMatch(source, /useEffect\(/);
  }
});
