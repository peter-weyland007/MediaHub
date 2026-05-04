import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConfigStore, DEFAULT_SERVICES, USER_ROLES } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const defaultRuntimeConfig = {
  VITE_BASE44_APP_ID: '',
  VITE_BASE44_APP_BASE_URL: '',
  VITE_BASE44_FUNCTIONS_VERSION: '',
};

const getDefaultDistPath = () => path.join(projectRoot, 'dist');
const getDefaultDbPath = () => path.join(projectRoot, 'data', 'mediahub.db');

const envConfigScript = (runtimeConfig) => `window.__APP_CONFIG__ = ${JSON.stringify(runtimeConfig, null, 2)};\n`;

const serviceProxyDefinitions = {
  radarr: {
    pathPrefix: '/api/v3',
    buildHeaders: (config) => ({ 'X-Api-Key': config.apiKey }),
  },
  sonarr: {
    pathPrefix: '/api/v3',
    buildHeaders: (config) => ({ 'X-Api-Key': config.apiKey }),
  },
  lidarr: {
    pathPrefix: '/api/v1',
    buildHeaders: (config) => ({ 'X-Api-Key': config.apiKey }),
  },
  bazarr: {
    pathPrefix: '/api',
    buildHeaders: (config) => ({ 'X-API-KEY': config.apiKey }),
  },
  tautulli: {
    pathPrefix: '/api/v2',
    buildPath: (requestPath, config) => {
      const normalizedPath = requestPath.startsWith('?') ? requestPath : `?${requestPath.replace(/^\/?/, '')}`;
      const separator = normalizedPath.includes('?') && normalizedPath.length > 1 ? '&' : '?';
      return `${normalizedPath}${separator}apikey=${encodeURIComponent(config.apiKey)}`;
    },
    buildHeaders: () => ({
      Accept: 'application/json,text/plain,*/*',
      'User-Agent': 'MediaHub/1.0',
    }),
  },
  overseerr: {
    pathPrefix: '/api/v1',
    buildHeaders: (config) => ({ 'X-Api-Key': config.apiKey }),
  },
  plex: {
    pathPrefix: '',
    buildHeaders: (config) => ({
      'X-Plex-Token': config.apiKey,
      Accept: 'application/json',
    }),
  },
  prowlarr: {
    pathPrefix: '/api/v1',
    buildHeaders: (config) => ({ 'X-Api-Key': config.apiKey }),
  },
};

const normalizeServiceConfig = (serviceConfig = {}) => ({
  url: typeof serviceConfig.url === 'string' ? serviceConfig.url.trim() : '',
  apiKey: typeof serviceConfig.apiKey === 'string' ? serviceConfig.apiKey.trim() : '',
  enabled: Boolean(serviceConfig.enabled),
});

const isServiceConfigured = (serviceConfig) => Boolean(
  serviceConfig && serviceConfig.enabled && serviceConfig.url && serviceConfig.apiKey
);

const normalizeRequestPath = (requestPath = '/') => {
  if (typeof requestPath !== 'string' || requestPath.length === 0) {
    return '/';
  }

  if (requestPath.startsWith('?')) {
    return requestPath;
  }

  return requestPath.startsWith('/') ? requestPath : `/${requestPath}`;
};

const buildServiceTargetUrl = (service, serviceConfig, requestPath) => {
  const definition = serviceProxyDefinitions[service];
  const baseUrl = serviceConfig.url.replace(/\/+$/, '');
  const normalizedPath = normalizeRequestPath(requestPath);
  const upstreamPath = definition.buildPath
    ? definition.buildPath(normalizedPath, serviceConfig)
    : normalizedPath;

  return `${baseUrl}${definition.pathPrefix}${upstreamPath}`;
};

const readProxyResponse = async (response) => {
  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const getBearerToken = (req) => {
  const header = req.headers.authorization ?? '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
};

export const createApp = ({
  dbPath = getDefaultDbPath(),
  distPath = getDefaultDistPath(),
  runtimeConfig = defaultRuntimeConfig,
} = {}) => {
  const app = express();
  const store = createConfigStore({ dbPath });

  const requireAuth = (req, res, next) => {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const user = store.getUserForToken(token);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.authToken = token;
    req.user = user;
    return next();
  };

  const requireRole = (role) => [requireAuth, (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  }];

  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/auth/login', (req, res) => {
    const username = String(req.body?.username ?? '').trim();
    const password = String(req.body?.password ?? '');
    const user = store.authenticateUser(username, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = store.createSessionForUser(user.id);
    return res.json({ token, user, roles: USER_ROLES });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => {
    res.json({ user: req.user, roles: USER_ROLES });
  });

  app.post('/api/auth/logout', requireAuth, (req, res) => {
    store.deleteSession(req.authToken);
    res.json({ ok: true });
  });

  app.get('/api/admin/users', ...requireRole('admin'), (_req, res) => {
    res.json({ users: store.listUsers(), roles: USER_ROLES });
  });

  app.post('/api/admin/users', ...requireRole('admin'), (req, res) => {
    try {
      const user = store.createUser(req.body ?? {});
      return res.status(201).json({ user, roles: USER_ROLES });
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }
  });

  app.put('/api/admin/users/:id', ...requireRole('admin'), (req, res) => {
    try {
      const user = store.updateUser(Number(req.params.id), req.body ?? {});
      return res.json({ user, roles: USER_ROLES });
    } catch (error) {
      const status = error.message === 'User not found' ? 404 : 400;
      return res.status(status).json({ error: error.message });
    }
  });

  app.get('/api/app-config', (_req, res) => {
    res.json(store.getAppConfig());
  });

  app.put('/api/app-config/services/:service', (req, res) => {
    const { service } = req.params;
    if (!(service in DEFAULT_SERVICES)) {
      return res.status(404).json({ error: `Unknown service: ${service}` });
    }

    const saved = store.saveServiceConfig(service, req.body ?? {});
    return res.json({ service, config: saved });
  });

  app.put('/api/app-config/quality-preferences', (req, res) => {
    const saved = store.saveQualityPreferences(req.body ?? {});
    return res.json({ qualityPreferences: saved });
  });

  app.put('/api/app-config/poster-display', (req, res) => {
    const saved = store.savePosterDisplayPreferences(req.body ?? {});
    return res.json({ posterDisplayPreferences: saved });
  });

  app.put('/api/app-config/media-browser-preferences', (req, res) => {
    const saved = store.saveMediaBrowserPreferences(req.body ?? {});
    return res.json({ mediaBrowserPreferences: saved });
  });

  app.put('/api/app-config/optimization-preferences', (req, res) => {
    const saved = store.saveOptimizationPreferences(req.body ?? {});
    return res.json({ optimizationPreferences: saved });
  });

  app.put('/api/app-config/tv-cleanup-preferences', (req, res) => {
    const saved = store.saveTvCleanupPreferences(req.body ?? {});
    return res.json({ tvCleanupPreferences: saved });
  });

  app.post('/api/service-proxy/:service', async (req, res) => {
    const { service } = req.params;
    if (!(service in DEFAULT_SERVICES)) {
      return res.status(404).json({ error: `Unknown service: ${service}` });
    }

    const { method = 'GET', path: requestPath = '/', body, configOverride } = req.body ?? {};
    const effectiveConfig = configOverride
      ? normalizeServiceConfig(configOverride)
      : store.getAppConfig().services[service];

    if (!isServiceConfigured(effectiveConfig)) {
      return res.status(503).json({ error: 'Service is not configured' });
    }

    const definition = serviceProxyDefinitions[service];
    const upstreamUrl = buildServiceTargetUrl(service, effectiveConfig, requestPath);
    const normalizedMethod = String(method).toUpperCase();
    const headers = definition.buildHeaders(effectiveConfig);

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const upstreamResponse = await fetch(upstreamUrl, {
        method: normalizedMethod,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      const responseBody = await readProxyResponse(upstreamResponse);
      const responseContentType = upstreamResponse.headers.get('content-type') ?? 'application/json; charset=utf-8';
      res.status(upstreamResponse.status);
      res.type(responseContentType);

      if (responseBody === null) {
        return res.end();
      }

      return typeof responseBody === 'string'
        ? res.send(responseBody)
        : res.send(JSON.stringify(responseBody));
    } catch {
      return res.status(502).json({ error: `Failed to reach ${service}` });
    }
  });

  app.get('/env-config.js', (_req, res) => {
    res.type('application/javascript');
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(envConfigScript({ ...defaultRuntimeConfig, ...runtimeConfig }));
  });

  app.use(express.static(distPath, {
    index: false,
  }));

  app.get(/.*/, (_req, res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.locals.configStore = store;
  return app;
};
