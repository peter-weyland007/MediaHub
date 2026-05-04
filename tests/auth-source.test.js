import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = '/Users/itadmin/Desktop/Projects/MediaHub';
const read = (relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

test('app includes local login flow, admin users route, and role-based protection', () => {
  const appSource = read('src/App.jsx');
  const authSource = read('src/lib/AuthContext.jsx');
  const sidebarSource = read('src/components/layout/Sidebar.jsx');

  assert.match(appSource, /path="\/login"/);
  assert.match(appSource, /path="\/admin\/users"/);
  assert.match(appSource, /AdminRoute/);
  assert.match(authSource, /const login = async/);
  assert.match(authSource, /const logout = async/);
  assert.match(authSource, /role/i);
  assert.match(sidebarSource, /Users/);
});

test('server and database include local users, roles, and session-backed auth endpoints', () => {
  const appSource = read('server/app.js');
  const dbSource = read('server/database.js');

  assert.match(appSource, /\/api\/auth\/login/);
  assert.match(appSource, /\/api\/auth\/me/);
  assert.match(appSource, /\/api\/admin\/users/);
  assert.match(appSource, /requireRole\('admin'\)/);
  assert.match(dbSource, /CREATE TABLE IF NOT EXISTS users/);
  assert.match(dbSource, /CREATE TABLE IF NOT EXISTS user_sessions/);
  assert.match(dbSource, /password_hash/);
  assert.match(dbSource, /role TEXT NOT NULL/);
});
