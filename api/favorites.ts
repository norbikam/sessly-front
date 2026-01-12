import { Business } from '../types/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const FAVORITES_STORAGE_KEY = '@sessly_favorites';

/**
 * ⚠️ UWAGA: Backend nie ma endpointów dla ulubionych
 * Używamy lokalnego storage (AsyncStorage/localStorage)
 */

/**
 * Pobierz listę ulubionych biznesów z lokalnego storage
 */
export const getFavorites = async (): Promise<Business[]> => {
  try {
    let favoritesJson: string | null = null;

    if (Platform.OS === 'web') {
      favoritesJson = localStorage.getItem(FAVORITES_STORAGE_KEY);
    } else {
      favoritesJson = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
    }

    if (!favoritesJson) {
      console.log('✅ [getFavorites] No favorites in storage');
      return [];
    }

    const favorites: Business[] = JSON.parse(favoritesJson);
    console.log('✅ [getFavorites] Loaded from storage:', favorites.length);
    return favorites;
  } catch (error) {
    console.error('❌ [getFavorites] Error:', error);
    return [];
  }
};

/**
 * Zapisz listę ulubionych do lokalnego storage
 */
const saveFavorites = async (favorites: Business[]): Promise<void> => {
  try {
    const favoritesJson = JSON.stringify(favorites);

    if (Platform.OS === 'web') {
      localStorage.setItem(FAVORITES_STORAGE_KEY, favoritesJson);
    } else {
      await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, favoritesJson);
    }

    console.log('✅ [saveFavorites] Saved to storage:', favorites.length);
  } catch (error) {
    console.error('❌ [saveFavorites] Error:', error);
    throw error;
  }
};

/**
 * Dodaj biznes do ulubionych (lokalnie)
 */
export const addFavorite = async (business: Business): Promise<void> => {
  try {
    const favorites = await getFavorites();
    
    // Sprawdź czy już nie jest w ulubionych
    const alreadyExists = favorites.some(b => String(b.id) === String(business.id));
    
    if (alreadyExists) {
      console.log('⚠️ [addFavorite] Already in favorites');
      return;
    }

    favorites.push(business);
    await saveFavorites(favorites);
    
    console.log('✅ [addFavorite] Added to favorites:', business.id);
  } catch (error) {
    console.error('❌ [addFavorite] Error:', error);
    throw error;
  }
};

/**
 * Usuń biznes z ulubionych (lokalnie)
 */
export const removeFavorite = async (businessId: string): Promise<void> => {
  try {
    const favorites = await getFavorites();
    const filtered = favorites.filter(b => String(b.id) !== String(businessId));
    
    await saveFavorites(filtered);
    
    console.log('✅ [removeFavorite] Removed from favorites:', businessId);
  } catch (error) {
    console.error('❌ [removeFavorite] Error:', error);
    throw error;
  }
};

/**
 * Toggle (dodaj/usuń) biznes z ulubionych (lokalnie)
 */
export const toggleFavorite = async (business: Business, isFavorite: boolean): Promise<void> => {
  if (isFavorite) {
    await removeFavorite(String(business.id));
  } else {
    await addFavorite(business);
  }
};

/**
 * Sprawdź czy biznes jest w ulubionych
 */
export const checkIsFavorite = async (businessId: string): Promise<boolean> => {
  const favorites = await getFavorites();
  return favorites.some(b => String(b.id) === String(businessId));
};
