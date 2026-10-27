import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
} from '../api/auth';
import { RegisterRequest, User } from '../types/api';
import {
  clearUserProfile,
  forgetAccount,
  getSavedAccounts,
  getStoredUserProfile,
  getToken,
  rememberAccount,
  removeToken,
  saveToken,
  saveUserProfile,
  SavedAccount,
} from '../utils/storage';
import { onSessionExpired } from '../utils/session';

type Credentials = { username: string; password: string };
type RegisterData = RegisterRequest;

type AuthContextType = {
  user: User | null;
  isLoggedIn: boolean;
  login: (credentials: Credentials, remember?: boolean) => Promise<void>;
  savedAccounts: SavedAccount[];
  switchAccount: (accountId: string) => Promise<void>;
  removeSavedAccount: (accountId: string) => Promise<void>;
  register: (data: RegisterData) => Promise<{ success: boolean; requiresVerification?: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>; // <--- DODANA DEKLARACJA
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPersistentSession, setIsPersistentSession] = useState(true);

  async function loadStoredUser() {
    try {
      const storedUserStr = await getStoredUserProfile();
      const accessToken = await getToken();

      if (storedUserStr && accessToken) {
        setUser(JSON.parse(storedUserStr));
        // Always revalidate against API so email_verified (and similar) stay fresh
        // after magic-link confirmation in another tab/session.
        try {
          const userData = await getCurrentUser();
          await saveUserProfile(userData, true);
          setUser(userData);
        } catch (refreshError) {
          console.error('Failed to refresh stored user from API:', refreshError);
        }
      }
      setSavedAccounts(await getSavedAccounts());
    } catch (error) {
      console.error('Failed to load stored user:', error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void Promise.resolve().then(loadStoredUser);
  }, []);

  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      setIsPersistentSession(true);
    });
  }, []);

  useEffect(() => {
    if (!user) return;
    void import('../utils/push').then(({ syncPushTokenWithBackend }) => {
      void syncPushTokenWithBackend();
    });
  }, [user?.id]);

  const persistUser = async (userData: User, persist = isPersistentSession) => {
    await saveUserProfile(userData, persist);
  };

  const login = async (credentials: Credentials, shouldRemember = false) => {
    try {
      const response = await apiLogin(credentials);
      const userData = response.user;
      setIsPersistentSession(shouldRemember);
      await saveToken(response.access, response.refresh, shouldRemember);
      await persistUser(userData, shouldRemember);
      if (shouldRemember) {
        setSavedAccounts(await rememberAccount(userData, response.access, response.refresh));
      }
      setUser(userData);
    } catch (error: any) {
      console.error('❌ [AuthContext] Login error:', error);
      throw error;
    }
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; requiresVerification?: boolean; error?: string }> => {
    try {
      const response = await apiRegister(data);
      const userData = response.user;

      if (response.access && userData) {
        await saveToken(response.access, response.refresh);
        setIsPersistentSession(true);
        await persistUser(userData, true);
        setUser(userData);
      }

      return { success: true, requiresVerification: !response.access };
    } catch (error: any) {
      const errorMsg = error?.message || 'Błąd rejestracji';
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    const accountId = user ? String(user.id) : null;
    try {
      await apiLogout();
    } finally {
      if (accountId) setSavedAccounts(await forgetAccount(accountId));
      await removeToken();
      await clearUserProfile();
      setUser(null);
    }
  };

  const switchAccount = async (accountId: string) => {
    const account = savedAccounts.find((item) => item.id === accountId);
    if (!account) throw new Error('Nie znaleziono zapisanego konta.');
    await saveToken(account.accessToken, account.refreshToken);
    setIsPersistentSession(true);
    await persistUser(account.user, true);
    setUser(account.user);
    try {
      const currentUser = await getCurrentUser();
      await persistUser(currentUser, true);
      setUser(currentUser);
    } catch {
      setSavedAccounts(await forgetAccount(accountId));
      throw new Error('Sesja wygasła. Zaloguj się ponownie.');
    }
  };

  const removeSavedAccount = async (accountId: string) => {
    setSavedAccounts(await forgetAccount(accountId));
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...userData };
    await saveUserProfile(updatedUser, isPersistentSession);
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const userData = await getCurrentUser();
      await saveUserProfile(userData, isPersistentSession);
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
      savedAccounts,
      switchAccount,
      removeSavedAccount,
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