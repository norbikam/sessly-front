import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_KEY = '@sessly_favorites';

type FavoritesContextType = {
  favorites: string[]; // Array of business IDs/slugs
  isFavorite: (businessId: string) => boolean;
  toggleFavorite: (businessId: string) => Promise<void>;
  clearFavorites: () => Promise<void>;
  isLoading: boolean;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load favorites from AsyncStorage on mount
  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const stored = await AsyncStorage.getItem(FAVORITES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('✅ [Favorites] Loaded from storage:', parsed);
        setFavorites(parsed);
      }
    } catch (error) {
      console.error('❌ [Favorites] Failed to load:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFavorites = async (newFavorites: string[]) => {
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
      console.log('✅ [Favorites] Saved to storage:', newFavorites);
    } catch (error) {
      console.error('❌ [Favorites] Failed to save:', error);
    }
  };

  const isFavorite = (businessId: string): boolean => {
    return favorites.includes(businessId);
  };

  const toggleFavorite = async (businessId: string) => {
    console.log('🔄 [Favorites] Toggling favorite:', businessId);
    
    setFavorites((prev) => {
      const newFavorites = prev.includes(businessId)
        ? prev.filter((id) => id !== businessId) // Remove
        : [...prev, businessId]; // Add
      
      // Save to AsyncStorage
      saveFavorites(newFavorites);
      
      console.log('✅ [Favorites] Updated:', {
        businessId,
        action: prev.includes(businessId) ? 'removed' : 'added',
        total: newFavorites.length,
      });
      
      return newFavorites;
    });
  };

  const clearFavorites = async () => {
    try {
      await AsyncStorage.removeItem(FAVORITES_KEY);
      setFavorites([]);
      console.log('✅ [Favorites] Cleared all favorites');
    } catch (error) {
      console.error('❌ [Favorites] Failed to clear:', error);
    }
  };

  const value: FavoritesContextType = {
    favorites,
    isFavorite,
    toggleFavorite,
    clearFavorites,
    isLoading,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesContextType {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}