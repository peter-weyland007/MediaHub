import { authFetch } from '@/lib/auth-fetch';

const parseJson = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || `Auth API error: ${response.status}`);
  }
  return data;
};

export const authApi = {
  login: async (username, password) => parseJson(await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })),
  me: async () => parseJson(await authFetch('/api/auth/me')),
  logout: async () => parseJson(await authFetch('/api/auth/logout', { method: 'POST' })),
};

export const adminUsersApi = {
  list: async () => parseJson(await authFetch('/api/admin/users')),
  create: async (payload) => parseJson(await authFetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })),
  update: async (id, payload) => parseJson(await authFetch(`/api/admin/users/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })),
};
