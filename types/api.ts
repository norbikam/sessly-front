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
  // flexible shape — backend may provide array or object per day
  [key: string]: any;
}

// ✅ ROZSZERZONE TYPY DLA APPOINTMENTS
export interface Appointment {
  id: number | string;
  business_id?: number | string;
  business?: string | Business; // Może być nazwa lub obiekt
  service_id?: number | string;
  service?: Service; // Obiekt usługi
  user_id?: number | string;
  date?: string; // format: YYYY-MM-DD
  start?: string; // ISO datetime lub time
  end?: string; // ISO datetime lub time
  start_time?: string; // format: HH:MM
  end_time?: string; // format: HH:MM
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}