import { getToken } from '../utils/storage';

const API_BASE_URL = 'http://192.168.1.209:8000/api';

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

export interface Appointment {
  id: string;
  business: string; // slug
  service: AppointmentService;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  start: string; // ISO datetime
  end: string; // ISO datetime
  notes: string;
  google_event_id?: string;
  created_at: string;
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
 * @param filters - Filtry (status, time)
 */
export const getUserAppointments = async (filters?: AppointmentFilters): Promise<Appointment[]> => {
  const token = await getToken();
  
  if (!token) {
    console.error('❌ [API] getUserAppointments: Brak tokenu');
    throw new Error('Brak tokenu autoryzacji');
  }

  let url = `${API_BASE_URL}/users/appointments/`;
  
  // Dodaj filtry do URL
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.time) params.append('time', filters.time);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  console.log('🔵 [API] getUserAppointments URL:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('🔵 [API] getUserAppointments status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ [API] getUserAppointments error:', errorData);
    
    // Backend zwraca 404 dla niezaimplementowanego endpointu
    if (response.status === 404) {
      console.warn('⚠️ Endpoint /users/appointments/ not implemented yet');
      return []; // Zwróć pustą tablicę zamiast rzucać błąd
    }
    
    throw new Error(errorData.detail || 'Nie udało się pobrać wizyt');
  }

  const data = await response.json();
  
  // ✅ FIX: Sprawdź format i zwróć tablicę
  console.log('🔵 [API] getUserAppointments response:', {
    data,
    type: typeof data,
    isArray: Array.isArray(data),
  });
  
  // Zwróć tablicę
  if (Array.isArray(data)) {
    console.log('✅ [API] getUserAppointments success:', data.length, 'appointments');
    return data;
  } else if (data && typeof data === 'object') {
    // Backend może zwracać { results: [...] }
    const responseData: any = data;
    if (Array.isArray(responseData.results)) {
      console.log('✅ [API] getUserAppointments success (from results):', responseData.results.length);
      return responseData.results;
    } else if (Array.isArray(responseData.data)) {
      console.log('✅ [API] getUserAppointments success (from data):', responseData.data.length);
      return responseData.data;
    }
  }
  
  console.error('❌ [API] getUserAppointments: Invalid format', data);
  return [];
};

/**
 * Pobiera szczegóły pojedynczej wizyty
 * @param appointmentId - UUID wizyty
 */
export const getAppointmentDetail = async (appointmentId: string): Promise<Appointment> => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Brak tokenu autoryzacji');
  }

  const url = `${API_BASE_URL}/users/appointments/${appointmentId}/`;
  console.log('🔵 [API] getAppointmentDetail URL:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'Nie udało się pobrać szczegółów wizyty');
  }

  const data = await response.json();
  console.log('✅ [API] getAppointmentDetail success:', data);
  
  return data;
};

/**
 * Anuluje wizytę
 * @param appointmentId - UUID wizyty
 */
export const cancelAppointment = async (appointmentId: string): Promise<Appointment> => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Brak tokenu autoryzacji');
  }

  const url = `${API_BASE_URL}/users/appointments/${appointmentId}/cancel/`;
  console.log('🔵 [API] cancelAppointment URL:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log('🔵 [API] cancelAppointment status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ [API] cancelAppointment error:', errorData);
    throw new Error(errorData.message || 'Nie udało się anulować wizyty');
  }

  const responseData = await response.json();
  console.log('✅ [API] cancelAppointment success:', responseData);
  
  // Backend zwraca { data: Appointment, message: "..." }
  return responseData.data || responseData;
};

/**
 * Tworzy nową rezerwację
 * @param businessSlug - Slug firmy
 * @param data - Dane rezerwacji
 */
export const createAppointment = async (
  businessSlug: string,
  data: CreateAppointmentData
): Promise<CreateAppointmentResponse> => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Brak tokenu autoryzacji');
  }

  const url = `${API_BASE_URL}/businesses/${businessSlug}/appointments/`;
  console.log('🔵 [API] createAppointment URL:', url);
  console.log('🔵 [API] createAppointment data:', data);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  console.log('🔵 [API] createAppointment status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ [API] createAppointment error:', errorData);
    throw new Error(errorData.detail || errorData.message || 'Nie udało się utworzyć rezerwacji');
  }

  const responseData = await response.json();
  console.log('✅ [API] createAppointment success:', responseData);
  
  return responseData;
};

/**
 * Pobiera dostępne godziny dla usługi w danym dniu
 * @param businessSlug - Slug firmy
 * @param serviceId - UUID usługi
 * @param date - Data (YYYY-MM-DD)
 */
export const getAvailability = async (
  businessSlug: string,
  serviceId: string,
  date: string
): Promise<AvailabilityResponse> => {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Brak tokenu autoryzacji');
  }

  const url = `${API_BASE_URL}/businesses/${businessSlug}/availability/?service_id=${serviceId}&date=${date}`;
  console.log('🔵 [API] getAvailability URL:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  console.log('🔵 [API] getAvailability status:', response.status);

  if (!response.ok) {
    const errorData = await response.json();
    console.error('❌ [API] getAvailability error:', errorData);
    throw new Error(errorData.detail || 'Nie udało się pobrać dostępności');
  }

  const data = await response.json();
  console.log('✅ [API] getAvailability success:', data);
  
  return data;
};
