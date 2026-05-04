# MediaHub React Query Hybrid Caching Plan

> For Hermes: implement shared query-backed config plus cached read-heavy pages, preserving manual refresh controls.

## Goal
Make MediaHub navigation feel fast by keeping recent page data in memory, refreshing in the background when stale, and polling only on the dashboard where live status matters.

## Scope
1. Strengthen `src/lib/query-client.js` defaults for in-memory caching.
2. Convert `src/lib/useServiceConfig.js` to shared query-backed app config with mutation-driven cache updates.
3. Convert primary read-heavy pages to `useQuery` reads:
   - `src/pages/Dashboard.jsx`
   - `src/pages/Movies.jsx`
   - `src/pages/TvShows.jsx`
   - `src/pages/MovieDetails.jsx`
   - `src/pages/TvShowDetails.jsx`
4. Keep manual refresh buttons via `refetch()`.
5. Add source-level regression tests proving the app uses query-backed caching instead of mount-only `useEffect` fetches.

## Target behavior
- Lists/details show cached data immediately when revisited.
- Dashboard polls every ~30 seconds.
- Movies/TV/details refresh on demand and when cache is stale, not on every route mount.
- App config is shared through one cache entry instead of per-hook local bootstrapping.
