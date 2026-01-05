import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserFavorites, toggleFavorite as apiToggleFavorite, FavoriteResponse } from '../api/favorites';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: string[]; // Lista ID firm
  favoritesData: FavoriteResponse[]; // Pełne dane firm
  isFavorite: (businessId: string) => boolean;
  toggleFavorite: (businessId: string) => Promise<void>;
  loadFavorites: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesData, setFavoritesData] = useState<FavoriteResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Ładuje ulubione z backendu
   */
  const loadFavorites = useCallback(async () => {
    if (!isLoggedIn) {
      console.log('🔵 [FavoritesContext] User not logged in, skipping loadFavorites');
      setFavorites([]);
      setFavoritesData([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔵 [FavoritesContext] Loading favorites...');
      
      const data = await getUserFavorites();
      
      // Zapisz pełne dane
      setFavoritesData(data);
      
      // Wyciągnij tylko ID do prostej listy
      const ids = data.map(fav => fav.id);
      setFavorites(ids);
      
      console.log('✅ [FavoritesContext] Loaded favorites:', ids.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się załadować ulubionych';
      console.error('❌ loadFavorites error:', message);
      setError(message);
      setFavorites([]);
      setFavoritesData([]);
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  /**
   * Sprawdza czy firma jest w ulubionych
   * @param businessId - UUID firmy
   */
  const isFavorite = useCallback((businessId: string): boolean => {
    return favorites.includes(businessId);
  }, [favorites]);

  /**
   * Dodaje/usuwa firmę z ulubionych
   * @param businessId - UUID firmy (backend akceptuje bezpośrednio!)
   */
  const toggleFavorite = useCallback(async (businessId: string) => {
    if (!isLoggedIn) {
      console.warn('⚠️ [FavoritesContext] toggleFavorite: User not logged in');
      return;
    }

    console.log('🔵 [FavoritesContext] toggleFavorite called with:', businessId);

    // Optimistic UI update
    const wasFavorite = favorites.includes(businessId);
    
    if (wasFavorite) {
      setFavorites(prev => prev.filter(id => id !== businessId));
      setFavoritesData(prev => prev.filter(fav => fav.id !== businessId));
    } else {
      setFavorites(prev => [...prev, businessId]);
      // Pełne dane zostaną załadowane po pomyślnym API call
    }

    try {
      // ✅ Wywołaj API (backend akceptuje UUID bezpośrednio!)
      const result = await apiToggleFavorite(businessId);
      
      console.log('✅ [FavoritesContext] toggleFavorite success:', result);
      
      // Przeładuj ulubione żeby mieć aktualne dane
      await loadFavorites();
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Nie udało się zmienić statusu ulubionej';
      console.error('❌ toggleFavorite error:', message);
      setError(message);
      
      // Rollback na błędzie
      if (wasFavorite) {
        setFavorites(prev => [...prev, businessId]);
      } else {
        setFavorites(prev => prev.filter(id => id !== businessId));
      }
      
      // Przeładuj z serwera żeby mieć pewność
      await loadFavorites();
    }
  }, [favorites, isLoggedIn, loadFavorites]);

  // Załaduj ulubione gdy użytkownik się zaloguje
  useEffect(() => {
    if (isLoggedIn) {
      console.log('🔵 [FavoritesContext] User logged in, loading favorites');
      loadFavorites();
    } else {
      console.log('🔵 [FavoritesContext] User logged out, clearing favorites');
      setFavorites([]);
      setFavoritesData([]);
    }
  }, [isLoggedIn, loadFavorites]);

  const value: FavoritesContextType = {
    favorites,
    favoritesData,
    isFavorite,
    toggleFavorite,
    loadFavorites,
    loading,
    error,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
};
