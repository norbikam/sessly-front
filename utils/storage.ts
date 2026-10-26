// utils/storage.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types/api';

// ✅ POPRAWKA: Użyj tych samych kluczy co AuthContext
const TOKEN_KEY = 'access_token';      // ✅ Zmienione (było: '@auth_token')
const REFRESH_TOKEN_KEY = 'refresh_token'; // ✅ Zmienione (było: '@refresh_token')

// ✅ Web fallback keys
const WEB_TOKEN_KEY = 'access_token';
const WEB_REFRESH_TOKEN_KEY = 'refresh_token';
const SAVED_ACCOUNTS_KEY = 'sessly_saved_accounts';
let memoryAccessToken: string | null = null;
let memoryRefreshToken: string | null = null;
let sessionOnly = false;

export type SavedAccount = {
  id: string;
  user: User;
  accessToken: string;
  refreshToken: string;
};

const readSavedAccountsValue = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem(SAVED_ACCOUNTS_KEY);
  return SecureStore.getItemAsync(SAVED_ACCOUNTS_KEY);
};

const writeSavedAccountsValue = async (value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    localStorage.setItem(SAVED_ACCOUNTS_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(SAVED_ACCOUNTS_KEY, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

export const getSavedAccounts = async (): Promise<SavedAccount[]> => {
  try {
    const raw = await readSavedAccountsValue();
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const rememberAccount = async (
  user: User,
  accessToken: string,
  refreshToken: string,
): Promise<SavedAccount[]> => {
  const accounts = await getSavedAccounts();
  const account = { id: String(user.id), user, accessToken, refreshToken };
  const next = [account, ...accounts.filter((item) => item.id !== account.id)].slice(0, 5);
  await writeSavedAccountsValue(JSON.stringify(next));
  return next;
};

export const forgetAccount = async (id: string): Promise<SavedAccount[]> => {
  const next = (await getSavedAccounts()).filter((item) => item.id !== id);
  await writeSavedAccountsValue(JSON.stringify(next));
  return next;
};

export const saveToken = async (accessToken: string, refreshToken: string, persist = true): Promise<void> => {
  try {
    memoryAccessToken = accessToken;
    memoryRefreshToken = refreshToken;
    sessionOnly = !persist;
    if (persist) {
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
      if (Platform.OS === 'web') {
        localStorage.setItem(WEB_TOKEN_KEY, accessToken);
        localStorage.setItem(WEB_REFRESH_TOKEN_KEY, refreshToken);
      }
    } else {
      await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY]);
      if (Platform.OS === 'web') {
        localStorage.removeItem(WEB_TOKEN_KEY);
        localStorage.removeItem(WEB_REFRESH_TOKEN_KEY);
      }
    }
  } catch (error) {
    console.error('❌ Error saving tokens:', error);
    throw error;
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    if (memoryAccessToken) return memoryAccessToken;
    let token = await AsyncStorage.getItem(TOKEN_KEY);
    
    if (!token && Platform.OS === 'web') {
      token = localStorage.getItem('access_token');
      console.log('🔵 Token from localStorage:', token ? 'EXISTS ✅' : 'MISSING ❌');
    }
    memoryAccessToken = token;
    return token;
  } catch (error) {
    console.error('❌ Error getting token:', error);
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    if (memoryRefreshToken) return memoryRefreshToken;
    let token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    
    if (!token && Platform.OS === 'web') {
      token = localStorage.getItem(WEB_REFRESH_TOKEN_KEY);
    }
    memoryRefreshToken = token;
    return token;
  } catch (error) {
    console.error('❌ Error getting refresh token:', error);
    return null;
  }
};

export const updateAccessToken = async (accessToken: string): Promise<void> => {
  memoryAccessToken = accessToken;
  if (sessionOnly) return;
  await AsyncStorage.setItem(TOKEN_KEY, accessToken);
  if (Platform.OS === 'web') localStorage.setItem(WEB_TOKEN_KEY, accessToken);
};

export const removeToken = async (): Promise<void> => {
  try {
    memoryAccessToken = null;
    memoryRefreshToken = null;
    sessionOnly = false;
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, 'user']);

    if (Platform.OS === 'web') {
      localStorage.removeItem(WEB_TOKEN_KEY);
      localStorage.removeItem(WEB_REFRESH_TOKEN_KEY);
      localStorage.removeItem('user');
    }
  } catch (error) {
    console.error('❌ Error removing tokens:', error);
    throw error;
  }
};
