import apiClient from './client';
import { BusinessOpeningHour, CreateOpeningHourRequest, UpdateOpeningHourRequest } from '../types/api';

/**
 * Pobierz godziny otwarcia biznesu
 */
export const getOpeningHours = async (businessSlug: string): Promise<BusinessOpeningHour[]> => {
  const response = await apiClient.get<BusinessOpeningHour[]>(
    `/businesses/${businessSlug}/opening-hours/`
  );
  return response.data;
};

/**
 * Pobierz godziny otwarcia dla konkretnego dnia
 */
export const getOpeningHourDetail = async (
  businessSlug: string,
  dayId: string
): Promise<BusinessOpeningHour> => {
  const response = await apiClient.get<BusinessOpeningHour>(
    `/businesses/${businessSlug}/opening-hours/${dayId}/`
  );
  return response.data;
};

/**
 * Utwórz godziny otwarcia dla dnia
 */
export const createOpeningHour = async (
  businessSlug: string,
  data: CreateOpeningHourRequest
): Promise<BusinessOpeningHour> => {
  const response = await apiClient.post<BusinessOpeningHour>(
    `/businesses/${businessSlug}/opening-hours/`,
    data
  );
  return response.data;
};

/**
 * Zaktualizuj godziny otwarcia
 */
export const updateOpeningHour = async (
  businessSlug: string,
  dayId: string,
  data: UpdateOpeningHourRequest
): Promise<BusinessOpeningHour> => {
  const response = await apiClient.patch<BusinessOpeningHour>(
    `/businesses/${businessSlug}/opening-hours/${dayId}/`,
    data
  );
  return response.data;
};

/**
 * Usuń godziny otwarcia (ustawia dzień jako nieczynny)
 */
export const deleteOpeningHour = async (
  businessSlug: string,
  dayId: string
): Promise<void> => {
  await apiClient.delete(`/businesses/${businessSlug}/opening-hours/${dayId}/`);
};

/**
 * Batch update - ustaw godziny dla wszystkich dni tygodnia
 */
export const bulkUpdateOpeningHours = async (
  businessSlug: string,
  hours: CreateOpeningHourRequest[]
): Promise<BusinessOpeningHour[]> => {
  const promises = hours.map((hour) => {
    const existingId = hour.day_of_week.toString(); // Możesz potrzebować mapowania
    return updateOpeningHour(businessSlug, existingId, hour).catch(() =>
      createOpeningHour(businessSlug, hour)
    );
  });
  return Promise.all(promises);
};
