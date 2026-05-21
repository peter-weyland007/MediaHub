import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';

const createTempPaths = () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mediahub-proxy-test-'));
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

const withUpstream = async (handler, run) => {
  const server = http.createServer(handler);
  server.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
};

test('service proxy forwards saved Radarr config through the MediaHub backend', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withUpstream((req, res) => {
    assert.equal(req.url, '/api/v3/system/status');
    assert.equal(req.headers['x-api-key'], 'radarr-secret');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ version: '5.0.0.0' }));
  }, async (upstreamUrl) => {
    await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
      const saveResponse = await fetch(`${baseUrl}/api/app-config/services/radarr`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: upstreamUrl, apiKey: 'radarr-secret', enabled: true }),
      });
      assert.equal(saveResponse.status, 200);

      const proxyResponse = await fetch(`${baseUrl}/api/service-proxy/radarr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'GET', path: '/system/status' }),
      });

      assert.equal(proxyResponse.status, 200);
      assert.deepEqual(await proxyResponse.json(), { version: '5.0.0.0' });
    });
  });
});

test('service proxy supports config overrides so Settings can test unsaved values', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withUpstream((req, res) => {
    assert.equal(req.url, '/api/v1/status');
    assert.equal(req.headers['x-api-key'], 'override-secret');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
  }, async (upstreamUrl) => {
    await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
      const proxyResponse = await fetch(`${baseUrl}/api/service-proxy/overseerr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'GET',
          path: '/status',
          configOverride: { url: upstreamUrl, apiKey: 'override-secret', enabled: true },
        }),
      });

      assert.equal(proxyResponse.status, 200);
      assert.deepEqual(await proxyResponse.json(), { status: 'ok' });
    });
  });
});

test('service proxy forwards Bazarr requests with Bazarr header casing', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withUpstream((req, res) => {
    assert.equal(req.url, '/api/system/status');
    assert.equal(req.headers['x-api-key'], 'bazarr-secret');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', bazarr_version: '1.5.0' }));
  }, async (upstreamUrl) => {
    await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
      const saveResponse = await fetch(`${baseUrl}/api/app-config/services/bazarr`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: upstreamUrl, apiKey: 'bazarr-secret', enabled: true }),
      });
      assert.equal(saveResponse.status, 200);

      const proxyResponse = await fetch(`${baseUrl}/api/service-proxy/bazarr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'GET', path: '/system/status' }),
      });

      assert.equal(proxyResponse.status, 200);
      assert.deepEqual(await proxyResponse.json(), { status: 'ok', bazarr_version: '1.5.0' });
    });
  });
});

test('service proxy forwards Tautulli requests with query-string API auth', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withUpstream((req, res) => {
    assert.equal(req.url, '/api/v2?cmd=get_activity&apikey=taut-secret');
    assert.equal(req.headers.accept, 'application/json,text/plain,*/*');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ response: { result: 'success', data: { stream_count: '2', stream_count_transcode: '1' } } }));
  }, async (upstreamUrl) => {
    await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
      const saveResponse = await fetch(`${baseUrl}/api/app-config/services/tautulli`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: upstreamUrl, apiKey: 'taut-secret', enabled: true }),
      });
      assert.equal(saveResponse.status, 200);

      const proxyResponse = await fetch(`${baseUrl}/api/service-proxy/tautulli`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'GET', path: '?cmd=get_activity' }),
      });

      assert.equal(proxyResponse.status, 200);
      assert.deepEqual(await proxyResponse.json(), { response: { result: 'success', data: { stream_count: '2', stream_count_transcode: '1' } } });
    });
  });
});

test('service proxy tolerates empty successful JSON responses without turning them into proxy failures', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withUpstream((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('');
  }, async (upstreamUrl) => {
    await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
      const saveResponse = await fetch(`${baseUrl}/api/app-config/services/radarr`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: upstreamUrl, apiKey: 'radarr-secret', enabled: true }),
      });
      assert.equal(saveResponse.status, 200);

      const proxyResponse = await fetch(`${baseUrl}/api/service-proxy/radarr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'DELETE', path: '/moviefile/123' }),
      });

      assert.equal(proxyResponse.status, 200);
      assert.equal(await proxyResponse.text(), '');
      assert.ok(!(proxyResponse.headers.get('content-type') ?? '').includes('application/json'));
    });
  });
});

test('service proxy returns unconfigured when no saved or override config is available', async () => {
  const paths = createTempPaths();
  writeFakeDist(paths.distPath);

  await withServer({ dbPath: paths.dbPath, distPath: paths.distPath }, async (baseUrl) => {
    const proxyResponse = await fetch(`${baseUrl}/api/service-proxy/plex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'GET', path: '/' }),
    });

    assert.equal(proxyResponse.status, 503);
    assert.deepEqual(await proxyResponse.json(), { error: 'Service is not configured' });
  });
});
