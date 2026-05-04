# MediaHub

MediaHub is a React + Vite media-services dashboard for Radarr, Sonarr, Lidarr, Overseerr, Plex, and Prowlarr.

It now includes a small Node + SQLite backend so app settings persist outside the browser.

## What SQLite stores

MediaHub persists these in SQLite:
- service connection settings (`url`, `apiKey`, `enabled`) for Radarr/Sonarr/Lidarr/Overseerr/Plex/Prowlarr
- quality manager preferences (`movieProfileId`, `tvProfileId`)

Default database path:
- `./data/mediahub.db`

Override with:
- `DATABASE_PATH=/some/path/mediahub.db`

## Local development

Install dependencies:

```bash
npm install
```

Run the SQLite-backed app server:

```bash
npm run build
npm run server
```

That serves:
- the built SPA
- `/api/app-config`
- `/api/app-config/services/:service`
- `/api/app-config/quality-preferences`
- `/env-config.js`

### Optional Vite frontend dev mode

If you want Vite HMR for the frontend while keeping the SQLite backend:

```bash
npm run server
npm run dev
```

Vite proxies these to the backend by default:
- `/api`
- `/env-config.js`

You can change the proxy target with:

```bash
VITE_API_PROXY_TARGET=http://127.0.0.1:8080 npm run dev
```

## Runtime configuration

These values are exposed to the browser via `/env-config.js`:
- `VITE_BASE44_APP_ID`
- `VITE_BASE44_APP_BASE_URL`
- `VITE_BASE44_FUNCTIONS_VERSION`

## Docker

Build:

```bash
docker build -t mediahub:local .
```

Run:

```bash
docker run --rm -p 8080:8080 \
  -e VITE_BASE44_APP_ID=your_app_id \
  -e VITE_BASE44_APP_BASE_URL=https://your-base44-app-url \
  -e VITE_BASE44_FUNCTIONS_VERSION=2026-04-30 \
  -e DATABASE_PATH=/app/data/mediahub.db \
  -v $(pwd)/data:/app/data \
  mediahub:local
```

For Unraid or other Docker hosts, persist `/app/data`.

## GitHub / GHCR deployment flow

This repo includes two GitHub Actions workflows:
- `Build and Publish GHCR`
- `Promote GHCR image to prod`

Recommended deployment target:
- image: `ghcr.io/<owner>/mediahub:prod`
- port: `8080`
- persistent path: `/app/data`
- env vars:
  - `VITE_BASE44_APP_ID`
  - `VITE_BASE44_APP_BASE_URL`
  - `VITE_BASE44_FUNCTIONS_VERSION`
  - `DATABASE_PATH` (optional; defaults to `/app/data/mediahub.db` in container)

## Verification status

Verified locally:
- `npm test`
- `npm run build`
- `npm run lint`
- `npm run typecheck`

## Notes
- Typecheck is intentionally scoped to the app’s shared helper/data modules where JavaScript inference is reliable and useful.
- The imported/generated JSX UI layer is still primarily guarded by build, lint, and source tests rather than full JS type inference.
