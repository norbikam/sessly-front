import { api } from './client';
import { Appointment } from '../types/api';

export interface AvailabilitySlot {
  time: string; // format: "HH:MM"
}

export interface AvailabilityResponse {
  date: string;
  service_id: string;
  slots: AvailabilitySlot[];
}

export interface CreateAppointmentRequest {
  service_id: string;
  date: string; // format: "YYYY-MM-DD"
  start_time: string; // format: "HH:MM"
  notes?: string;
}

/**
 * Pobiera dostępne godziny rezerwacji dla danego biznesu i usługi
 */
export const getAvailability = async (
  businessSlug: string,
  serviceId: string,
  date: string
): Promise<AvailabilityResponse> => {
  const response = await api.get<AvailabilityResponse>(
    `/businesses/${businessSlug}/availability/`,
    {
      params: {
        service_id: serviceId,
        date: date,
      },
    }
  );
  return response.data;
};

/**
 * Tworzy nową rezerwację (wymaga zalogowania)
 */
export const createAppointment = async (
  businessSlug: string,
  data: CreateAppointmentRequest
): Promise<Appointment> => {
  const response = await api.post<Appointment>(
    `/businesses/${businessSlug}/appointments/`,
    data
  );
  return response.data;
};

/**
 * Pobiera rezerwacje użytkownika (wymaga zalogowania)
 * UWAGA: Ten endpoint nie jest jeszcze zaimplementowany w backendzie,
 * więc teraz zwróci błąd 404 - przygotowane na przyszłość
 */
export const getUserAppointments = async (): Promise<Appointment[]> => {
  try {
    const response = await api.get<Appointment[]>('/users/me/appointments/');
    return response.data;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.warn('Endpoint /users/me/appointments/ not implemented yet');
      return [];
    }
    throw error;
  }
};

/**
 * Anuluje rezerwację (wymaga zalogowania)
 * UWAGA: Ten endpoint nie jest jeszcze zaimplementowany w backendzie
 */
export const cancelAppointment = async (appointmentId: string): Promise<void> => {
  try {
    await api.delete(`/appointments/${appointmentId}/`);
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.warn('Endpoint /appointments/{id}/ not implemented yet');
    }
    throw error;
  }
};

export const getSpecialistSchedule = async (): Promise<Appointment[]> => {
  const response = await api.get('/appointments/specialist/');
  return response.data;
};
