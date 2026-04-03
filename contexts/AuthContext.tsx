import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { api } from '../api/client';
import { 
  login as apiLogin, 
  register as apiRegister, 
  logout as apiLogout,
  getCurrentUser // <--- DODANY IMPORT
} from '../api/auth';
import { RegisterRequest, User } from '../types/api';

type Credentials = { username: string; password: string };
type RegisterData = RegisterRequest;

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  login: (credentials: Credentials) => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>; // <--- DODANA DEKLARACJA
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
      let storedUserStr: string | null = null;
      let accessToken: string | null = null;

      if (Platform.OS === 'web') {
        storedUserStr = localStorage.getItem('user');
        accessToken = localStorage.getItem('access_token');
      } else {
        const [userItem, tokenItem] = await AsyncStorage.multiGet(['user', 'access_token']);
        storedUserStr = userItem[1];
        accessToken = tokenItem[1];
      }

      if (storedUserStr && accessToken) {
        setUser(JSON.parse(storedUserStr));
      }
    } catch (error) {
      console.error('Failed to load stored user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: Credentials) => {
    try {
      const response = await apiLogin(credentials);
      
      const userData = response.user;
      
      if (Platform.OS === 'web') {
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      }

      setUser(userData);
    } catch (error: any) {
      console.error('❌ [AuthContext] Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await apiRegister(data);
      const userData = response.user;

      if (Platform.OS === 'web') {
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      }

      setUser(userData);
      return { success: true };
    } catch (error: any) {
      const errorMsg = error?.message || 'Błąd rejestracji';
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      if (Platform.OS === 'web') {
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      } else {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      }
      setUser(null);
    }
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...userData };
    
    if (Platform.OS === 'web') {
      localStorage.setItem('user', JSON.stringify(updatedUser));
    } else {
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    setUser(updatedUser);
  };

  // <--- DODANA FUNKCJA REFRESH USER --->
  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser();
      
      if (Platform.OS === 'web') {
        localStorage.setItem('user', JSON.stringify(userData));
      } else {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
      }
      
      setUser(userData);
    } catch (error) {
      console.error('❌ [AuthContext] Failed to refresh user from API:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoggedIn: !!user, 
      login, 
      register, 
      logout, 
      updateUser, 
      refreshUser, // <--- PRZEKAZANA DO KONTEKSTU
      isLoading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};