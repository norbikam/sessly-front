import { api } from './client';
import { Business, Service } from '../types/api';

// --- ISTNIEJĄCE FUNKCJE (ODCZYT) ---

export const getBusinesses = async (): Promise<Business[]> => {
  const response = await api.get('/businesses/');
  return response.data;
};

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

export interface BusinessCategory {
  slug: string;
  name: string;
  count: number;
}

export const getBusinessCategories = async (): Promise<BusinessCategory[]> => {
  const response = await api.get<BusinessCategory[]>('/businesses/categories/');
  return response.data;
};

export const searchBusinesses = async (
  search?: string,
  category?: string
): Promise<Business[]> => {
  const params: Record<string, string> = {};
  if (search && search.trim()) params.search = search.trim();
  if (category && category !== 'all') params.category = category;
  
  const response = await api.get<Business[]>('/businesses/', { params });
  return response.data;
};

// --- ✅ NOWE FUNKCJE DLA SPECJALISTY (CRUD USŁUG) ---

/**
 * Pobierz usługi przypisane do profilu zalogowanego specjalisty
 */
export const getMyServices = async (): Promise<Service[]> => {
  const response = await api.get<Service[]>('/businesses/services/');
  return response.data;
};

/**
 * Dodaj nową usługę do swojej oferty
 */
export const addService = async (data: { 
  name: string; 
  price_amount: string; 
  duration_minutes: number; 
  description?: string 
}): Promise<Service> => {
  const response = await api.post<Service>('/businesses/services/', data);
  return response.data;
};

/**
 * Usuń usługę z oferty
 */
export const deleteService = async (id: number | string): Promise<void> => {
  await api.delete(`/businesses/services/${id}/`);
};

/**
 * Aktualizuj dane profilu biznesowego (np. opis, miasto)
 */
export const updateBusinessProfile = async (data: Partial<Business>): Promise<Business> => {
  const response = await api.patch<Business>(`/businesses/me/`, data);
  return response.data;
};