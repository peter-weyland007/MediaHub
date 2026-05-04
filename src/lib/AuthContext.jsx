import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '@/lib/authApi';
import { clearStoredAuthToken, getStoredAuthToken, setStoredAuthToken } from '@/lib/auth-storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const refreshAuth = async () => {
    const token = getStoredAuthToken();
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      return;
    }

    try {
      const data = await authApi.me();
      setUser(data.user);
      setIsAuthenticated(true);
    } catch {
      clearStoredAuthToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const login = async (username, password) => {
    const data = await authApi.login(username, password);
    setStoredAuthToken(data.token);
    setUser(data.user);
    setIsAuthenticated(true);
    setAuthChecked(true);
    return data.user;
  };

  const logout = async () => {
    try {
      if (getStoredAuthToken()) {
        await authApi.logout();
      }
    } catch {
      // ignore logout transport failures
    } finally {
      clearStoredAuthToken();
      setUser(null);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  };

  const value = useMemo(() => ({
    user,
    isAuthenticated,
    isLoadingAuth,
    authChecked,
    login,
    logout,
    refreshAuth,
    isAdmin: user?.role === 'admin',
  }), [user, isAuthenticated, isLoadingAuth, authChecked]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
