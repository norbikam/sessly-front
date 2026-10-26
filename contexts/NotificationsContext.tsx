import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getNotifications } from '../api/notifications';
import { useAuth } from './AuthContext';
import type { Notification } from '../types/api';

type NotificationsContextType = {
  items: Notification[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  setItems: React.Dispatch<React.SetStateAction<Notification[]>>;
};

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      setItems(await getNotifications());
    } catch {
      // keep previous
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    void Promise.resolve().then(refresh);
    if (!isLoggedIn) return undefined;
    const timer = setInterval(() => {
      void refresh();
    }, 60_000);
    return () => clearInterval(timer);
  }, [isLoggedIn, refresh]);

  const unreadCount = useMemo(
    () => items.filter((item) => !item.read_at).length,
    [items]
  );

  const value = useMemo(
    () => ({ items, unreadCount, loading, refresh, setItems }),
    [items, unreadCount, loading, refresh]
  );

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}
