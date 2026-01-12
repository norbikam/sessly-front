import apiClient from './client';
import { VerifyEmailRequest } from '../types/api';

/**
 * Weryfikuj email przy użyciu kodu
 */
export const verifyEmail = async (code: string): Promise<void> => {
  const payload: VerifyEmailRequest = { code };
  await apiClient.post('/users/verify-email/', payload);
};

/**
 * Wyślij ponownie kod weryfikacyjny
 */
export const resendVerificationCode = async (): Promise<void> => {
  await apiClient.post('/users/verify-email/resend/');
};
