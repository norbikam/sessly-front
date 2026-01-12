import apiClient from './client';
import { Appointment } from '../types/api';

// ✅ Typy z backendu
export interface AppointmentService {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  buffer_minutes: number;
  total_slot_minutes: number;
  price_amount: string;
  price_currency: string;
  is_active: boolean;
  color?: string;
}

export interface AppointmentFilters {
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  time?: 'upcoming' | 'past';
}

export interface CreateAppointmentData {
  service_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  notes?: string;
}

export interface CreateAppointmentResponse {
  id: string;
  business: string;
  service: AppointmentService;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  start: string;
  end: string;
  notes: string;
  created_at: string;
}

export interface AvailabilityResponse {
  date: string;
  service_id: string;
  slots: string[]; // Lista dostępnych godzin ["09:00", "09:30", ...]
}

/**
 * Pobiera listę wizyt użytkownika
 * Endpoint: GET /users/appointments/
 * @param filters - Filtry (status, time)
 */
export const getUserAppointments = async (
  filters?: AppointmentFilters
): Promise<Appointment[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.time) params.append('time', filters.time);

    const url = `/users/appointments/${params.toString() ? `?${params}` : ''}`;
    console.log('📤 [getUserAppointments] URL:', url);

    const response = await apiClient.get<any>(url);
    console.log('✅ [getUserAppointments] Response:', response.data);

    // ✅ FIX: Normalizacja różnych formatów odpowiedzi
    let appointments: Appointment[] = [];

    if (Array.isArray(response.data)) {
      appointments = response.data;
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      appointments = response.data.results;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      appointments = response.data.data;
    } else {
      console.warn('⚠️ [getUserAppointments] Unexpected format:', response.data);
      return [];
    }

    console.log(`✅ [getUserAppointments] Loaded ${appointments.length} appointments`);
    return appointments;
  } catch (error: any) {
    console.error('❌ [getUserAppointments] Error:', error);

    // Jeśli endpoint nie istnieje (404), zwróć pustą tablicę
    if (error?.response?.status === 404) {
      console.warn('⚠️ Endpoint /users/appointments/ not implemented yet');
      return [];
    }

    throw error;
  }
};

// Alias dla kompatybilności wstecznej
export const getMyAppointments = getUserAppointments;

/**
 * Pobiera szczegóły pojedynczej wizyty
 * Endpoint: GET /users/appointments/{id}/
 * @param appointmentId - UUID wizyty
 */
export const getAppointmentDetail = async (
  appointmentId: string
): Promise<Appointment> => {
  try {
    console.log('📤 [getAppointmentDetail] ID:', appointmentId);
    const response = await apiClient.get<Appointment>(
      `/users/appointments/${appointmentId}/`
    );
    console.log('✅ [getAppointmentDetail] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [getAppointmentDetail] Error:', error);
    throw error;
  }
};

/**
 * Anuluje wizytę
 * Endpoint: POST /users/appointments/{id}/cancel/
 * @param appointmentId - UUID wizyty
 */
export const cancelAppointment = async (
  appointmentId: string
): Promise<Appointment> => {
  try {
    console.log('📤 [cancelAppointment] ID:', appointmentId);
    const response = await apiClient.post<any>(
      `/users/appointments/${appointmentId}/cancel/`,
      {}
    );
    console.log('✅ [cancelAppointment] Response:', response.data);

    // Backend zwraca { data: Appointment, message: "..." }
    if (response.data.data) {
      return response.data.data as Appointment;
    }
    return response.data as Appointment;
  } catch (error) {
    console.error('❌ [cancelAppointment] Error:', error);
    throw error;
  }
};

/**
 * Tworzy nową rezerwację
 * Endpoint: POST /businesses/{slug}/appointments/
 * @param businessSlug - Slug firmy
 * @param data - Dane rezerwacji
 */
export const createAppointment = async (
  businessSlug: string,
  data: CreateAppointmentData
): Promise<CreateAppointmentResponse> => {
  try {
    console.log('📤 [createAppointment] Slug:', businessSlug, 'Data:', data);
    const response = await apiClient.post<CreateAppointmentResponse>(
      `/businesses/${businessSlug}/appointments/`,
      data
    );
    console.log('✅ [createAppointment] Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('❌ [createAppointment] Error:', error);
    
    const errorMessage =
      error?.response?.data?.detail ||
      error?.response?.data?.message ||
      'Nie udało się utworzyć rezerwacji';
    
    throw new Error(errorMessage);
  }
};

/**
 * Pobiera dostępne godziny dla usługi w danym dniu
 * Endpoint: GET /businesses/{slug}/availability/?service_id={serviceId}&date={date}
 * @param businessSlug - Slug firmy
 * @param serviceId - UUID usługi
 * @param date - Data (YYYY-MM-DD)
 */
export const getAvailability = async (
  businessSlug: string,
  serviceId: string,
  date: string
): Promise<AvailabilityResponse> => {
  try {
    const url = `/businesses/${businessSlug}/availability/?service_id=${serviceId}&date=${date}`;
    console.log('📤 [getAvailability] URL:', url);

    const response = await apiClient.get<AvailabilityResponse>(url);
    console.log('✅ [getAvailability] Success:', response.data);
    
    return response.data;
  } catch (error) {
    console.error('❌ [getAvailability] Error:', error);
    throw error;
  }
};

/**
 * Usuwa wizytę (dla właściciela biznesu)
 * Endpoint: DELETE /users/appointments/{id}/
 * @param appointmentId - UUID wizyty
 */
export const deleteAppointment = async (appointmentId: string): Promise<void> => {
  try {
    console.log('📤 [deleteAppointment] ID:', appointmentId);
    await apiClient.delete(`/users/appointments/${appointmentId}/`);
    console.log('✅ [deleteAppointment] Success');
  } catch (error) {
    console.error('❌ [deleteAppointment] Error:', error);
    throw error;
  }
};

// ========================
// Business Owner Functions
// ========================

/**
 * Pobiera wizyty dla biznesu właściciela
 * Endpoint: GET /businesses/{slug}/appointments/
 * @param businessSlug - Slug firmy
 * @param filters - Filtry (status, start_date, end_date)
 */
export const getBusinessAppointments = async (
  businessSlug: string,
  filters?: {
    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    start_date?: string;
    end_date?: string;
  }
): Promise<Appointment[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const url = `/businesses/${businessSlug}/appointments/${
      params.toString() ? `?${params}` : ''
    }`;
    console.log('📤 [getBusinessAppointments] URL:', url);

    const response = await apiClient.get<any>(url);
    console.log('✅ [getBusinessAppointments] Response:', response.data);

    // Normalizacja
    if (Array.isArray(response.data)) {
      return response.data;
    } else if (response.data?.results) {
      return response.data.results;
    } else if (response.data?.data) {
      return response.data.data;
    }

    return [];
  } catch (error) {
    console.error('❌ [getBusinessAppointments] Error:', error);
    throw error;
  }
};

/**
 * Potwierdza wizytę (dla właściciela)
 * Endpoint: PATCH /businesses/{slug}/appointments/{id}/
 * @param businessSlug - Slug firmy
 * @param appointmentId - UUID wizyty
 */
export const confirmAppointment = async (
  businessSlug: string,
  appointmentId: string
): Promise<Appointment> => {
  try {
    console.log('📤 [confirmAppointment] Slug:', businessSlug, 'ID:', appointmentId);
    const response = await apiClient.patch<Appointment>(
      `/businesses/${businessSlug}/appointments/${appointmentId}/`,
      { status: 'confirmed' }
    );
    console.log('✅ [confirmAppointment] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [confirmAppointment] Error:', error);
    throw error;
  }
};

/**
 * Anuluje wizytę (dla właściciela)
 * Endpoint: PATCH /businesses/{slug}/appointments/{id}/
 * @param businessSlug - Slug firmy
 * @param appointmentId - UUID wizyty
 */
export const cancelBusinessAppointment = async (
  businessSlug: string,
  appointmentId: string
): Promise<Appointment> => {
  try {
    console.log('📤 [cancelBusinessAppointment] Slug:', businessSlug, 'ID:', appointmentId);
    const response = await apiClient.patch<Appointment>(
      `/businesses/${businessSlug}/appointments/${appointmentId}/`,
      { status: 'cancelled' }
    );
    console.log('✅ [cancelBusinessAppointment] Success:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ [cancelBusinessAppointment] Error:', error);
    throw error;
  }
};

/**
 * Usuwa wizytę (dla właściciela)
 * Endpoint: DELETE /businesses/{slug}/appointments/{id}/
 * @param businessSlug - Slug firmy
 * @param appointmentId - UUID wizyty
 */
export const deleteBusinessAppointment = async (
  businessSlug: string,
  appointmentId: string
): Promise<void> => {
  try {
    console.log('📤 [deleteBusinessAppointment] Slug:', businessSlug, 'ID:', appointmentId);
    await apiClient.delete(`/businesses/${businessSlug}/appointments/${appointmentId}/`);
    console.log('✅ [deleteBusinessAppointment] Success');
  } catch (error) {
    console.error('❌ [deleteBusinessAppointment] Error:', error);
    throw error;
  }
};
