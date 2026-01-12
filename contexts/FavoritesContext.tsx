import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getFavorites, toggleFavorite as apiToggleFavorite } from '../api/favorites';
import { Business } from '../types/api';

interface FavoritesContextType {
  favoritesData: Business[];
  favoriteIds: Set<string>;
  isFavorite: (businessId: string) => boolean;
  toggleFavorite: (business: Business) => Promise<void>;
  refreshFavorites: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const [favoritesData, setFavoritesData] = useState<Business[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Załaduj ulubione przy starcie
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔵 [FavoritesContext] Loading favorites from local storage...');
      const favorites = await getFavorites();
      
      console.log('✅ [FavoritesContext] Loaded favorites:', favorites.length);
      
      setFavoritesData(favorites);
      
      // Utwórz Set z ID dla szybkiego sprawdzania
      const ids = new Set(favorites.map(b => String(b.id)));
      setFavoriteIds(ids);
      
      console.log('✅ [FavoritesContext] Favorite IDs:', Array.from(ids));
    } catch (err: any) {
      console.error('❌ [FavoritesContext] Failed to load favorites:', err);
      setError('Nie udało się załadować ulubionych');
      setFavoritesData([]);
      setFavoriteIds(new Set());
    } finally {
      setLoading(false);
    }
  };

  const isFavorite = (businessId: string): boolean => {
    return favoriteIds.has(String(businessId));
  };

  const toggleFavorite = async (business: Business) => {
    const businessIdStr = String(business.id);
    const wasFavorite = favoriteIds.has(businessIdStr);
    
    console.log(`🔵 [FavoritesContext] Toggling favorite for ${businessIdStr}, wasFavorite: ${wasFavorite}`);

    try {
      // ✅ Toggle w lokalnym storage
      await apiToggleFavorite(business, wasFavorite);
      
      // Odśwież listę po toggle
      await loadFavorites();
      
      console.log('✅ [FavoritesContext] Favorites refreshed after toggle');
    } catch (error: any) {
      console.error('❌ [FavoritesContext] Toggle failed:', error);
      throw error;
    }
  };

  const refreshFavorites = async () => {
    await loadFavorites();
  };

  return (
    <FavoritesContext.Provider
      value={{
        favoritesData,
        favoriteIds,
        isFavorite,
        toggleFavorite,
        refreshFavorites,
        loading,
        error,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
};
