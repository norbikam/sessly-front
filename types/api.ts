// ============ PODSTAWOWE TYPY ============

export interface User {
  id: string;
  email?: string | null;
  email_verified?: boolean;
  email_verified_at?: string | null;
  phone_number?: string;
  phone_verified?: boolean;
  phone_verified_at?: string | null;
  username: string;
  first_name?: string;
  last_name?: string;
  role: 'customer' | 'business_owner' | 'admin' | 'staff';
  business?: Business;
  businesses?: Business[];
  organization?: {
    phone_number?: string;
    legal_address_line1?: string;
    legal_city?: string;
    legal_postal_code?: string;
    legal_country?: string;
    id: string;
    name: string;
    nip?: string;
    verification_status?: 'pending' | 'approved' | 'rejected';
  };
  avatar?: string;
  avatar_url?: string;
  staff_position?: {
    id: string;
    business_id: string;
    slug: string;
    name: string;
  } | null;
  phone?: string;
  is_specialist?: boolean;
  favorite_business?: string[];
  preferred_language?: 'pl' | 'en' | 'de';
  preferred_currency?: 'PLN' | 'EUR';
  notify_email_reminders?: boolean;
  notify_push_reminders?: boolean;
  notify_promotions?: boolean;
}

export interface Business {
  id: string;
  name: string;
  name_i18n?: Record<string, string>;
  localized_name?: string;
  slug: string;
  category: 'hairdresser' | 'doctor' | 'beauty' | 'spa' | 'fitness' | 'other';
  category_label?: string;
  description?: string;
  description_i18n?: Record<string, string>;
  localized_description?: string;
  email?: string;
  phone_number?: string;
  website_url?: string;
  nip?: string;
  logo_url?: string;
  brand_color?: string;
  promotion_title?: string;
  promotion_title_i18n?: Record<string, string>;
  localized_promotion_title?: string;
  promotion_description?: string;
  promotion_description_i18n?: Record<string, string>;
  localized_promotion_description?: string;
  promotion_valid_until?: string;
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
  is_active?: boolean;
  services_count?: number;
  rating_avg?: number;
  rating_count?: number;
  cover_image?: string;
  images?: BusinessImage[];
  can_review?: boolean;
  opening_hours?: BusinessOpeningHour[];
  services?: BusinessService[];
  staff_members?: BusinessStaff[];
  created_at: string;
  updated_at: string;
}

export interface BusinessImage {
  id: string;
  url: string;
  caption?: string;
  is_cover: boolean;
  sort_order: number;
  created_at: string;
}

export interface Review {
  id: string;
  rating: number;
  comment?: string;
  comment_i18n?: Record<string, string>;
  localized_comment?: string;
  customer_first_name?: string;
  customer_username: string;
  is_own: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: number;
  kind:
    | 'appointment_3d'
    | 'appointment_1d'
    | 'appointment_2h'
    | 'appointment_new'
    | 'promotion';
  title: string;
  body: string;
  business_name?: string;
  business_id?: string;
  business_slug?: string;
  appointment_start?: string;
  created_at: string;
  read_at?: string;
}

export interface BusinessCategory {
  value: string;
  label: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  name_i18n?: Record<string, string>;
  localized_name?: string;
  duration_minutes?: number | null;
  effective_duration_minutes?: number;
  price_amount?: number;
  price_currency?: string;
  price_amount_eur?: number;
  promotional_price_amount?: number | null;
  promotional_price_amount_eur?: number | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface BusinessService {
  id: string;
  category?: ServiceCategory;
  name: string;
  description?: string;
  name_i18n?: Record<string, string>;
  description_i18n?: Record<string, string>;
  localized_name?: string;
  localized_description?: string;
  duration_minutes: number;
  buffer_minutes: number;
  total_slot_minutes: number;
  price_amount?: number;
  price_currency: string;
  price_amount_eur?: number;
  promotional_price_amount?: number;
  promotional_price_amount_eur?: number;
  promotion_valid_until?: string;
  price_is_indicative?: boolean;
  is_active: boolean;
  color?: string;
  image_url?: string;
  options?: ServiceOption[];
  sort_order?: number;
}

export interface ServiceCategory {
  id: string;
  name: string;
  color: string;
  sort_order: number;
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
  email?: string | null;
  avatar_url?: string;
  location_name?: string;
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
  status: 'pending' | 'proposed' | 'confirmed' | 'cancelled' | 'completed';
  source?: 'app' | 'phone' | 'walk_in';
  guest_name?: string;
  start: string; // ISO datetime
  end: string; // ISO datetime
  proposed_start?: string | null;
  proposed_end?: string | null;
  notes?: string;
  google_event_id?: string;
  created_at: string;
  updated_at?: string;
  confirmed_at?: string;
  business_name?: string;
  can_change?: boolean;
  change_blocked_reason?: string;
  change_min_hours?: number;
  deposit_status?: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | null;
  deposit_amount?: string | number | null;
  deposit_currency?: string | null;
  deposit_payment_id?: string | null;
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
  role?: 'customer' | 'business_owner';
  organization_name?: string;
  nip?: string;
  phone_number?: string;
  legal_address_line1?: string;
  legal_city?: string;
  legal_postal_code?: string;
  legal_country?: string;
  business?: {
    name: string;
    category: 'hairdresser' | 'doctor' | 'beauty' | 'spa' | 'fitness' | 'other';
    phone_number: string;
    address_line1: string;
    city: string;
    postal_code: string;
    country: string;
    nip?: string;
  };
}

export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

export interface VerifyEmailRequest {
  code: string;
}

export interface CreateAppointmentRequest {
  service_id?: string;
  service_ids?: string[];
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  notes?: string;
  staff_id?: string;
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

export type UpdateBusinessRequest = Partial<CreateBusinessRequest>;

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

export type UpdateServiceRequest = Partial<CreateServiceRequest>;

export interface CreateOpeningHourRequest {
  day_of_week: number;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
}

export type UpdateOpeningHourRequest = Partial<CreateOpeningHourRequest>;

export interface CreateStaffRequest {
  username: string;
  password: string;
  first_name: string;
  last_name?: string;
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
