// utils/storage.ts — tokens: SecureStore (native) / session|localStorage (web)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { User } from '../types/api';

const TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'user';
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

const secureOpts = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

async function nativeGet(key: string): Promise<string | null> {
  try {
    const secure = await SecureStore.getItemAsync(key);
    if (secure != null) return secure;
    // One-time migrate from AsyncStorage (pre-hardening builds).
    const legacy = await AsyncStorage.getItem(key);
    if (legacy) {
      await SecureStore.setItemAsync(key, legacy, secureOpts);
      await AsyncStorage.removeItem(key);
      return legacy;
    }
    return null;
  } catch {
    return AsyncStorage.getItem(key);
  }
}

async function nativeSet(key: string, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, secureOpts);
    await AsyncStorage.removeItem(key);
  } catch {
    await AsyncStorage.setItem(key, value);
  }
}

async function nativeDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    /* ignore */
  }
  await AsyncStorage.removeItem(key);
}

function webTokenStore(persist: boolean): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Web storage unavailable');
  }
  // Remember-me → localStorage; otherwise sessionStorage (clears with tab).
  return persist ? window.localStorage : window.sessionStorage;
}

function webReadToken(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return (
    window.sessionStorage.getItem(key) ||
    window.localStorage.getItem(key)
  );
}

function webWriteToken(key: string, value: string, persist: boolean): void {
  const store = webTokenStore(persist);
  store.setItem(key, value);
  // Avoid leaving copies in the other store.
  const other = persist ? window.sessionStorage : window.localStorage;
  other.removeItem(key);
}

function webClearTokens(): void {
  if (typeof window === 'undefined') return;
  for (const key of [TOKEN_KEY, REFRESH_TOKEN_KEY]) {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  }
}

const readSavedAccountsValue = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(SAVED_ACCOUNTS_KEY);
  }
  return nativeGet(SAVED_ACCOUNTS_KEY);
};

const writeSavedAccountsValue = async (value: string): Promise<void> => {
  if (Platform.OS === 'web') {
    window.localStorage.setItem(SAVED_ACCOUNTS_KEY, value);
    return;
  }
  await nativeSet(SAVED_ACCOUNTS_KEY, value);
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

export const saveToken = async (
  accessToken: string,
  refreshToken: string,
  persist = true,
): Promise<void> => {
  memoryAccessToken = accessToken;
  memoryRefreshToken = refreshToken;
  sessionOnly = !persist;

  if (!persist) {
    if (Platform.OS === 'web') {
      webClearTokens();
      webWriteToken(TOKEN_KEY, accessToken, false);
      webWriteToken(REFRESH_TOKEN_KEY, refreshToken, false);
    } else {
      await nativeDelete(TOKEN_KEY);
      await nativeDelete(REFRESH_TOKEN_KEY);
    }
    return;
  }

  if (Platform.OS === 'web') {
    webWriteToken(TOKEN_KEY, accessToken, true);
    webWriteToken(REFRESH_TOKEN_KEY, refreshToken, true);
  } else {
    await nativeSet(TOKEN_KEY, accessToken);
    await nativeSet(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    if (memoryAccessToken) return memoryAccessToken;
    const token =
      Platform.OS === 'web' ? webReadToken(TOKEN_KEY) : await nativeGet(TOKEN_KEY);
    memoryAccessToken = token;
    return token;
  } catch {
    return null;
  }
};

export const getRefreshToken = async (): Promise<string | null> => {
  try {
    if (memoryRefreshToken) return memoryRefreshToken;
    const token =
      Platform.OS === 'web'
        ? webReadToken(REFRESH_TOKEN_KEY)
        : await nativeGet(REFRESH_TOKEN_KEY);
    memoryRefreshToken = token;
    return token;
  } catch {
    return null;
  }
};

export const updateAccessToken = async (accessToken: string): Promise<void> => {
  memoryAccessToken = accessToken;
  if (sessionOnly) {
    if (Platform.OS === 'web') {
      webWriteToken(TOKEN_KEY, accessToken, false);
    }
    return;
  }
  if (Platform.OS === 'web') {
    webWriteToken(TOKEN_KEY, accessToken, true);
  } else {
    await nativeSet(TOKEN_KEY, accessToken);
  }
};

export const removeToken = async (): Promise<void> => {
  memoryAccessToken = null;
  memoryRefreshToken = null;
  sessionOnly = false;
  if (Platform.OS === 'web') {
    webClearTokens();
    window.localStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  } else {
    await nativeDelete(TOKEN_KEY);
    await nativeDelete(REFRESH_TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
  }
};

export const saveUserProfile = async (user: User, persist = true): Promise<void> => {
  const raw = JSON.stringify(user);
  if (!persist) {
    if (Platform.OS === 'web') {
      window.localStorage.removeItem(USER_KEY);
      window.sessionStorage.setItem(USER_KEY, raw);
    } else {
      await AsyncStorage.removeItem(USER_KEY);
    }
    return;
  }
  if (Platform.OS === 'web') {
    window.localStorage.setItem(USER_KEY, raw);
    window.sessionStorage.removeItem(USER_KEY);
  } else {
    await AsyncStorage.setItem(USER_KEY, raw);
  }
};

export const getStoredUserProfile = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return (
      window.sessionStorage.getItem(USER_KEY) ||
      window.localStorage.getItem(USER_KEY)
    );
  }
  return AsyncStorage.getItem(USER_KEY);
};

export const clearUserProfile = async (): Promise<void> => {
  if (Platform.OS === 'web') {
    window.localStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  } else {
    await AsyncStorage.removeItem(USER_KEY);
  }
};
