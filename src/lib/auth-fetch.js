import { clearStoredAuthToken, getStoredAuthToken } from '@/lib/auth-storage';

export const authFetch = async (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  const token = getStoredAuthToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearStoredAuthToken();
  }

  return response;
};
