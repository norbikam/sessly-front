import apiClient from './client';
import { Appointment, Business, BusinessImage, BusinessStaff, Review, Service, ServiceCategory } from '../types/api';
import { Platform } from 'react-native';

export type UploadAsset = { uri: string; fileName?: string | null; mimeType?: string | null };

const normalizeImageMime = (value?: string | null) => {
  const raw = (value || '').toLowerCase().trim();
  if (!raw || raw === 'application/octet-stream') return 'image/jpeg';
  if (raw === 'image/jpg' || raw === 'image/pjpeg') return 'image/jpeg';
  return raw;
};

const appendUpload = async (form: FormData, field: string, asset: UploadAsset) => {
  const rawName = asset.fileName || `sessly-${Date.now()}.jpg`;
  const type = normalizeImageMime(asset.mimeType);
  const name = /\.(jpe?g|png|webp)$/i.test(rawName)
    ? rawName
    : `${rawName.replace(/\.[^.]+$/, '') || 'sessly'}.${type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'}`;
  if (Platform.OS === 'web') {
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const mime = normalizeImageMime(blob.type || type);
    const file = typeof File !== 'undefined'
      ? new File([blob], name, { type: mime })
      : blob;
    form.append(field, file as Blob, name);
  } else {
    form.append(field, { uri: asset.uri, name, type } as any);
  }
};

const unwrapList = <T>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    const object = data as { results?: unknown; data?: unknown };
    if (Array.isArray(object.results)) return object.results as T[];
    if (Array.isArray(object.data)) return object.data as T[];
  }
  return [];
};

// --- ISTNIEJĄCE FUNKCJE (ODCZYT) ---

export const getBusinesses = async (params?: {
  search?: string;
  category?: string;
  lat?: number;
  lng?: number;
  radius_km?: number;
}): Promise<Business[]> => {
  const response = await apiClient.get<Business[]>('/businesses/', { params });
  
  // ✅ NORMALIZACJA: Backend może zwrócić tablicę LUB obiekt z results
  let data = response.data;
  
  // Jeśli backend zwraca { results: [...] }
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    return (data as any).results;
  }
  
  // Jeśli backend zwraca { data: [...] }
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
    return (data as any).data;
  }
  
  // Jeśli backend zwraca tablicę bezpośrednio
  if (Array.isArray(data)) {
    return data;
  }
  
  // Nieoczekiwany format
  console.error('❌ Unexpected API response format:', data);
  return [];
};

export const getBusinessDetail = async (slug: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${slug}/`);
  return response.data;
};

export const getBusinessBySlug = async (slug: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${slug}/`);
  return response.data;
};

export const getBusinessById = async (id: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${id}/`);
  return response.data;
};

export interface BusinessCategory {
  value: string;
  label: string;
  slug: string;
  name: string;
  count: number;
}

export const getBusinessCategories = async (): Promise<BusinessCategory[]> => {
  const response = await apiClient.get<BusinessCategory[]>('/businesses/categories/');
  return response.data;
};

export const searchBusinesses = async (
  search?: string,
  category?: string
): Promise<Business[]> => {
  const params: Record<string, string> = {};
  if (search && search.trim()) params.search = search.trim();
  if (category && category !== 'all') params.category = category;
  
  const response = await apiClient.get<Business[]>('/businesses/', { params });
  
  // ✅ NORMALIZACJA (jak wyżej)
  let data = response.data;
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    return (data as any).results;
  }
  if (data && typeof data === 'object' && Array.isArray((data as any).data)) {
    return (data as any).data;
  }
  if (Array.isArray(data)) {
    return data;
  }
  
  console.error('❌ Unexpected searchBusinesses response:', data);
  return [];
};

// --- ✅ FUNKCJE DLA WŁAŚCICIELA BIZNESU ---

/**
 * Pobierz własne usługi (właściciel biznesu)
 * Wymaga: user.business.slug
 */
export const getMyServices = async (businessSlug: string): Promise<Service[]> => {
  const response = await apiClient.get(`/businesses/${businessSlug}/services/`);
  return unwrapList<Service>(response.data);
};

/**
 * Dodaj nową usługę
 */
export const addService = async (
  businessSlug: string,
  data: { 
    name: string; 
    price_amount: number; // ✅ number, nie string
    duration_minutes: number; 
    description?: string;
    buffer_minutes?: number;
    price_currency?: string;
    category_id?: string;
  }
): Promise<Service> => {
  const response = await apiClient.post<Service>(
    `/businesses/${businessSlug}/services/`,
    {
      ...data,
      price_currency: data.price_currency || 'PLN',
      buffer_minutes: data.buffer_minutes || 0,
    }
  );
  return response.data;
};

export type ServiceWritePayload = {
  name?: string;
  price_amount?: number | null;
  price_amount_eur?: number | null;
  duration_minutes?: number;
  description?: string | null;
  category_id?: string | null;
  promotional_price_amount?: number | null;
  promotional_price_amount_eur?: number | null;
  promotion_valid_until?: string | null;
  price_is_indicative?: boolean;
  is_active?: boolean;
  sort_order?: number;
  options?: Array<{
    id?: string;
    name: string;
    price_amount?: number | null;
    price_amount_eur?: number | null;
    duration_minutes?: number | null;
    sort_order?: number;
    is_active?: boolean;
  }>;
};

const NULLABLE_SERVICE_FIELDS = new Set([
  'price_amount',
  'price_amount_eur',
  'promotional_price_amount',
  'promotional_price_amount_eur',
  'promotion_valid_until',
  'category_id',
]);

const appendServiceFields = (form: FormData, data: ServiceWritePayload) => {
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined) return;
    if (key === 'options') {
      form.append('options', JSON.stringify(value ?? []));
      return;
    }
    if (value === null) {
      if (NULLABLE_SERVICE_FIELDS.has(key)) form.append(key, '');
      return;
    }
    if (value === '') return;
    form.append(key, String(value));
  });
};

export const uploadService = async (
  businessSlug: string,
  data: ServiceWritePayload,
  asset?: UploadAsset,
): Promise<Service> => {
  const form = new FormData();
  appendServiceFields(form, data);
  if (asset) await appendUpload(form, 'image', asset);
  const response = await apiClient.post<Service>(`/businesses/${businessSlug}/services/`, form, {
    headers: { 'Content-Type': undefined as unknown as string },
  });
  return response.data;
};

export const updateService = async (
  businessSlug: string,
  serviceId: string,
  data: ServiceWritePayload,
  asset?: UploadAsset,
): Promise<Service> => {
  if (!asset) {
    const response = await apiClient.patch<Service>(
      `/businesses/${businessSlug}/services/${serviceId}/`,
      data,
    );
    return response.data;
  }

  const form = new FormData();
  appendServiceFields(form, data);
  await appendUpload(form, 'image', asset);
  const response = await apiClient.patch<Service>(
    `/businesses/${businessSlug}/services/${serviceId}/`,
    form,
    { headers: { 'Content-Type': undefined as unknown as string } },
  );
  return response.data;
};

export const reorderServices = async (
  businessSlug: string,
  orderedIds: string[],
): Promise<void> => {
  await apiClient.post(`/businesses/${businessSlug}/services/reorder/`, {
    ordered_ids: orderedIds,
  });
};

export const getServiceCategories = async (slug: string): Promise<ServiceCategory[]> => {
  const response = await apiClient.get(`/businesses/${slug}/service-categories/`);
  return unwrapList<ServiceCategory>(response.data);
};

export const addServiceCategory = async (
  slug: string,
  data: Pick<ServiceCategory, 'name' | 'color'> & Partial<Pick<ServiceCategory, 'sort_order'>>,
): Promise<ServiceCategory> => {
  const response = await apiClient.post(`/businesses/${slug}/service-categories/`, data);
  return response.data;
};

export const updateServiceCategory = async (
  slug: string,
  id: string,
  data: Partial<Pick<ServiceCategory, 'name' | 'color' | 'sort_order'>>,
): Promise<ServiceCategory> => {
  const response = await apiClient.patch(`/businesses/${slug}/service-categories/${id}/`, data);
  return response.data;
};

export const deleteServiceCategory = async (slug: string, id: string): Promise<void> => {
  await apiClient.delete(`/businesses/${slug}/service-categories/${id}/`);
};

export const getBusinessStaff = async (slug: string): Promise<BusinessStaff[]> => {
  const response = await apiClient.get(`/businesses/${slug}/staff/`);
  return unwrapList<BusinessStaff>(response.data);
};

export const addBusinessStaff = async (
  slug: string,
  data: {
    username: string;
    password: string;
    first_name: string;
    last_name?: string;
    avatar?: UploadAsset;
  },
): Promise<BusinessStaff> => {
  if (data.avatar) {
    const form = new FormData();
    form.append('username', data.username);
    form.append('password', data.password);
    form.append('first_name', data.first_name);
    if (data.last_name) form.append('last_name', data.last_name);
    await appendUpload(form, 'avatar', data.avatar);
    const response = await apiClient.post(`/businesses/${slug}/staff/`, form);
    return response.data;
  }
  const response = await apiClient.post(`/businesses/${slug}/staff/`, {
    username: data.username,
    password: data.password,
    first_name: data.first_name,
    last_name: data.last_name,
  });
  return response.data;
};

export const removeBusinessStaff = async (slug: string, id: string): Promise<void> => {
  await apiClient.delete(`/businesses/${slug}/staff/${id}/`);
};

/**
 * Usuń usługę
 */
export const deleteService = async (
  businessSlug: string,
  serviceId: string
): Promise<void> => {
  await apiClient.delete(`/businesses/${businessSlug}/services/${serviceId}/`);
};

/**
 * Zaktualizuj profil własnego biznesu (opcjonalnie z logo jako multipart).
 */
export const updateBusinessProfile = async (
  id: string | number,
  data: Partial<Business> | Record<string, string | number | boolean | null | undefined>,
  logo?: UploadAsset | null,
): Promise<Business> => {
  if (logo) {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      form.append(key, String(value));
    });
    await appendUpload(form, 'logo_image', logo);
    const response = await apiClient.patch<Business>(`/businesses/my-business/${id}/`, form, {
      headers: { 'Content-Type': undefined as unknown as string },
    });
    return response.data;
  }
  const response = await apiClient.patch<Business>(`/businesses/my-business/${id}/`, data);
  return response.data;
};

export interface StaffStatsSummary {
  id: string | null;
  name: string;
  username?: string | null;
  total: number;
  upcoming: number;
  pending?: number;
  current_month: number;
  current_month_completed: number;
  current_month_cancelled: number;
  current_month_revenue: string;
  /** @deprecated use current_month_* */
  last_30_days?: number;
  last_30_completed?: number;
  last_30_cancelled?: number;
  last_30_revenue?: string;
}

export interface BusinessStats {
  total: number;
  upcoming: number;
  pending?: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  current_month: number;
  current_month_completed: number;
  current_month_cancelled: number;
  current_month_revenue: string;
  /** @deprecated use current_month_* */
  last_30_days?: number;
  last_30_completed?: number;
  last_30_cancelled?: number;
  last_30_revenue?: string;
  period?: string;
  period_start?: string;
  from_app: number;
  from_external: number;
  revenue: string;
  daily: { date: string; count: number }[];
  top_services: { name: string; count: number; revenue: string }[];
  by_staff?: StaffStatsSummary[];
}

export const getBusinessStats = async (id: string, staffId?: string): Promise<BusinessStats> => {
  const response = await apiClient.get(`/businesses/my-business/${id}/stats/`, {
    params: staffId ? { staff_id: staffId } : undefined,
  });
  return response.data?.data || response.data;
};

export const getStaffStats = async (slug: string, staffId: string): Promise<BusinessStats & StaffStatsSummary> => {
  const response = await apiClient.get(`/businesses/${slug}/staff/${staffId}/stats/`);
  return response.data?.data || response.data;
};

// --- ✅ TWORZENIE BIZNESU ---

export interface CreateBusinessData {
  name: string;
  slug?: string;
  category: 'hairdresser' | 'doctor' | 'beauty' | 'spa' | 'fitness' | 'other';
  description?: string;
  email?: string;
  phone_number: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  postal_code: string;
  country?: string;
  nip?: string;
}

export const createBusiness = async (data: CreateBusinessData): Promise<Business> => {
  const payload = { ...data };
  if (!payload.slug) delete payload.slug;
  const response = await apiClient.post('/businesses/my-business/', payload);
  const body = response.data;
  if (body && typeof body === 'object' && !Array.isArray(body) && (body as any).id) {
    return body as Business;
  }
  if (body && typeof body === 'object' && (body as any).data?.id) {
    return (body as any).data as Business;
  }
  return body as Business;
};

export interface RegistryBusiness {
  nip: string;
  name: string;
  regon: string;
  address: string;
  address_line1?: string;
  postal_code?: string;
  city?: string;
  status: string;
}

export const lookupBusinessRegistry = async (nip: string): Promise<RegistryBusiness> => {
  const response = await apiClient.get<RegistryBusiness>('/businesses/registry/lookup/', {
    params: { nip },
  });
  return response.data;
};

export const getBusinessGallery = async (slug: string): Promise<BusinessImage[]> => {
  const response = await apiClient.get(`/businesses/${slug}/gallery/`);
  return unwrapList<BusinessImage>(response.data);
};

export const addBusinessImage = async (
  slug: string,
  image: Pick<BusinessImage, 'url'> & Partial<Pick<BusinessImage, 'caption' | 'is_cover' | 'sort_order'>>
): Promise<BusinessImage> => {
  const response = await apiClient.post<BusinessImage>(`/businesses/${slug}/gallery/`, image);
  return response.data;
};

export const uploadBusinessImage = async (
  slug: string,
  asset: UploadAsset,
  data: { caption?: string; is_cover?: boolean; sort_order?: number } = {},
): Promise<BusinessImage> => {
  const form = new FormData();
  await appendUpload(form, 'image', asset);
  if (data.caption) form.append('caption', data.caption);
  form.append('is_cover', String(Boolean(data.is_cover)));
  form.append('sort_order', String(data.sort_order || 0));
  const response = await apiClient.post<BusinessImage>(`/businesses/${slug}/gallery/`, form);
  return response.data;
};

export const uploadBusinessLogo = async (
  id: string,
  asset: UploadAsset,
): Promise<Business> => {
  const form = new FormData();
  await appendUpload(form, 'logo_image', asset);
  const response = await apiClient.patch<Business>(`/businesses/my-business/${id}/`, form, {
    headers: { 'Content-Type': undefined as unknown as string },
  });
  return response.data;
};

export const deleteBusinessImage = async (slug: string, imageId: string): Promise<void> => {
  await apiClient.delete(`/businesses/${slug}/gallery/${imageId}/`);
};

export const getBusinessReviews = async (slug: string): Promise<Review[]> => {
  const response = await apiClient.get(`/businesses/${slug}/reviews/`);
  return unwrapList<Review>(response.data);
};

export const addBusinessReview = async (
  slug: string,
  data: { rating: number; comment?: string }
): Promise<Review> => {
  const response = await apiClient.post<Review>(`/businesses/${slug}/reviews/`, data);
  return response.data;
};

export const updateBusinessReview = async (
  slug: string,
  reviewId: string,
  data: { rating: number; comment?: string }
): Promise<Review> => {
  const response = await apiClient.patch<Review>(`/businesses/${slug}/reviews/${reviewId}/`, data);
  return response.data;
};

/**
 * Pobierz własny biznes
 */
export const getMyBusiness = async (): Promise<Business | null> => {
  const response = await apiClient.get('/businesses/my-business/');
  let data = response.data;
  
  // Jeśli backend zwraca { results: [...] } (paginacja)
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    data = (data as any).results;
  }
  
  // Wyciągamy pierwszy biznes z tablicy
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  
  // Zabezpieczenie, jeśli backend kiedyś zostanie zmieniony i zwróci pojedynczy obiekt
  if (data && !Array.isArray(data) && (data as any).id) {
    return data as Business;
  }

  return null;
};

// --- ✅ ZARZĄDZANIE REZERWACJAMI (WŁAŚCICIEL) ---

/**
 * Pobiera rezerwacje dla konkretnego biznesu (wymaga slug)
 */
export const getBusinessAppointments = async (slug: string): Promise<Appointment[]> => {
  const response = await apiClient.get(`/businesses/${slug}/appointments/`);
  const data = response.data;

  // Zabezpieczenie przed różnymi formatami odpowiedzi
  if (Array.isArray(data)) {
    return data;
  }
  if (Array.isArray((data as any).results)) {
    return (data as any).results;
  }
  if (Array.isArray((data as any).data)) {
    return (data as any).data;
  }
  if (Array.isArray((data as any).appointments)) {
    return (data as any).appointments;
  }

  return [];
};

/**
 * Potwierdza rezerwację klienta
 */
export const confirmAppointmentByOwner = async (slug: string, appointmentId: string) => {
  const response = await apiClient.post(`/businesses/${slug}/appointments/${appointmentId}/confirm/`);
  return response.data;
};

/**
 * Anuluje/odrzuca rezerwację klienta
 */
export const cancelAppointmentByOwner = async (slug: string, appointmentId: string) => {
  const response = await apiClient.post(`/businesses/${slug}/appointments/${appointmentId}/cancel/`);
  return response.data;
};