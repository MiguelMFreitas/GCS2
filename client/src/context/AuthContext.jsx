import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('gcs2_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Validate session with backend on initial load and refresh (F5)
  useEffect(() => {
    authService.getMe()
      .then((res) => {
        if (res.data?.authenticated && res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('gcs2_user', JSON.stringify(res.data.user));
        } else {
          setUser(null);
          localStorage.removeItem('gcs2_user');
          localStorage.removeItem('gcs2_token');
        }
      })
      .catch(() => {
        setUser(null);
        localStorage.removeItem('gcs2_user');
        localStorage.removeItem('gcs2_token');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = async (username, password) => {
    const res = await authService.login({
      username: (username || '').trim(),
      email: (username || '').trim(),
      password,
    });
    
    const { token, user: newUser } = res.data;
    if (token) {
      localStorage.setItem('gcs2_token', token);
    }
    localStorage.setItem('gcs2_user', JSON.stringify(newUser));
    setUser(newUser);
    return res.data;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (err) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('gcs2_token');
      localStorage.removeItem('gcs2_user');
      setUser(null);
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, setUser }}>
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
