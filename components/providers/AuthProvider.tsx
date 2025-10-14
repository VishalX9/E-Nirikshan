'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

export interface AppUser {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: string;
  employerType?: 'field' | 'hq';
  department?: string;
  position?: string;
  themePreference?: 'light' | 'dark' | 'system';
  createdAt?: string;
}

interface AuthContextValue {
  user: AppUser | null;
  token: string | null;
  loading: boolean;
  signIn: (session: { token: string; user: AppUser }) => void;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    setLoading(false);

    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }, []);

  const signIn = useCallback(({ token: newToken, user: newUser }: { token: string; user: AppUser }) => {
    setToken(newToken);
    setUser(newUser);
    setLoading(false);

    if (typeof window !== 'undefined') {
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(newUser));
    }
  }, []);

  const fetchUser = useCallback(
    async (authToken: string) => {
      setLoading(true);
      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (!res.ok) {
          throw new Error('Unable to fetch user');
        }

        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(data.user));
          }
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    },
    [clearSession],
  );

  const refresh = useCallback(async () => {
    if (!token) return;
    await fetchUser(token);
  }, [token, fetchUser]);

  const initialize = useCallback(() => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    const storedToken = localStorage.getItem('token');
    const storedUserRaw = localStorage.getItem('user');

    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);

    if (storedUserRaw) {
      try {
        const storedUser = JSON.parse(storedUserRaw) as AppUser;
        setUser(storedUser);
      } catch {
        localStorage.removeItem('user');
      }
    }

    fetchUser(storedToken);
  }, [fetchUser]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      signIn,
      logout: clearSession,
      refresh,
    }),
    [user, token, loading, signIn, clearSession, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
