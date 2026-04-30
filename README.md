# MediaNexus

MediaNexus is a React + Vite media-services dashboard for working with Radarr, Sonarr, Lidarr, Overseerr, Plex, and Prowlarr.

## Local development

```bash
npm install
npm run dev
```

Optional local `.env.local` values:

```bash
VITE_BASE44_APP_ID=
VITE_BASE44_APP_BASE_URL=
VITE_BASE44_FUNCTIONS_VERSION=
```

## Runtime container configuration

This repo is set up so the Docker container can be reused across Unraid and other Docker hosts without rebuilding for each environment.

Set these environment variables on the container:

- `VITE_BASE44_APP_ID`
- `VITE_BASE44_APP_BASE_URL`
- `VITE_BASE44_FUNCTIONS_VERSION`

At container start, `docker/docker-entrypoint.sh` renders `/env-config.js` and the app reads runtime config from `window.__APP_CONFIG__` before falling back to Vite build-time values.

## Build and run locally with Docker

```bash
docker build -t medianexus:local .
docker run --rm -p 8080:8080 \
  -e VITE_BASE44_APP_ID=your_app_id \
  -e VITE_BASE44_APP_BASE_URL=https://your-base44-app-url \
  medianexus:local
```

Then open <http://localhost:8080>.

## GitHub / GHCR deployment flow

This repo includes two GitHub Actions workflows:

- `Build and Publish GHCR` — runs on push to `main`, publishes `ghcr.io/<owner>/medianexus:main` and `sha-<commit>` tags
- `Promote GHCR image to prod` — manually retags a selected source tag as `:prod`

Recommended Unraid deployment target:

- image: `ghcr.io/<owner>/medianexus:prod`
- port: container `8080`
- env vars: set the Base44 values above

## Verification status

Verified locally:

- `npm install`
- `npm run build`
- `npm run lint`

Known rough edge:

- `npm run typecheck` currently fails across many JSX/UI files from the imported Base44 scaffold. That is existing app debt, not introduced by the containerization changes.
