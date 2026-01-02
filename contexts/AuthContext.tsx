import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

export type User = {
  id: number | string;
  email: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_specialist: boolean; // ✅ DODANE
  avatar?: string;
  phone?: string;
};

type Credentials = { username: string; password: string };
type RegisterData = {
  username: string;
  email: string;
  password: string;
  is_specialist: boolean; // ✅ DODANE
  first_name?: string;
  last_name?: string;
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const [storedUser, accessToken] = await AsyncStorage.multiGet(['user', 'access_token']);
      if (storedUser[1] && accessToken[1]) {
        setUser(JSON.parse(storedUser[1]));
      }
    } catch (error) {
      console.error('Failed to load stored user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: Credentials) => {
    try {
      const response = await api.post('/users/login/', credentials);
      const { user: userData, access, refresh } = response.data;

      await AsyncStorage.multiSet([
        ['access_token', access],
        ['refresh_token', refresh],
        ['user', JSON.stringify(userData)],
      ]);

      setUser(userData);
    } catch (error: any) {
      throw new Error(error?.response?.data?.detail || 'Błąd logowania');
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post('/users/register/', data);
      const { user: userData, access, refresh } = response.data;

      await AsyncStorage.multiSet([
        ['access_token', access],
        ['refresh_token', refresh],
        ['user', JSON.stringify(userData)],
      ]);

      setUser(userData);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error?.response?.data?.detail || Object.values(error?.response?.data || {})[0] || 'Błąd rejestracji';
      return { success: false, error: String(errorMsg) };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        await api.post('/users/logout/', { refresh: refreshToken }).catch(() => {});
      }
    } finally {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      setUser(null);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...userData };
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, login, register, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};