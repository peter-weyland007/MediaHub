import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export const DEFAULT_SERVICES = {
  radarr: { url: '', apiKey: '', enabled: false },
  sonarr: { url: '', apiKey: '', enabled: false },
  lidarr: { url: '', apiKey: '', enabled: false },
  bazarr: { url: '', apiKey: '', enabled: false },
  tautulli: { url: '', apiKey: '', enabled: false },
  overseerr: { url: '', apiKey: '', enabled: false },
  plex: { url: '', apiKey: '', enabled: false },
  prowlarr: { url: '', apiKey: '', enabled: false },
};

export const DEFAULT_POSTER_DISPLAY_PREFERENCES = {
  hidePosters: false,
  posterSize: 'default',
};

export const DEFAULT_MEDIA_BROWSER_PREFERENCES = {
  movies: { viewMode: 'browse', sortBy: 'title-asc' },
  tvShows: { viewMode: 'browse', sortBy: 'title-asc' },
};

export const DEFAULT_OPTIMIZATION_PREFERENCES = {
  strategy: 'balanced',
  targetContainer: 'mp4',
  preferredVideoCodec: 'h264',
  preferredAudioCodec: 'aac',
  maxResolution: '1080p',
};

export const DEFAULT_TV_CLEANUP_PREFERENCES = {
  watchedThresholdPercent: 90,
  waitDays: 3,
  shows: {},
};

export const DEFAULT_MOVIE_CLEANUP_PREFERENCES = {
  watchedThresholdPercent: 90,
  waitDays: 3,
  movies: {},
};

export const USER_ROLES = ['admin', 'operator', 'viewer'];

const QUALITY_PREFERENCES_KEY = 'quality_preferences';
const POSTER_DISPLAY_PREFERENCES_KEY = 'poster_display_preferences';
const MEDIA_BROWSER_PREFERENCES_KEY = 'media_browser_preferences';
const OPTIMIZATION_PREFERENCES_KEY = 'optimization_preferences';
const TV_CLEANUP_PREFERENCES_KEY = 'tv_cleanup_preferences';
const MOVIE_CLEANUP_PREFERENCES_KEY = 'movie_cleanup_preferences';
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

const ensureParentDir = (dbPath) => {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
};

const nowIso = () => new Date().toISOString();
const sessionExpiryIso = () => new Date(Date.now() + SESSION_TTL_MS).toISOString();

const normalizeServiceConfig = (serviceConfig = {}) => ({
  url: serviceConfig.url ?? '',
  apiKey: serviceConfig.apiKey ?? '',
  enabled: Boolean(serviceConfig.enabled),
});

const normalizePosterDisplayPreferences = (preferences = {}) => ({
  hidePosters: Boolean(preferences.hidePosters),
  posterSize: ['compact', 'default', 'large'].includes(preferences.posterSize) ? preferences.posterSize : 'default',
});

const normalizeMediaBrowserPreferences = (preferences = {}) => {
  const normalizeSection = (value = {}, allowedSorts = []) => ({
    viewMode: ['browse', 'table'].includes(value?.viewMode) ? value.viewMode : 'browse',
    sortBy: allowedSorts.includes(value?.sortBy) ? value.sortBy : 'title-asc',
  });

  return {
    movies: normalizeSection(preferences.movies, ['title-asc', 'title-desc', 'year-desc', 'year-asc', 'missing-first', 'downloaded-first']),
    tvShows: normalizeSection(preferences.tvShows, ['title-asc', 'title-desc', 'year-desc', 'year-asc', 'continuing-first', 'episodes-desc']),
  };
};

const normalizeOptimizationPreferences = (preferences = {}) => ({
  strategy: ['balanced', 'space', 'compatibility'].includes(preferences.strategy) ? preferences.strategy : 'balanced',
  targetContainer: ['mp4', 'mkv'].includes(preferences.targetContainer) ? preferences.targetContainer : 'mp4',
  preferredVideoCodec: ['h264', 'hevc'].includes(preferences.preferredVideoCodec) ? preferences.preferredVideoCodec : 'h264',
  preferredAudioCodec: ['aac', 'ac3', 'eac3'].includes(preferences.preferredAudioCodec) ? preferences.preferredAudioCodec : 'aac',
  maxResolution: ['2160p', '1080p', '720p'].includes(preferences.maxResolution) ? preferences.maxResolution : '1080p',
});

const normalizeTvCleanupPreferences = (preferences = {}) => ({
  watchedThresholdPercent: Number.isFinite(Number(preferences.watchedThresholdPercent)) && Number(preferences.watchedThresholdPercent) >= 1 && Number(preferences.watchedThresholdPercent) <= 100
    ? Number(preferences.watchedThresholdPercent)
    : DEFAULT_TV_CLEANUP_PREFERENCES.watchedThresholdPercent,
  waitDays: Number.isFinite(Number(preferences.waitDays)) && Number(preferences.waitDays) >= 0
    ? Number(preferences.waitDays)
    : DEFAULT_TV_CLEANUP_PREFERENCES.waitDays,
  shows: Object.fromEntries(
    Object.entries(preferences.shows || {}).map(([seriesId, showPreferences]) => [
      String(seriesId),
      {
        mode: ['keep-all', 'unmonitor-only', 'delete-unmonitor'].includes(showPreferences?.mode)
          ? showPreferences.mode
          : 'keep-all',
      },
    ])
  ),
  manualOverrides: Object.fromEntries(
    Object.entries(preferences.manualOverrides || {}).map(([episodeKey, override]) => [
      String(episodeKey),
      {
        watched: Boolean(override?.watched),
        source: 'manual',
        watchedAt: override?.watchedAt ? new Date(override.watchedAt).toISOString() : null,
      },
    ])
  ),
});

const normalizeMovieCleanupPreferences = (preferences = {}) => ({
  watchedThresholdPercent: Number.isFinite(Number(preferences.watchedThresholdPercent)) && Number(preferences.watchedThresholdPercent) >= 1 && Number(preferences.watchedThresholdPercent) <= 100
    ? Number(preferences.watchedThresholdPercent)
    : DEFAULT_MOVIE_CLEANUP_PREFERENCES.watchedThresholdPercent,
  waitDays: Number.isFinite(Number(preferences.waitDays)) && Number(preferences.waitDays) >= 0
    ? Number(preferences.waitDays)
    : DEFAULT_MOVIE_CLEANUP_PREFERENCES.waitDays,
  movies: Object.fromEntries(
    Object.entries(preferences.movies || {}).map(([movieId, moviePreferences]) => [
      String(movieId),
      {
        mode: ['keep-all', 'delete-unmonitor'].includes(moviePreferences?.mode)
          ? moviePreferences.mode
          : 'keep-all',
      },
    ])
  ),
});

const normalizeUsername = (username = '') => String(username).trim();
const normalizeRole = (role = '') => USER_ROLES.includes(role) ? role : 'viewer';
const normalizeEnabled = (enabled) => enabled === undefined ? true : Boolean(enabled);

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
};

const verifyPassword = (password, storedHash = '') => {
  const [scheme, salt, hash] = String(storedHash).split(':');
  if (scheme !== 'scrypt' || !salt || !hash) {
    return false;
  }

  const derived = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
};

const sanitizeUser = (row) => row ? {
  id: row.id,
  username: row.username,
  role: row.role,
  enabled: Boolean(row.enabled),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
} : null;

export const createConfigStore = ({ dbPath }) => {
  ensureParentDir(dbPath);
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS service_configs (
      service TEXT PRIMARY KEY,
      url TEXT NOT NULL DEFAULT '',
      api_key TEXT NOT NULL DEFAULT '',
      enabled INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  const readServiceStmt = db.prepare('SELECT service, url, api_key, enabled FROM service_configs');
  const upsertServiceStmt = db.prepare(`
    INSERT INTO service_configs (service, url, api_key, enabled)
    VALUES (@service, @url, @api_key, @enabled)
    ON CONFLICT(service) DO UPDATE SET
      url = excluded.url,
      api_key = excluded.api_key,
      enabled = excluded.enabled
  `);
  const readStateStmt = db.prepare('SELECT value FROM app_state WHERE key = ?');
  const upsertStateStmt = db.prepare(`
    INSERT INTO app_state (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  const countUsersStmt = db.prepare('SELECT COUNT(*) AS count FROM users');
  const insertUserStmt = db.prepare(`
    INSERT INTO users (username, password_hash, role, enabled, created_at, updated_at)
    VALUES (@username, @password_hash, @role, @enabled, @created_at, @updated_at)
  `);
  const listUsersStmt = db.prepare('SELECT id, username, role, enabled, created_at, updated_at FROM users ORDER BY username COLLATE NOCASE');
  const getUserByIdStmt = db.prepare('SELECT id, username, password_hash, role, enabled, created_at, updated_at FROM users WHERE id = ?');
  const getUserByUsernameStmt = db.prepare('SELECT id, username, password_hash, role, enabled, created_at, updated_at FROM users WHERE username = ? COLLATE NOCASE');
  const updateUserStmt = db.prepare(`
    UPDATE users
    SET username = @username,
        password_hash = @password_hash,
        role = @role,
        enabled = @enabled,
        updated_at = @updated_at
    WHERE id = @id
  `);
  const insertSessionStmt = db.prepare(`
    INSERT INTO user_sessions (token, user_id, created_at, expires_at)
    VALUES (@token, @user_id, @created_at, @expires_at)
  `);
  const deleteSessionStmt = db.prepare('DELETE FROM user_sessions WHERE token = ?');
  const deleteExpiredSessionsStmt = db.prepare('DELETE FROM user_sessions WHERE expires_at <= ?');
  const getSessionUserStmt = db.prepare(`
    SELECT u.id, u.username, u.role, u.enabled, u.created_at, u.updated_at
    FROM user_sessions s
    INNER JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `);

  const getServices = () => {
    const services = structuredClone(DEFAULT_SERVICES);
    for (const row of readServiceStmt.all()) {
      services[row.service] = normalizeServiceConfig({
        url: row.url,
        apiKey: row.api_key,
        enabled: Boolean(row.enabled),
      });
    }
    return services;
  };

  const readJsonState = (key, fallback = {}) => {
    const row = readStateStmt.get(key);
    if (!row) {
      return fallback;
    }

    try {
      return JSON.parse(row.value);
    } catch {
      return fallback;
    }
  };

  const ensureDefaultAdmin = () => {
    if (countUsersStmt.get().count > 0) {
      return;
    }

    const timestamp = nowIso();
    insertUserStmt.run({
      username: DEFAULT_ADMIN_USERNAME,
      password_hash: hashPassword(DEFAULT_ADMIN_PASSWORD),
      role: 'admin',
      enabled: 1,
      created_at: timestamp,
      updated_at: timestamp,
    });
  };

  ensureDefaultAdmin();

  return {
    getAppConfig() {
      return {
        services: getServices(),
        qualityPreferences: readJsonState(QUALITY_PREFERENCES_KEY, {}),
        posterDisplayPreferences: normalizePosterDisplayPreferences(
          readJsonState(POSTER_DISPLAY_PREFERENCES_KEY, DEFAULT_POSTER_DISPLAY_PREFERENCES)
        ),
        mediaBrowserPreferences: normalizeMediaBrowserPreferences(
          readJsonState(MEDIA_BROWSER_PREFERENCES_KEY, DEFAULT_MEDIA_BROWSER_PREFERENCES)
        ),
        optimizationPreferences: normalizeOptimizationPreferences(
          readJsonState(OPTIMIZATION_PREFERENCES_KEY, DEFAULT_OPTIMIZATION_PREFERENCES)
        ),
        tvCleanupPreferences: normalizeTvCleanupPreferences(
          readJsonState(TV_CLEANUP_PREFERENCES_KEY, DEFAULT_TV_CLEANUP_PREFERENCES)
        ),
        movieCleanupPreferences: normalizeMovieCleanupPreferences(
          readJsonState(MOVIE_CLEANUP_PREFERENCES_KEY, DEFAULT_MOVIE_CLEANUP_PREFERENCES)
        ),
      };
    },

    saveServiceConfig(service, serviceConfig) {
      if (!(service in DEFAULT_SERVICES)) {
        throw new Error(`Unsupported service: ${service}`);
      }

      const normalized = normalizeServiceConfig(serviceConfig);
      upsertServiceStmt.run({
        service,
        url: normalized.url,
        api_key: normalized.apiKey,
        enabled: normalized.enabled ? 1 : 0,
      });

      return normalized;
    },

    saveQualityPreferences(preferences = {}) {
      upsertStateStmt.run(QUALITY_PREFERENCES_KEY, JSON.stringify(preferences));
      return preferences;
    },

    savePosterDisplayPreferences(preferences = {}) {
      const normalized = normalizePosterDisplayPreferences(preferences);
      upsertStateStmt.run(POSTER_DISPLAY_PREFERENCES_KEY, JSON.stringify(normalized));
      return normalized;
    },

    saveMediaBrowserPreferences(preferences = {}) {
      const normalized = normalizeMediaBrowserPreferences(preferences);
      upsertStateStmt.run(MEDIA_BROWSER_PREFERENCES_KEY, JSON.stringify(normalized));
      return normalized;
    },

    saveOptimizationPreferences(preferences = {}) {
      const normalized = normalizeOptimizationPreferences(preferences);
      upsertStateStmt.run(OPTIMIZATION_PREFERENCES_KEY, JSON.stringify(normalized));
      return normalized;
    },

    saveTvCleanupPreferences(preferences = {}) {
      const normalized = normalizeTvCleanupPreferences(preferences);
      upsertStateStmt.run(TV_CLEANUP_PREFERENCES_KEY, JSON.stringify(normalized));
      return normalized;
    },

    saveMovieCleanupPreferences(preferences = {}) {
      const normalized = normalizeMovieCleanupPreferences(preferences);
      upsertStateStmt.run(MOVIE_CLEANUP_PREFERENCES_KEY, JSON.stringify(normalized));
      return normalized;
    },

    authenticateUser(username, password) {
      const normalizedUsername = normalizeUsername(username);
      const user = getUserByUsernameStmt.get(normalizedUsername);
      if (!user || !user.enabled) {
        return null;
      }

      return verifyPassword(password, user.password_hash) ? sanitizeUser(user) : null;
    },

    createSessionForUser(userId) {
      deleteExpiredSessionsStmt.run(nowIso());
      const token = crypto.randomBytes(32).toString('hex');
      insertSessionStmt.run({
        token,
        user_id: userId,
        created_at: nowIso(),
        expires_at: sessionExpiryIso(),
      });
      return token;
    },

    deleteSession(token) {
      deleteSessionStmt.run(token);
    },

    getUserForToken(token) {
      deleteExpiredSessionsStmt.run(nowIso());
      return sanitizeUser(getSessionUserStmt.get(token, nowIso()));
    },

    listUsers() {
      return listUsersStmt.all().map(sanitizeUser);
    },

    createUser({ username, password, role, enabled }) {
      const normalizedUsername = normalizeUsername(username);
      const normalizedRole = normalizeRole(role);
      const normalizedEnabled = normalizeEnabled(enabled);
      const trimmedPassword = String(password ?? '').trim();

      if (!normalizedUsername) {
        throw new Error('Username is required');
      }
      if (trimmedPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }
      if (getUserByUsernameStmt.get(normalizedUsername)) {
        throw new Error('Username already exists');
      }

      const timestamp = nowIso();
      const result = insertUserStmt.run({
        username: normalizedUsername,
        password_hash: hashPassword(trimmedPassword),
        role: normalizedRole,
        enabled: normalizedEnabled ? 1 : 0,
        created_at: timestamp,
        updated_at: timestamp,
      });

      return sanitizeUser(getUserByIdStmt.get(result.lastInsertRowid));
    },

    updateUser(id, { username, password, role, enabled }) {
      const current = getUserByIdStmt.get(id);
      if (!current) {
        throw new Error('User not found');
      }

      const normalizedUsername = normalizeUsername(username ?? current.username);
      const normalizedRole = normalizeRole(role ?? current.role);
      const normalizedEnabled = enabled === undefined ? Boolean(current.enabled) : Boolean(enabled);
      const trimmedPassword = String(password ?? '').trim();
      const existing = getUserByUsernameStmt.get(normalizedUsername);

      if (!normalizedUsername) {
        throw new Error('Username is required');
      }
      if (existing && existing.id !== current.id) {
        throw new Error('Username already exists');
      }
      if (trimmedPassword && trimmedPassword.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      updateUserStmt.run({
        id,
        username: normalizedUsername,
        password_hash: trimmedPassword ? hashPassword(trimmedPassword) : current.password_hash,
        role: normalizedRole,
        enabled: normalizedEnabled ? 1 : 0,
        updated_at: nowIso(),
      });

      return sanitizeUser(getUserByIdStmt.get(id));
    },

    close() {
      db.close();
    },
  };
};
