import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import apiClient from '../api/client';
import { Business, User } from '../types/api';

const STORAGE_KEY = 'sessly_active_location_id';

type LocationSummary = {
  id: string;
  name: string;
  slug: string;
  category?: string;
  city?: string;
  is_active?: boolean;
};

type LocationContextType = {
  locations: LocationSummary[];
  activeLocation: LocationSummary | null;
  selectLocation: (id: string) => Promise<void>;
  refreshLocations: () => Promise<void>;
  isReady: boolean;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

function locationsFromUser(user: User | null): LocationSummary[] {
  if (!user) return [];
  if (user.businesses && user.businesses.length > 0) {
    return user.businesses.map((b) => ({
      id: String(b.id),
      name: b.name,
      slug: b.slug,
      category: b.category,
      city: b.city,
      is_active: b.is_active,
    }));
  }
  if (user.business) {
    return [
      {
        id: String(user.business.id),
        name: user.business.name,
        slug: user.business.slug,
        category: user.business.category,
        city: user.business.city,
        is_active: user.business.is_active,
      },
    ];
  }
  if (user.staff_position) {
    return [
      {
        id: String(user.staff_position.business_id),
        name: user.staff_position.name,
        slug: user.staff_position.slug,
      },
    ];
  }
  return [];
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { user, refreshUser, updateUser } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const locations = useMemo(() => locationsFromUser(user), [user]);

  useEffect(() => {
    const load = async () => {
      try {
        const stored =
          Platform.OS === 'web'
            ? localStorage.getItem(STORAGE_KEY)
            : (await AsyncStorage.getItem(STORAGE_KEY));
        setActiveId(stored);
      } finally {
        setIsReady(true);
      }
    };
    load();
  }, []);

  const activeLocation = useMemo(() => {
    if (!locations.length) return null;
    return locations.find((l) => l.id === activeId) || locations[0];
  }, [locations, activeId]);

  const selectLocation = useCallback(
    async (id: string) => {
      const match = locations.find((l) => l.id === id);
      setActiveId(id);
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        await AsyncStorage.setItem(STORAGE_KEY, id);
      }
      try {
        await apiClient.post(`/businesses/my-business/${id}/select/`);
        await refreshUser();
      } catch {
        if (match) {
          await updateUser({ business: match as unknown as Business });
        }
      }
    },
    [locations, refreshUser, updateUser]
  );

  return (
    <LocationContext.Provider value={{ locations, activeLocation, selectLocation, refreshLocations: refreshUser, isReady }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error('useLocation must be used within LocationProvider');
  }
  return ctx;
}
