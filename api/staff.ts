import apiClient from './client';
import { BusinessStaff, CreateStaffRequest, UpdateStaffRequest } from '../types/api';

/**
 * Pobierz listę pracowników biznesu
 */
export const getBusinessStaff = async (businessSlug: string): Promise<BusinessStaff[]> => {
  const response = await apiClient.get<BusinessStaff[]>(
    `/businesses/${businessSlug}/staff/`
  );
  return response.data;
};

/**
 * Pobierz szczegóły pracownika
 */
export const getStaffDetail = async (
  businessSlug: string,
  staffId: string
): Promise<BusinessStaff> => {
  const response = await apiClient.get<BusinessStaff>(
    `/businesses/${businessSlug}/staff/${staffId}/`
  );
  return response.data;
};

/**
 * Dodaj pracownika do biznesu
 */
export const addStaffMember = async (
  businessSlug: string,
  data: CreateStaffRequest
): Promise<BusinessStaff> => {
  const response = await apiClient.post<BusinessStaff>(
    `/businesses/${businessSlug}/staff/`,
    data
  );
  return response.data;
};

/**
 * Zaktualizuj dane pracownika
 */
export const updateStaffMember = async (
  businessSlug: string,
  staffId: string,
  data: UpdateStaffRequest
): Promise<BusinessStaff> => {
  const response = await apiClient.patch<BusinessStaff>(
    `/businesses/${businessSlug}/staff/${staffId}/`,
    data
  );
  return response.data;
};

/**
 * Usuń pracownika z biznesu
 */
export const removeStaffMember = async (
  businessSlug: string,
  staffId: string
): Promise<void> => {
  await apiClient.delete(`/businesses/${businessSlug}/staff/${staffId}/`);
};

/**
 * Przełącz status managera
 */
export const toggleStaffManager = async (
  businessSlug: string,
  staffId: string,
  isManager: boolean
): Promise<BusinessStaff> => {
  return updateStaffMember(businessSlug, staffId, { is_manager: isManager });
};
