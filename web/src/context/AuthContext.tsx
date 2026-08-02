/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * React Global Authentication Context & Provider (`AuthContext.tsx`).
 * Manages user authentication state (`user`, `accessToken`, `role`), persistent local storage sync,
 * and exposes `login`, `register`, `logout`, and token refresh methods across the Next.js App Router tree.
 *
 * IN SIMPLE WORDS:
 * The global security wrapper that remembers who is logged in, stores login tokens in your browser, and lets any page access user profile and role info.
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../lib/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'WAREHOUSE_OPERATOR';
}

interface AuthContextType {
  user: UserProfile | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string; resetToken?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore stored session on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('ammunation_access_token');
      if (storedToken) {
        setAccessToken(storedToken);
        try {
          const res = await apiClient.get('/auth/me');
          setUser(res.data.user);
        } catch {
          // Token expired or invalid
          localStorage.removeItem('ammunation_access_token');
          localStorage.removeItem('ammunation_refresh_token');
          setAccessToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiClient.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = res.data;

    localStorage.setItem('ammunation_access_token', accessToken);
    localStorage.setItem('ammunation_refresh_token', refreshToken);
    setAccessToken(accessToken);
    setUser(user);
  };

  const register = async (name: string, email: string, password: string, role: string = 'CUSTOMER') => {
    const res = await apiClient.post('/auth/register', { name, email, password, role });
    const { accessToken, refreshToken, user } = res.data;

    localStorage.setItem('ammunation_access_token', accessToken);
    localStorage.setItem('ammunation_refresh_token', refreshToken);
    setAccessToken(accessToken);
    setUser(user);
  };

  const forgotPassword = async (email: string) => {
    const res = await apiClient.post('/auth/forgot-password', { email });
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('ammunation_access_token');
    localStorage.removeItem('ammunation_refresh_token');
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, forgotPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
