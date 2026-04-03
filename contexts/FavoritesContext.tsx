import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { getFavorites, toggleFavoriteApi } from '../api/favorites';
import { Business } from '../types/api';

interface FavoritesContextType {
  favoritesData: Business[];
  favoriteIds: Set<string>;
  isFavorite: (businessId: string) => boolean;
  toggleFavorite: (business: Business) => Promise<void>;
  refreshFavorites: () => Promise<void>;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [favoritesData, setFavoritesData] = useState<Business[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!isLoggedIn) {
      setFavoritesData([]);
      setFavoriteIds(new Set());
      return;
    }

    setLoading(true);
    try {
      const favorites = await getFavorites();
      setFavoritesData(favorites);
      setFavoriteIds(new Set(favorites.map(b => String(b.id))));
    } catch (err) {
      console.error('Failed to load favorites:', err);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  // Przeładuj ulubione, gdy użytkownik się loguje/wylogowuje
  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isFavorite = (businessId: string): boolean => {
    return favoriteIds.has(String(businessId));
  };

  const toggleFavorite = async (business: Business) => {
    if (!isLoggedIn) return;
    const businessIdStr = String(business.id);
    
    try {
      // Optymistyczna aktualizacja interfejsu dla natychmiastowej reakcji serduszka
      const wasFavorite = favoriteIds.has(businessIdStr);
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (wasFavorite) next.delete(businessIdStr);
        else next.add(businessIdStr);
        return next;
      });

      // Strzał do backendu
      await toggleFavoriteApi(businessIdStr);
      // Pobranie świeżej listy dla pewności
      await loadFavorites();
    } catch (error) {
      console.error('Toggle failed:', error);
      await loadFavorites(); // W razie błędu przywracamy stan z serwera
    }
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoritesData,
        favoriteIds,
        isFavorite,
        toggleFavorite,
        refreshFavorites: loadFavorites,
        loading,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider');
  return context;
};