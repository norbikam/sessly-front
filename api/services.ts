import apiClient from './client';
import { BusinessService, CreateServiceRequest, UpdateServiceRequest } from '../types/api';

/**
 * Pobierz listę usług biznesu
 */
export const getBusinessServices = async (businessSlug: string): Promise<BusinessService[]> => {
  const response = await apiClient.get<BusinessService[]>(
    `/businesses/${businessSlug}/services/`
  );
  return response.data;
};

/**
 * Pobierz szczegóły usługi
 */
export const getServiceDetail = async (
  businessSlug: string,
  serviceId: string
): Promise<BusinessService> => {
  const response = await apiClient.get<BusinessService>(
    `/businesses/${businessSlug}/services/${serviceId}/`
  );
  return response.data;
};

/**
 * Utwórz nową usługę
 */
export const createService = async (
  businessSlug: string,
  data: CreateServiceRequest
): Promise<BusinessService> => {
  const response = await apiClient.post<BusinessService>(
    `/businesses/${businessSlug}/services/`,
    data
  );
  return response.data;
};

/**
 * Zaktualizuj usługę
 */
export const updateService = async (
  businessSlug: string,
  serviceId: string,
  data: UpdateServiceRequest
): Promise<BusinessService> => {
  const response = await apiClient.patch<BusinessService>(
    `/businesses/${businessSlug}/services/${serviceId}/`,
    data
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
 * Przełącz aktywność usługi
 */
export const toggleServiceActive = async (
  businessSlug: string,
  serviceId: string,
  isActive: boolean
): Promise<BusinessService> => {
  return updateService(businessSlug, serviceId, { is_active: isActive });
};
