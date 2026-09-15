import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('gcs2_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('gcs2_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      authService.getMe()
        .then((res) => {
          setUser(res.data.user);
          localStorage.setItem('gcs2_user', JSON.stringify(res.data.user));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (usernameOrEmail, password) => {
    const res = await authService.login({
      email: usernameOrEmail,
      username: usernameOrEmail,
      password,
    });
    const { token: newToken, user: newUser } = res.data;
    localStorage.setItem('gcs2_token', newToken);
    localStorage.setItem('gcs2_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    localStorage.removeItem('gcs2_token');
    localStorage.removeItem('gcs2_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, loading, login, logout }}>
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
