import { api as apiClient } from './client';
import { Business, Appointment, Service } from '../types/api';

export const getBusinesses = async (params?: {
  category?: string;
  search?: string;
}): Promise<Business[]> => {
  const response = await apiClient.get<Business[]>('/businesses/', { params });
  return response.data;
};

// dla UUID i slug
export const getBusinessBySlug = async (idOrSlug: string): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${idOrSlug}/`);
  return response.data;
};

export const getBusinessById = async (id: string | number): Promise<Business> => {
  const response = await apiClient.get<Business>(`/businesses/${id}/`);
  return response.data;
};

export const getBusinessCategories = async (): Promise<string[]> => {
  const response = await apiClient.get<{ categories: string[] }>('/businesses/categories/');
  return response.data.categories;
};

// fetch services for a business — try several possible backend endpoints
export const getBusinessServices = async (businessId: string | number): Promise<Service[]> => {
  // try business detail first (it includes services in this backend)
  try {
    const detailRes = await apiClient.get<any>(`/businesses/${businessId}/`);
    const detail = detailRes.data;
    if (Array.isArray(detail?.services)) return detail.services as Service[];
    // some backends may nest under data.results or similar
    if (Array.isArray(detail?.data?.services)) return detail.data.services as Service[];
  } catch (err: any) {
    const status = err?.response?.status;
    if (status !== 404 && status !== 405) throw err;
    // otherwise continue to probe other paths
  }

  const candidates = [
    `/businesses/${businessId}/services/`,
    `/businesses/${businessId}/offerings/`,
    `/businesses/${businessId}/catalog/`,
    `/services/?business=${businessId}`,
    `/services/?business_id=${businessId}`,
    `/business-services/?business=${businessId}`,
    `/api/services/?business=${businessId}`,
  ];

  for (const path of candidates) {
    try {
      const res = await apiClient.get<any>(path);
      const data = res.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.results)) return data.results;
      if (Array.isArray(data.data)) return data.data;
      if (Array.isArray(data.services)) return data.services;
      const arr = Object.values(data).find(v => Array.isArray(v));
      if (Array.isArray(arr)) return arr as Service[];
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) continue;
      throw err;
    }
  }

  // final fallback: try fetching all services and filter locally
  try {
    const allRes = await apiClient.get<any>('/services/');
    const all = allRes.data;
    const list = Array.isArray(all) ? all : Array.isArray(all.results) ? all.results : (Array.isArray(all.data) ? all.data : []);
    if (list.length) {
      const filtered = list.filter((s: any) =>
        String(s.business ?? s.business_id ?? s.company ?? s.business?.id ?? '').toLowerCase() === String(businessId).toLowerCase()
      );
      if (filtered.length) return filtered;
    }
  } catch (e) {
    console.debug('getBusinessServices fallback /services/ failed', e);
  }

  console.debug('getBusinessServices: no services found for', businessId);
  return [];
};

// fetch opening hours (if backend exposes separate endpoint)
export const getBusinessOpeningHours = async (businessId: string | number): Promise<any | null> => {
  // try business detail first (it includes opening_hours in this backend)
  try {
    const detailRes = await apiClient.get<any>(`/businesses/${businessId}/`);
    const detail = detailRes.data;
    if (Array.isArray(detail?.opening_hours)) return detail.opening_hours;
    if (Array.isArray(detail?.hours)) return detail.hours;
    if (Array.isArray(detail?.data?.opening_hours)) return detail.data.opening_hours;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status !== 404 && status !== 405) throw err;
    // otherwise continue to probe other paths
  }

  const candidates = [
    `/businesses/${businessId}/opening_hours/`,
    `/businesses/${businessId}/hours/`,
    `/opening-hours/?business=${businessId}`,
    `/schedules/?business=${businessId}`,
    `/business-opening-hours/?business=${businessId}`,
    `/api/opening-hours/?business=${businessId}`,
  ];

  for (const path of candidates) {
    try {
      const res = await apiClient.get<any>(path);
      const data = res.data;
      if (data == null) return null;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data.results)) return data.results;
      if (data.hours) return data.hours;
      if (data.opening_hours) return data.opening_hours;
      return data;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404 || status === 405) continue;
      throw err;
    }
  }

  // fallback: fetch all opening-hours (if exists) and filter
  try {
    const allRes = await apiClient.get<any>('/opening-hours/');
    const all = allRes.data;
    const list = Array.isArray(all) ? all : Array.isArray(all.results) ? all.results : [];
    if (list.length) {
      const filtered = list.filter((h: any) =>
        String(h.business ?? h.business_id ?? h.company ?? h.business?.id ?? '').toLowerCase() === String(businessId).toLowerCase()
      );
      if (filtered.length) return filtered;
    }
  } catch (e) {
    console.debug('getBusinessOpeningHours fallback /opening-hours/ failed', e);
  }

  console.debug('getBusinessOpeningHours: no hours found for', businessId);
  return null;
};
