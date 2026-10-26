import { Business } from '../types/api';
import apiClient from './client';

function unwrapBusinesses(data: unknown): Business[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: Business[] }).results;
  }
  return [];
}

export async function getFollowing(): Promise<Business[]> {
  const response = await apiClient.get('/users/following/');
  return unwrapBusinesses(response.data);
}

export async function toggleFollowing(
  businessId: string,
): Promise<{ detail: string; is_following: boolean }> {
  const response = await apiClient.post(`/users/following/${businessId}/`);
  return response.data;
}
