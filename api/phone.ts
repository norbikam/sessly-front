import apiClient from './client';
import { formatApiError } from './errors';
import type { User } from '../types/api';

export const requestPhoneCode = async (phoneNumber: string): Promise<string> => {
  try {
    const response = await apiClient.post('/users/phone/', {
      phone_number: phoneNumber.trim(),
    });
    return response.data?.phone_number || phoneNumber;
  } catch (error) {
    throw new Error(formatApiError(error, 'Nie udało się wysłać kodu SMS'));
  }
};

export const verifyPhoneCode = async (
  code: string,
  phoneNumber?: string,
): Promise<User> => {
  try {
    const response = await apiClient.post('/users/phone/verify/', {
      code: code.trim(),
      phone_number: phoneNumber?.trim() || undefined,
    });
    return response.data?.user;
  } catch (error) {
    throw new Error(formatApiError(error, 'Nie udało się potwierdzić numeru'));
  }
};
