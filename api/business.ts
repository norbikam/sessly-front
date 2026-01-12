import apiClient from './client';
import { Business, Service } from '../types/api';

// --- ISTNIEJĄCE FUNKCJE (ODCZYT) ---

export const getBusinesses = async (): Promise<Business[]> => {
  const response = await apiClient.get<Business[]>('/businesses/');
  
  // ✅ NORMALIZACJA: Backend może zwrócić tablicę LUB obiekt z results
  let data = response.data;
  
  // Jeśli backend zwraca { results: [...] }
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    return (data as any).results;
  }
  
  // Jeśli backend zwraca { data: [...] }
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
    return (data as any).data;
  }
  
  // Jeśli backend zwraca tablicę bezpośrednio
  if (Array.isArray(data)) {
    return data;
  }
  
  // Nieoczekiwany format
  console.error('❌ Unexpected API response format:', data);
  return [];
};

export const getBusinessDetail = async (slug: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${slug}/`);
  return response.data;
};

export const getBusinessBySlug = async (slug: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${slug}/`);
  return response.data;
};

export const getBusinessById = async (id: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${id}/`);
  return response.data;
};

export interface BusinessCategory {
  value: string; // ✅ Backend zwraca "value", nie "slug"
  label: string; // ✅ Backend zwraca "label", nie "name"
}

export const getBusinessCategories = async (): Promise<BusinessCategory[]> => {
  const response = await apiClient.get<BusinessCategory[]>('/businesses/categories/');
  return response.data;
};

export const searchBusinesses = async (
  search?: string,
  category?: string
): Promise<Business[]> => {
  const params: Record<string, string> = {};
  if (search && search.trim()) params.search = search.trim();
  if (category && category !== 'all') params.category = category;
  
  const response = await apiClient.get<Business[]>('/businesses/', { params });
  
  // ✅ NORMALIZACJA (jak wyżej)
  let data = response.data;
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    return (data as any).results;
  }
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
    return (data as any).data;
  }
  if (Array.isArray(data)) {
    return data;
  }
  
  console.error('❌ Unexpected searchBusinesses response:', data);
  return [];
};

// --- ✅ FUNKCJE DLA WŁAŚCICIELA BIZNESU ---

/**
 * Pobierz własne usługi (właściciel biznesu)
 * Wymaga: user.business.slug
 */
export const getMyServices = async (businessSlug: string): Promise<Service[]> => {
  const response = await apiClient.get<Service[]>(`/businesses/${businessSlug}/services/`);
  return response.data;
};

/**
 * Dodaj nową usługę
 */
export const addService = async (
  businessSlug: string,
  data: { 
    name: string; 
    price_amount: number; // ✅ number, nie string
    duration_minutes: number; 
    description?: string;
    buffer_minutes?: number;
    price_currency?: string;
  }
): Promise<Service> => {
  const response = await apiClient.post<Service>(
    `/businesses/${businessSlug}/services/`,
    {
      ...data,
      price_currency: data.price_currency || 'PLN',
      buffer_minutes: data.buffer_minutes || 0,
    }
  );
  return response.data;
};

/**
 * Usuń usługę
 */
export const deleteService = async (
  businessSlug: string,
  serviceId: string
): Promise<void> => {
  await apiClient.delete(`/businesses/${businessSlug}/services/${serviceId}/`);
};

/**
 * Zaktualizuj profil własnego biznesu
 */
export const updateBusinessProfile = async (data: Partial<Business>): Promise<Business> => {
  const response = await apiClient.patch<Business>(`/businesses/my-business/`, data);
  return response.data;
};

// --- ✅ TWORZENIE BIZNESU ---

export interface CreateBusinessData {
  name: string;
  slug: string;
  category: 'hairdresser' | 'doctor' | 'beauty' | 'spa' | 'fitness' | 'other';
  description?: string;
  email?: string;
  phone_number: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country?: string;
  nip?: string;
}

export const createBusiness = async (data: CreateBusinessData): Promise<Business> => {
  console.log('📤 Creating business:', data);
  const response = await apiClient.post<Business>('/businesses/my-business/', data);
  console.log('✅ Business created:', response.data);
  return response.data;
};

/**
 * Pobierz własny biznes
 */
export const getMyBusiness = async (): Promise<Business> => {
  const response = await apiClient.get<Business>('/businesses/my-business/');
  return response.data;
};
