import { api as apiClient } from './client';
import { Business, Appointment, Service } from '../types/api';

export const getBusinesses = async (params?: {
  category?: string;
  search?: string;
}): Promise<Business[]> => {
  const response = await apiClient.get<Business[]>('/businesses/', { params });
  return response.data;
};

// NOWA FUNKCJA - pobiera szczegóły biznesu ze wszystkimi danymi
export const getBusinessDetail = async (slug: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${slug}/`);
  return response.data;
};

export const getBusinessBySlug = async (idOrSlug: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${idOrSlug}/`);
  return response.data;
};

export const getBusinessById = async (id: string | number): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${id}/`);
  return response.data;
};

export const getBusinessCategories = async (): Promise<string[]> => {
  const response = await apiClient.get<{ categories: string[] }>('/businesses/categories/');
  return response.data.categories;
};

// Te funkcje są już niepotrzebne - dane są w głównym endpoincie
export const getBusinessServices = async (businessId: string | number): Promise<Service[]> => {
  // Pozostaw dla kompatybilności, ale nie będzie używane
  return [];
};

export const getBusinessOpeningHours = async (businessId: string | number): Promise<any | null> => {
  // Pozostaw dla kompatybilności, ale nie będzie używane
  return null;
};
