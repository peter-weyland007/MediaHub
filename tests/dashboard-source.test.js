import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('/Users/itadmin/Desktop/Projects/MediaHub/src/pages/Dashboard.jsx', 'utf8');

test('Dashboard uses a cached query and only refreshes live status on a timer or manual refetch', () => {
  assert.match(source, /useQuery/);
  assert.match(source, /queryKey:\s*\['dashboard'/);
  assert.match(source, /refetchInterval:\s*30\s*\*\s*1000|refetchInterval:\s*30000/);
  assert.match(source, /refetch\(/);
  assert.doesNotMatch(source, /useEffect\(\(\) => \{\s*fetchAll\(\);\s*\}, \[fetchAll\]\)/s);
});

test('Dashboard status loading is driven by query state instead of mount-only local orchestration', () => {
  assert.match(source, /isFetching|isLoading|isPending/);
  assert.doesNotMatch(source, /const \[statuses, setStatuses\] = useState\(\{\}\);/);
  assert.doesNotMatch(source, /const \[stats, setStats\] = useState\(\{\}\);/);
  assert.doesNotMatch(source, /const \[queue, setQueue\] = useState\(\[\]\);/);
});
