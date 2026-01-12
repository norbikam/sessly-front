// ============ PODSTAWOWE TYPY ============

export interface User {
  id: string;
  email: string;
  username: string;
  first_name?: string;
  last_name?: string;
  role: 'customer' | 'business_owner' | 'admin' | 'staff';
  business?: Business;
  avatar?: string;
  phone?: string;
  is_specialist?: boolean; // Dla kompatybilności wstecznej
  favorite_business?: string[]; // Lista ID ulubionych biznesów
}

export interface Business {
  id: string;
  name: string;
  slug: string;
  category: 'hairdresser' | 'doctor' | 'beauty' | 'spa' | 'fitness' | 'other';
  description?: string;
  email?: string;
  phone_number?: string;
  website_url?: string;
  nip?: string;
  timezone: string;
  
  // ✅ Adresy
  address?: string; // Computed field dla wyświetlania
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country: string;
  
  latitude?: number;
  longitude?: number;
  services_count?: number;
  opening_hours?: BusinessOpeningHour[];
  services?: BusinessService[];
  created_at: string;
  updated_at: string;
}

export interface BusinessCategory {
  value: string;
  label: string;
}

export interface BusinessService {
  id: string;
  name: string;
  description?: string;
  duration_minutes: number;
  buffer_minutes: number;
  total_slot_minutes: number;
  price_amount?: number;
  price_currency: string;
  is_active: boolean;
  color?: string;
}

// Alias dla kompatybilności
export type Service = BusinessService;

export interface BusinessOpeningHour {
  day_of_week: number; // 0 = Poniedziałek, 6 = Niedziela
  day_name: string;
  is_closed: boolean;
  open_time?: string; // HH:MM format
  close_time?: string; // HH:MM format
}

export interface BusinessStaff {
  id: string;
  user_id?: string;
  username: string;
  first_name?: string;
  last_name?: string;
  email: string;
  is_manager: boolean;
}

export interface Appointment {
  id: string;
  business: string; // slug
  service: BusinessService;
  customer_email?: string;
  customer_first_name?: string;
  customer_last_name?: string;
  staff?: BusinessStaff | string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  start: string; // ISO datetime
  end: string; // ISO datetime
  notes?: string;
  google_event_id?: string;
  created_at: string;
  updated_at?: string;
  confirmed_at?: string;
}

export interface AvailabilitySlot {
  date: string; // YYYY-MM-DD
  service_id: string;
  slots: string[]; // ["09:00", "09:30", ...]
}

// ============ REQUEST/RESPONSE TYPY ============

export interface LoginRequest {
  username: string; // ✅ Backend używa username, nie email
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface VerifyEmailRequest {
  code: string;
}

export interface CreateAppointmentRequest {
  service_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  notes?: string;
}

export interface CreateBusinessRequest {
  name: string;
  slug: string;
  category: Business['category'];
  description?: string;
  email?: string;
  phone_number?: string;
  website_url?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateBusinessRequest extends Partial<CreateBusinessRequest> {}

export interface CreateServiceRequest {
  name: string;
  description?: string;
  duration_minutes: number;
  buffer_minutes?: number;
  price_amount?: number;
  price_currency?: string;
  is_active?: boolean;
  color?: string;
}

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {}

export interface CreateOpeningHourRequest {
  day_of_week: number;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
}

export interface UpdateOpeningHourRequest extends Partial<CreateOpeningHourRequest> {}

export interface CreateStaffRequest {
  user_id: string;
  is_manager?: boolean;
}

export interface UpdateStaffRequest {
  is_manager?: boolean;
}

// ============ UTILITY TYPES ============

export interface PaginatedResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  [key: string]: any;
}
