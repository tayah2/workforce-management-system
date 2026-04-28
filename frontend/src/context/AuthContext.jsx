import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getMe, login as apiLogin, logout as apiLogout } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // On mount, if a token exists, fetch the current user to validate session
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((data) => {
        setUser(data.user);
      })
      .catch(() => {
        // Token is invalid or expired
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (username, password) => {
    const data = await apiLogin(username, password);
    const accessToken = data.access_token;
    localStorage.setItem('token', accessToken);
    setToken(accessToken);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (_err) {
      // Ignore logout API errors — still clear local state
    }
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';

  const value = {
    user,
    token,
    loading,
    isAdmin,
    isManager,
    login,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return ctx;
}
