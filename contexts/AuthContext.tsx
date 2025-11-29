import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
type RegisterData = {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
};

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sprawdź czy użytkownik jest zalogowany przy starcie aplikacji
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
      // Wywołaj endpoint logowania
      const response = await api.post('/users/login/', {
        username: credentials.username,
        password: credentials.password,
      });

      const { user: userData, access, refresh } = response.data;

      // Zapisz tokeny i dane użytkownika
      await AsyncStorage.multiSet([
        ['access_token', access],
        ['refresh_token', refresh],
        ['user', JSON.stringify(userData)],
      ]);

      setUser(userData);
    } catch (error: any) {
      console.error('Login error:', error?.response?.data || error.message);
      throw new Error(
        error?.response?.data?.detail || 
        error?.response?.data?.message || 
        'Błąd logowania'
      );
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await api.post('/users/register/', data);

      const { user: userData, access, refresh } = response.data;

      // Zapisz tokeny i dane użytkownika
      await AsyncStorage.multiSet([
        ['access_token', access],
        ['refresh_token', refresh],
        ['user', JSON.stringify(userData)],
      ]);

      setUser(userData);
      return { success: true };
    } catch (error: any) {
      console.error('Register error:', error?.response?.data || error.message);
      
      const errorMsg = 
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Błąd rejestracji';
        
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (refreshToken) {
        // Próbuj wylogować na backendzie (blacklist token)
        await api.post('/users/logout/', { refresh: refreshToken }).catch(() => {
          // Ignoruj błędy - i tak usuwamy lokalne dane
        });
      }
    } finally {
      // Wyczyść dane lokalne
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isLoggedIn: !!user,
    login,
    register,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
