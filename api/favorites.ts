import { Business } from '../types/api';
import apiClient from './client';

/**
 * Pobierz listę ulubionych biznesów z backendu
 */
export const getFavorites = async (): Promise<Business[]> => {
  try {
    const response = await apiClient.get('/users/favorites/');
    
    // Normalizacja wyników z Django (zabezpieczenie przed paginacją)
    let data = response.data;
    if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
      return (data as any).results;
    }
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('❌ [getFavorites API] Error:', error);
    return [];
  }
};

/**
 * Toggle (dodaj/usuń) biznes z ulubionych na backendzie
 */
export const toggleFavoriteApi = async (businessId: string): Promise<{detail: string, is_favorite: boolean}> => {
  try {
    const response = await apiClient.post(`/users/favorites/${businessId}/`);
    return response.data;
  } catch (error) {
    console.error('❌ [toggleFavoriteApi] Error:', error);
    throw error;
  }
};