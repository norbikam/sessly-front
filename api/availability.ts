import apiClient from './client';
import { AvailabilitySlot } from '../types/api';

/**
 * Pobierz dostępne godziny dla usługi w danym dniu
 * 
 * @param businessSlug - slug biznesu
 * @param serviceId - ID usługi
 * @param date - data w formacie YYYY-MM-DD
 */
export const getBusinessAvailability = async (
  businessSlug: string,
  serviceId: string,
  date: string
): Promise<AvailabilitySlot> => {
  const response = await apiClient.get<AvailabilitySlot>(
    `/businesses/${businessSlug}/availability/`,
    {
      params: { service_id: serviceId, date },
    }
  );
  return response.data;
};

/**
 * Pobierz dostępność dla kilku dni
 */
export const getBusinessAvailabilityRange = async (
  businessSlug: string,
  serviceId: string,
  dates: string[]
): Promise<AvailabilitySlot[]> => {
  const promises = dates.map((date) =>
    getBusinessAvailability(businessSlug, serviceId, date)
  );
  return Promise.all(promises);
};
