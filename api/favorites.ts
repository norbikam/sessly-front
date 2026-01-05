import { getToken } from '../utils/storage';

const API_BASE_URL = 'http://192.168.1.209:8000/api';

// ✅ Response z backendu dla listy ulubionych
export interface FavoriteResponse {
  id: string;
  name: string;
  slug: string;
  category: string;
  description?: string;
  city: string;
  address_line1: string;
  address_line2?: string;
  postal_code: string;
  country: string;
  phone_number?: string;
  website_url?: string;
  services_count: number;
}

// ✅ Response dla toggle favorite
export interface ToggleFavoriteResponse {
  is_favorite: boolean;
  message?: string;
}

/**
 * Pobiera listę ulubionych firm użytkownika
 */
export const getUserFavorites = async (): Promise<FavoriteResponse[]> => {
  const token = await getToken();
  
  if (!token) {
    console.error('❌ [API] getUserFavorites: Brak tokenu');
    throw new Error('Brak tokenu autoryzacji');
  }

  const url = `${API_BASE_URL}/users/favorites/`;
  console.log('🔵 [API] getUserFavorites URL:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('🔵 [API] getUserFavorites status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ [API] getUserFavorites error response:', errorData);
    throw new Error(errorData.detail || 'Nie udało się pobrać ulubionych');
  }

  const data = await response.json();
  console.log('✅ [API] getUserFavorites success:', data.length, 'favorites');
  
  return data;
};

/**
 * Dodaje lub usuwa firmę z ulubionych
 * @param businessId - UUID firmy (akceptowane bezpośrednio przez backend!)
 */
export const toggleFavorite = async (businessId: string): Promise<ToggleFavoriteResponse> => {
  const token = await getToken();
  
  if (!token) {
    console.error('❌ [API] toggleFavorite: Brak tokenu');
    throw new Error('Brak tokenu autoryzacji');
  }

  console.log('🔵 [API] toggleFavorite businessId:', businessId);
  
  // ✅ Backend akceptuje UUID bezpośrednio!
  const url = `${API_BASE_URL}/users/favorites/${businessId}/`;
  console.log('🔵 [API] toggleFavorite URL:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('🔵 [API] toggleFavorite status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ [API] toggleFavorite error response:', errorData);
    throw new Error(errorData.detail || 'Nie udało się zmienić statusu ulubionej');
  }

  const data = await response.json();
  console.log('✅ [API] toggleFavorite success:', data);
  
  return {
    is_favorite: data.is_favorite,
    message: data.detail,
  };
};

/**
 * Sprawdza czy firma jest w ulubionych (dla pojedynczej firmy)
 */
export const isFavorite = async (businessId: string): Promise<boolean> => {
  try {
    const favorites = await getUserFavorites();
    return favorites.some(fav => fav.id === businessId);
  } catch (error) {
    console.error('❌ [API] isFavorite error:', error);
    return false;
  }
};
