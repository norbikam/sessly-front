import apiClient from './client';
import { Notification } from '../types/api';

export const getNotifications = async (): Promise<Notification[]> => {
  const response = await apiClient.get('/users/notifications/');
  const data = response.data;
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
};

export const markNotificationRead = async (id: number): Promise<void> => {
  await apiClient.post(`/users/notifications/${id}/read/`);
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await apiClient.post('/users/notifications/read/');
};
