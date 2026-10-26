import apiClient from './client';
import { formatApiError } from './errors';

export const verifyEmail = async (payload: {
  email?: string;
  code?: string;
  token?: string;
}): Promise<void> => {
  try {
    const body: Record<string, string> = {};
    if (payload.token) body.token = payload.token.trim();
    if (payload.email) body.email = payload.email.trim();
    if (payload.code) body.code = payload.code.trim();
    await apiClient.post('/users/verify-email/', body);
  } catch (error) {
    throw new Error(formatApiError(error, 'Nie udało się potwierdzić adresu e-mail'));
  }
};

export const resendVerificationCode = async (email: string): Promise<void> => {
  try {
    await apiClient.post('/users/verify-email/resend/', { email: email.trim() });
  } catch (error) {
    throw new Error(formatApiError(error, 'Nie udało się wysłać nowego kodu'));
  }
};

export const requestPasswordReset = async (email: string): Promise<string> => {
  try {
    const response = await apiClient.post('/users/password-reset/', { email: email.trim() });
    return response.data?.detail || 'Jeśli konto istnieje, wysłaliśmy kod na e-mail.';
  } catch (error) {
    throw new Error(formatApiError(error, 'Nie udało się wysłać kodu resetu hasła'));
  }
};

export const confirmPasswordReset = async (payload: {
  email?: string;
  code?: string;
  token?: string;
  newPassword: string;
  newPassword2: string;
}): Promise<void> => {
  try {
    await apiClient.post('/users/password-reset/confirm/', {
      email: payload.email?.trim() || '',
      code: payload.code?.trim() || '',
      token: payload.token?.trim() || '',
      new_password: payload.newPassword,
      new_password2: payload.newPassword2,
    });
  } catch (error) {
    throw new Error(formatApiError(error, 'Nie udało się zmienić hasła'));
  }
};
