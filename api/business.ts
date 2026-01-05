import apiClient from './client';
import { Business, Service } from '../types/api';

// --- ISTNIEJĄCE FUNKCJE (ODCZYT) ---

export const getBusinesses = async (): Promise<Business[]> => {
  const response = await apiClient.get('/businesses/');
  
  // ✅ NORMALIZACJA: Backend może zwrócić tablicę LUB obiekt z results
  let data = response.data;
  
  // Jeśli backend zwraca { results: [...] }
  if (data && typeof data === 'object' && Array.isArray(data.results)) {
    return data.results;
  }
  
  // Jeśli backend zwraca { data: [...] }
  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return data.data;
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
  const response = await apiClient.get(`/businesses/${slug}/`);
  return response.data;
};

export const getBusinessBySlug = async (slug: string): Promise<Business> => {
  const response = await apiClient.get(`/businesses/${slug}/`);
  return response.data;
};

export const getBusinessById = async (id: string): Promise<Business> => {
  const response = await apiClient.get(`/businesses/${id}/`);
  return response.data;
};

export interface BusinessCategory {
  slug: string;
  name: string;
  count: number;
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
  if (data && typeof data === 'object' && Array.isArray(data.results)) {
    return data.results;
  }
  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return data.data;
  }
  if (Array.isArray(data)) {
    return data;
  }
  
  console.error('❌ Unexpected searchBusinesses response:', data);
  return [];
};

// --- ✅ NOWE FUNKCJE DLA SPECJALISTY (CRUD USŁUG) ---

export const getMyServices = async (): Promise<Service[]> => {
  const response = await apiClient.get<Service[]>('/businesses/services/');
  return response.data;
};

export const addService = async (data: { 
  name: string; 
  price_amount: string; 
  duration_minutes: number; 
  description?: string 
}): Promise<Service> => {
  const response = await apiClient.post<Service>('/businesses/services/', data);
  return response.data;
};

export const deleteService = async (id: number | string): Promise<void> => {
  await apiClient.delete(`/businesses/services/${id}/`);
};

export const updateBusinessProfile = async (data: Partial<Business>): Promise<Business> => {
  const response = await apiClient.patch<Business>(`/businesses/me/`, data);
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
  const response = await apiClient.post<Business>('/businesses/', data);
  console.log('✅ Business created:', response.data);
  return response.data;
};
