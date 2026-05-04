import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';

const createTempPaths = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mediahub-sqlite-test-'));
  return {
    root,
    dbPath: path.join(root, 'mediahub.db'),
    distPath: path.join(root, 'dist'),
  };
};

const writeFakeDist = (distPath) => {
  fs.mkdirSync(distPath, { recursive: true });
  fs.writeFileSync(path.join(distPath, 'index.html'), '<!doctype html><html><body><div id="root">MediaHub</div></body></html>');
};

const withServer = async (options, run) => {
  const app = createApp(options);
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
};

test('GET /api/app-config returns defaults from sqlite-backed store', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/app-config`);
    assert.equal(response.status, 200);

    const body = await response.json();
    assert.deepEqual(body.services.radarr, { url: '', apiKey: '', enabled: false });
    assert.deepEqual(body.services.plex, { url: '', apiKey: '', enabled: false });
    assert.deepEqual(body.qualityPreferences, {});
    assert.deepEqual(body.mediaBrowserPreferences, {
      movies: { viewMode: 'browse', sortBy: 'title-asc' },
      tvShows: { viewMode: 'browse', sortBy: 'title-asc' },
    });
  });
});

test('POST /api/app-config persists service config into sqlite across restarts', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const saveResponse = await fetch(`${baseUrl}/api/app-config/services/radarr`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: 'http://radarr:7878', apiKey: 'secret', enabled: true }),
    });

    assert.equal(saveResponse.status, 200);
  });

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/app-config`);
    const body = await response.json();

    assert.deepEqual(body.services.radarr, {
      url: 'http://radarr:7878',
      apiKey: 'secret',
      enabled: true,
    });
  });
});

test('PUT /api/app-config/quality-preferences persists quality preferences into sqlite', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const saveResponse = await fetch(`${baseUrl}/api/app-config/quality-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ movieProfileId: '10', tvProfileId: '7' }),
    });

    assert.equal(saveResponse.status, 200);
  });

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/app-config`);
    const body = await response.json();

    assert.deepEqual(body.qualityPreferences, { movieProfileId: '10', tvProfileId: '7' });
  });
});

test('PUT /api/app-config/poster-display persists poster display preferences into sqlite', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const saveResponse = await fetch(`${baseUrl}/api/app-config/poster-display`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidePosters: true, posterSize: 'compact' }),
    });

    assert.equal(saveResponse.status, 200);
  });

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/app-config`);
    const body = await response.json();

    assert.deepEqual(body.posterDisplayPreferences, { hidePosters: true, posterSize: 'compact' });
  });
});

test('PUT /api/app-config/media-browser-preferences persists browse-table view and sort preferences into sqlite', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  const payload = {
    movies: { viewMode: 'table', sortBy: 'year-desc' },
    tvShows: { viewMode: 'browse', sortBy: 'episodes-desc' },
  };

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const saveResponse = await fetch(`${baseUrl}/api/app-config/media-browser-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(saveResponse.status, 200);
  });

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/app-config`);
    const body = await response.json();

    assert.deepEqual(body.mediaBrowserPreferences, payload);
  });
});

test('PUT /api/app-config/optimization-preferences persists optimization preferences into sqlite', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const saveResponse = await fetch(`${baseUrl}/api/app-config/optimization-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy: 'compatibility', targetContainer: 'mp4', preferredVideoCodec: 'h264', preferredAudioCodec: 'aac', maxResolution: '1080p' }),
    });

    assert.equal(saveResponse.status, 200);
  });

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/app-config`);
    const body = await response.json();

    assert.deepEqual(body.optimizationPreferences, {
      strategy: 'compatibility',
      targetContainer: 'mp4',
      preferredVideoCodec: 'h264',
      preferredAudioCodec: 'aac',
      maxResolution: '1080p',
    });
  });
});

test('PUT /api/app-config/tv-cleanup-preferences persists watched cleanup preferences into sqlite', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  const payload = {
    watchedThresholdPercent: 90,
    waitDays: 3,
    shows: {
      '13': { mode: 'delete-unmonitor' },
      '42': { mode: 'unmonitor-only' },
    },
    manualOverrides: {
      '1883::1::2': { watched: true, source: 'manual', watchedAt: '2026-05-01T12:00:00.000Z' },
    },
  };

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const saveResponse = await fetch(`${baseUrl}/api/app-config/tv-cleanup-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    assert.equal(saveResponse.status, 200);
  });

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/app-config`);
    const body = await response.json();

    assert.deepEqual(body.tvCleanupPreferences, payload);
  });
});

test('GET /env-config.js renders runtime config for the browser', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({
    dbPath: paths.dbPath,
    distPath: paths.distPath,
    runtimeConfig: {
      VITE_BASE44_APP_ID: 'app-123',
      VITE_BASE44_APP_BASE_URL: 'https://example.base44.app',
      VITE_BASE44_FUNCTIONS_VERSION: '2026-04-30',
    },
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/env-config.js`);
    const text = await response.text();

    assert.equal(response.status, 200);
    assert.match(text, /app-123/);
    assert.match(text, /example\.base44\.app/);
    assert.match(text, /2026-04-30/);
  });
});

test('GET / falls back to the built SPA index.html with no-store caching', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/`);
    const text = await response.text();

    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store, no-cache, must-revalidate');
    assert.match(text, /MediaHub/);
  });
});

test('local auth seeds a default admin login and app-config still loads', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const publicConfig = await fetch(`${baseUrl}/api/app-config`);
    assert.equal(publicConfig.status, 200);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });

    assert.equal(loginResponse.status, 200);
    const loginBody = await loginResponse.json();
    assert.equal(loginBody.user.role, 'admin');
    assert.ok(loginBody.token);

    const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${loginBody.token}` },
    });
    assert.equal(meResponse.status, 200);
  });
});

test('admin can create users and non-admin users are blocked from user management', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'admin' }),
    });
    const adminBody = await adminLogin.json();
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminBody.token}`,
    };

    const createResponse = await fetch(`${baseUrl}/api/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ username: 'viewer1', password: 'viewerpass', role: 'viewer', enabled: true }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.equal(created.user.username, 'viewer1');
    assert.equal(created.user.role, 'viewer');

    const viewerLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'viewer1', password: 'viewerpass' }),
    });
    const viewerBody = await viewerLogin.json();

    const forbidden = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { Authorization: `Bearer ${viewerBody.token}` },
    });
    assert.equal(forbidden.status, 403);
  });
});
