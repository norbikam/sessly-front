import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { updateCurrentUser } from '../api/auth';
import { useAuth } from './AuthContext';
import { setApiLanguage } from '../i18n/languageStore';
import { AppLanguage, translate } from '../i18n/translations';
import { AppCurrency } from '../utils/currency';

const LANGUAGE_KEY = 'sessly_language';
const CURRENCY_KEY = 'sessly_currency';

type LocaleContextValue = {
  language: AppLanguage;
  currency: AppCurrency;
  t: (key: string, fallback?: string, vars?: Record<string, string | number>) => string;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setCurrency: (currency: AppCurrency) => Promise<void>;
  setPreferences: (prefs: { language?: AppLanguage; currency?: AppCurrency }) => Promise<void>;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

async function readLocal(key: string) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function writeLocal(key: string, value: string) {
  if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, updateUser } = useAuth();
  const [language, setLanguageState] = useState<AppLanguage>('pl');
  const [currency, setCurrencyState] = useState<AppCurrency>('PLN');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedLang, storedCurrency] = await Promise.all([
        readLocal(LANGUAGE_KEY),
        readLocal(CURRENCY_KEY),
      ]);
      if (cancelled) return;
      if (storedLang === 'pl' || storedLang === 'en' || storedLang === 'de') {
        setLanguageState(storedLang);
        setApiLanguage(storedLang);
      }
      if (storedCurrency === 'PLN' || storedCurrency === 'EUR') {
        setCurrencyState(storedCurrency);
      }
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setApiLanguage(language);
  }, [language]);

  useEffect(() => {
    if (!ready || !isLoggedIn || !user) return;
    if (user.preferred_language === 'pl' || user.preferred_language === 'en' || user.preferred_language === 'de') {
      setLanguageState(user.preferred_language);
      void writeLocal(LANGUAGE_KEY, user.preferred_language);
    }
    if (user.preferred_currency === 'PLN' || user.preferred_currency === 'EUR') {
      setCurrencyState(user.preferred_currency);
      void writeLocal(CURRENCY_KEY, user.preferred_currency);
    }
  }, [isLoggedIn, ready, user?.id, user?.preferred_currency, user?.preferred_language]);

  const persist = useCallback(async (nextLanguage: AppLanguage, nextCurrency: AppCurrency) => {
    setLanguageState(nextLanguage);
    setCurrencyState(nextCurrency);
    await Promise.all([
      writeLocal(LANGUAGE_KEY, nextLanguage),
      writeLocal(CURRENCY_KEY, nextCurrency),
    ]);
    if (isLoggedIn) {
      try {
        const updated = await updateCurrentUser({
          preferred_language: nextLanguage,
          preferred_currency: nextCurrency,
        });
        await updateUser({
          preferred_language: updated.preferred_language,
          preferred_currency: updated.preferred_currency,
        });
      } catch {
        // Local prefs still apply if API is temporarily unavailable.
      }
    }
  }, [isLoggedIn, updateUser]);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    await persist(next, currency);
  }, [currency, persist]);

  const setCurrency = useCallback(async (next: AppCurrency) => {
    await persist(language, next);
  }, [language, persist]);

  const setPreferences = useCallback(async (prefs: { language?: AppLanguage; currency?: AppCurrency }) => {
    await persist(prefs.language || language, prefs.currency || currency);
  }, [currency, language, persist]);

  const value = useMemo<LocaleContextValue>(() => ({
    language,
    currency,
    t: (key, fallback, vars) => translate(language, key, fallback, vars),
    setLanguage,
    setCurrency,
    setPreferences,
  }), [currency, language, setCurrency, setLanguage, setPreferences]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
