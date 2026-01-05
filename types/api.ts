export interface User {
  id: number | string;
  name?: string;
  email: string;
  phone?: string;
  avatar?: string;
  joinDate?: string;
  totalVisits?: number;
  favoriteSpecialists?: number;
  points?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface Business {
  id: string | number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  slug?: string;
  image?: string;
  category?: string;
  [key: string]: any;
}

export interface Service {
  id: number | string;
  name: string;
  price?: number | string;
  duration?: number | string;
  description?: string;
  [key: string]: any;
}

export interface OpeningHours {
  [key: string]: any;
}

export interface Appointment {
  id: number | string;
  business_id?: number | string;
  business?: string | Business;
  service_id?: number | string;
  service?: Service;
  user_id?: number | string;
  date?: string;
  start?: string;
  end?: string;
  start_time?: string;
  end_time?: string;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

// ============ TYPY DLA AUTORYZACJI ============

export interface LoginRequest {
  email: string;
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
