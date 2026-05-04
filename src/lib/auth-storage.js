const TOKEN_KEY = 'mediahub_auth_token';

export const getStoredAuthToken = () => window.localStorage.getItem(TOKEN_KEY) || '';
export const setStoredAuthToken = (token) => window.localStorage.setItem(TOKEN_KEY, token);
export const clearStoredAuthToken = () => window.localStorage.removeItem(TOKEN_KEY);
