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
  id: string | number; // UUID lub numeric
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

export interface Appointment {
  id: number | string;
  business_id: number | string;
  service_id?: number | string;
  [key: string]: any;
}
