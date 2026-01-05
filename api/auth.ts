import apiClient from './client';
import { LoginRequest, LoginResponse, RegisterRequest, User } from '../types/api';
import { saveToken, removeToken, getToken } from '../utils/storage';
import { Business } from '../types/api';

// ============ PODSTAWOWA AUTORYZACJA ============

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
    
    return response.data;
    
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

// ============ REJESTRACJA BIZNESU ============

export interface RegisterBusinessData {
  // Dane użytkownika
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name?: string;
  last_name?: string;
  
  // Dane biznesu
  business_name: string;
  business_category: 'hairdresser' | 'doctor' | 'beauty' | 'spa' | 'fitness' | 'other';
  business_phone: string;
  business_address_line1: string;
  business_city: string;
  business_postal_code: string;
  business_description?: string;
  business_nip?: string;
}

// Alias dla jasności
export const registerAsCustomer = register;

export const registerAsBusinessOwner = async (
  data: RegisterBusinessData
): Promise<{ user: LoginResponse; business: Business }> => {
  console.log('🏢 Starting business owner registration');
  
  // KROK 1: Rejestruj użytkownika
  const userData: RegisterRequest = {
    username: data.username,
    email: data.email,
    password: data.password,
    password2: data.password2,
    first_name: data.first_name,
    last_name: data.last_name,
  };
  
  const user = await register(userData);
  console.log('✅ User registered successfully');
  
  // KROK 2: Utwórz biznes
  try {
    // Generuj slug z nazwy firmy
    const slug = data.business_name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Usuń polskie znaki
      .replace(/[^a-z0-9\s-]/g, '')    // Usuń spec znaki
      .trim()
      .replace(/\s+/g, '-')            // Spacje → myślniki
      .replace(/-+/g, '-');            // Wielokrotne → jeden
    
    const businessData = {
      name: data.business_name,
      slug: slug,
      category: data.business_category,
      description: data.business_description || '',
      phone_number: data.business_phone,
      address_line1: data.business_address_line1,
      city: data.business_city,
      postal_code: data.business_postal_code,
      country: 'Polska',
      nip: data.business_nip || undefined,
    };
    
    console.log('📤 Creating business:', businessData);
    const response = await apiClient.post<Business>('/businesses/', businessData);
    console.log('✅ Business created successfully');
    
    return { user, business: response.data };
    
  } catch (error: any) {
    console.error('❌ Business creation failed:', error.response?.data);
    throw new Error(
      'Konto użytkownika utworzone, ale nie udało się utworzyć firmy. ' +
      'Dokończ proces w ustawieniach aplikacji.'
    );
  }
};
