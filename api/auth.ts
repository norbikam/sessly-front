import apiClient from './client';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../types/api';
import { saveToken, removeToken, getToken } from '../utils/storage';

export const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>('/users/login/', credentials);
  await saveToken(response.data.access, response.data.refresh);
  return response.data;
};

export const register = async (data: RegisterRequest): Promise<LoginResponse> => {
  console.log('🚀 Starting registration process');
  console.log('📤 Sending payload:', { username: data.username, email: data.email });
  
  // Wyślij TYLKO wypełnione pola
  const payload: any = {
    username: data.username.trim(),
    email: data.email.trim(),
    password: data.password,
    password2: data.password2,
  };
  
  // Dodaj opcjonalne pola TYLKO jeśli są wypełnione
  if (data.first_name && data.first_name.trim()) {
    payload.first_name = data.first_name.trim();
  }
  
  if (data.last_name && data.last_name.trim()) {
    payload.last_name = data.last_name.trim();
  }
  
  if (data.phone && data.phone.trim()) {
    payload.phone = data.phone.trim();
  }
  
  try {
    const response = await apiClient.post<LoginResponse>('/users/register/', payload);
    console.log('✅ Registration successful:', response.data);
    
    // ✅ ZAPISZ TOKENY PO REJESTRACJI
    if (response.data.access && response.data.refresh) {
      await saveToken(response.data.access, response.data.refresh);
      console.log('✅ Tokens saved');
    }
    
    return response.data;  // ← Zwróć LoginResponse
    
  } catch (error: any) {
    console.error('❌ Registration error:', error.response?.data);
    
    // Tłumaczenie błędów na polski
    const errorData = error.response?.data;
    
    if (errorData?.username) {
      const msg = Array.isArray(errorData.username) ? errorData.username[0] : errorData.username;
      if (msg.includes('already exists')) {
        throw new Error('Ta nazwa użytkownika jest już zajęta');
      }
      throw new Error(msg);
    }
    
    if (errorData?.email) {
      const msg = Array.isArray(errorData.email) ? errorData.email[0] : errorData.email;
      if (msg.includes('already exists')) {
        throw new Error('Ten adres email jest już zarejestrowany');
      }
      throw new Error(msg);
    }
    
    if (errorData?.password || errorData?.password2) {
      const msg = errorData.password || errorData.password2;
      const passwordMsg = Array.isArray(msg) ? msg[0] : msg;
      throw new Error(passwordMsg);
    }
    
    throw new Error(errorData?.detail || 'Wystąpił błąd podczas rejestracji');
  }
};

export const logout = async (): Promise<void> => {
  console.log('🚪 Logout initiated');
  
  try {
    const token = await getToken();
    console.log('🔑 Token status:', token ? 'EXISTS' : 'MISSING');
    
    if (token) {
      console.log('📤 Sending logout request...');
      await apiClient.post('/users/logout/');
      console.log('✅ Backend logout successful');
    }
  } catch (error: any) {
    console.warn('⚠️ Backend logout failed:', error.response?.status);
    console.log('📝 Continuing with local logout...');
  } finally {
    console.log('🗑️ Removing local tokens...');
    await removeToken();
    console.log('✅ Logout complete');
  }
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>('/users/me/');
  return response.data;
};

export const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
  await apiClient.post('/users/change-password/', {
    old_password: oldPassword,
    new_password: newPassword,
  });
};