import React, { createContext, useContext, useState, ReactNode } from 'react';
import { api } from '../api/client';

export type User = {
  id: number | string;
  name?: string;
  email: string;
  phone?: string;
  avatar?: string;
  joinDate?: string;
  totalVisits?: number;
  favoriteSpecialists?: number;
  points?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
};

type Credentials = { username: string; password: string };
type RegisterData = Record<string, any>;

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  login: (payload: Credentials | User) => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // próbuje kilka możliwych endpointów logowania bez zmiany backendu
  const login = async (payload: Credentials | User) => {
    if ('username' in (payload as Credentials) && 'password' in (payload as Credentials)) {
      const creds = payload as Credentials;
      const tryBodies = [
        { username: creds.username, password: creds.password },
        { email: creds.username, password: creds.password }, // jeśli backend chce email zamiast username
      ];
      const candidates = ['/users/login/', '/users/token/', '/auth/login/'];
      for (const path of candidates) {
        for (const body of tryBodies) {
          try {
            const res = await api.post(path, body);
            const userData: User = res.data.user ?? res.data;
            setUser(userData);
            return;
          } catch (err: any) {
            console.log('login fail', { path, body, status: err?.response?.status, data: err?.response?.data });
            const status = err?.response?.status;
            if (status === 404 || status === 405) break; // zmień path, spróbuj inny
            if (status === 401) continue; // spróbuj inny body
            throw err;
          }
        }
      }
      throw new Error('Nie znaleziono endpointu logowania');
    }

    // jeśli przekazano gotowego usera (mock), ustaw go lokalnie
    setUser(payload as User);
  };

  // próbuje rejestracji na kilka możliwych endpointów (POST /users/ często tworzy usera)
  const register = async (data: RegisterData) => {
    const candidates = ['/users/register', '/users/', '/auth/register'];
    // ensure trailing slashes (safety)
    const registerCandidates = candidates.map(p => p.endsWith('/') ? p : p + '/');
    for (const path of registerCandidates) {
      try {
        await api.post(path, data);
        return { success: true };
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 404 || status === 405) continue;
        const msg =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          'Błąd rejestracji';
        return { success: false, error: msg };
      }
    }

    return { success: false, error: 'Nie znaleziono endpointu rejestracji na backendzie' };
  };

  const logout = () => {
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}