import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading'); // 'loading' | 'authenticated' | 'unauthenticated'

  // Centralized session verification directly with the backend
  const checkAuth = useCallback(async () => {
    try {
      const res = await authService.getMe();
      if (res.data?.authenticated && res.data?.user) {
        setUser(res.data.user);
        setAuthStatus('authenticated');
        return res.data.user;
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
        return null;
      }
    } catch (err) {
      setUser(null);
      setAuthStatus('unauthenticated');
      return null;
    }
  }, []);

  // Check auth session on initial load and page refresh (F5)
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username, password) => {
    // 1. Send credentials to backend
    const res = await authService.login({
      username: (username || '').trim(),
      email: (username || '').trim(),
      password,
    });

    const { token, user: loginUser } = res.data || {};
    if (token) {
      localStorage.setItem('gcs2_token', token);
    }
    if (loginUser) {
      localStorage.setItem('gcs2_user', JSON.stringify(loginUser));
    }

    // 2. Immediately verify session with cookie / api
    const verifiedUser = await checkAuth();
    if (verifiedUser) {
      return res.data;
    }

    // 3. Fallback to direct returned user if cookie is same-origin
    if (loginUser) {
      setUser(loginUser);
      setAuthStatus('authenticated');
      return res.data;
    }

    throw new Error('Falha ao autenticar sessão no servidor.');
  };

  const logout = async () => {
    setAuthStatus('loading');
    try {
      await authService.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('gcs2_token');
      localStorage.removeItem('gcs2_user');
      setUser(null);
      setAuthStatus('unauthenticated');
    }
  };

  const value = {
    user,
    authStatus,
    isAuthenticated: authStatus === 'authenticated',
    loading: authStatus === 'loading',
    login,
    logout,
    checkAuth,
    setUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
