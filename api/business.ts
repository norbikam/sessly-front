import { api } from './client';
import { Business } from '../types/api';

// ✅ ISTNIEJĄCE FUNKCJE
export const getBusinesses = async (): Promise<Business[]> => {
  const response = await api.get('/businesses/');
  return response.data;
};

/**
 * NEW FUNCTION - Pobierz szczegóły biznesu (wszystkie dane: services, opening_hours)
 */
export const getBusinessDetail = async (slug: string): Promise<Business> => {
  const response = await api.get(`/businesses/${slug}/`);
  return response.data;
};

export const getBusinessBySlug = async (slug: string): Promise<Business> => {
  const response = await api.get(`/businesses/${slug}/`);
  return response.data;
};

export const getBusinessById = async (id: string): Promise<Business> => {
  const response = await api.get(`/businesses/${id}/`);
  return response.data;
};

// ⚠️ TE FUNKCJE NIE SĄ JUŻ POTRZEBNE - dane dostępne w głównym endpoincie
// export const getBusinessServices = ...
// export const getBusinessOpeningHours = ...

// ✅ NOWE FUNKCJE - Category Filter & Search

export interface BusinessCategory {
  slug: string;
  name: string;
  count: number;
}

/**
 * Pobierz listę kategorii z licznikami biznesów
 * Endpoint: GET /api/businesses/categories/
 */
export const getBusinessCategories = async (): Promise<BusinessCategory[]> => {
  const response = await api.get<BusinessCategory[]>('/businesses/categories/');
  return response.data;
};

/**
 * Wyszukaj biznesy z filtrami
 * @param search - szukaj po nazwie lub mieście
 * @param category - filtruj po kategorii (slug)
 */
export const searchBusinesses = async (
  search?: string,
  category?: string
): Promise<Business[]> => {
  const params: Record<string, string> = {};
  
  if (search && search.trim()) {
    params.search = search.trim();
  }
  
  if (category && category !== 'all') {
    params.category = category;
  }
  
  const response = await api.get<Business[]>('/businesses/', { params });
  return response.data;
};