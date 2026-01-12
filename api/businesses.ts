import apiClient from './client';
import { Business, BusinessCategory, CreateBusinessRequest, UpdateBusinessRequest } from '../types/api';

/**
 * Pobierz listę kategorii biznesów
 */
export const getBusinessCategories = async (): Promise<BusinessCategory[]> => {
  const response = await apiClient.get<BusinessCategory[]>('/businesses/categories/');
  return response.data;
};

/**
 * Pobierz listę biznesów
 */
export const getBusinesses = async (params?: {
  category?: string;
  search?: string;
  city?: string;
}): Promise<Business[]> => {
  const response = await apiClient.get<Business[]>('/businesses/', { params });
  return response.data;
};

/**
 * Pobierz szczegóły biznesu
 */
export const getBusinessDetail = async (slug: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${slug}/`);
  return response.data;
};

// ============ BUSINESS OWNER ROUTES ============

/**
 * Pobierz własny biznes (dla zalogowanego właściciela)
 */
export const getMyBusiness = async (): Promise<Business> => {
  const response = await apiClient.get<Business>('/businesses/my-business/');
  return response.data;
};

/**
 * Utwórz nowy biznes
 */
export const createBusiness = async (data: CreateBusinessRequest): Promise<Business> => {
  const response = await apiClient.post<Business>('/businesses/my-business/', data);
  return response.data;
};

/**
 * Zaktualizuj własny biznes
 */
export const updateMyBusiness = async (data: UpdateBusinessRequest): Promise<Business> => {
  const response = await apiClient.patch<Business>('/businesses/my-business/', data);
  return response.data;
};

/**
 * Usuń własny biznes
 */
export const deleteMyBusiness = async (): Promise<void> => {
  await apiClient.delete('/businesses/my-business/');
};
