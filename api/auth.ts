import {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    User,
} from "../types/api";
import { getRefreshToken, getToken, removeToken } from "../utils/storage";
import apiClient from "./client";
import { formatApiError } from "./errors";

interface RegisterBusinessPayload {
  name: string;
  category: "hairdresser" | "doctor" | "beauty" | "spa" | "fitness" | "other";
  description?: string;
  phone_number: string;
  address_line1: string;
  city: string;
  postal_code: string;
  country: string;
  nip?: string;
}

type RegisterWithRoleRequest = Omit<RegisterRequest, "role" | "business"> & {
  role?: "customer" | "business_owner";
  business?: RegisterBusinessPayload;
  organization_name?: string;
  nip?: string;
  phone?: string;
  phone_number?: string;
  legal_address_line1?: string;
  legal_city?: string;
  legal_postal_code?: string;
  legal_country?: string;
};

// ============ PODSTAWOWA AUTORYZACJA ============

export const login = async (
  credentials: LoginRequest,
): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>(
      "/users/login/",
      {
        username: credentials.username.trim(),
        password: credentials.password,
      },
    );
    return response.data;
  } catch (error) {
    const err = error as Error & { response?: unknown };
    err.message = formatApiError(error, "Nieprawidłowy login lub hasło");
    throw err;
  }
};

export const register = async (
  data: RegisterWithRoleRequest,
): Promise<LoginResponse> => {
  console.log("🚀 Starting registration process");
  console.log("📤 Sending payload:", {
    username: data.username,
    email: data.email,
  });

  // Wyślij TYLKO wypełnione pola
  const payload: RegisterWithRoleRequest = {
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

  if (data.role) {
    payload.role = data.role;
  }

  if (data.organization_name && data.organization_name.trim()) {
    payload.organization_name = data.organization_name.trim();
  }

  if (data.nip && data.nip.trim()) {
    payload.nip = data.nip.trim();
  }

  if (data.phone_number && data.phone_number.trim()) {
    payload.phone_number = data.phone_number.trim();
  }

  if (data.legal_address_line1 && data.legal_address_line1.trim()) {
    payload.legal_address_line1 = data.legal_address_line1.trim();
  }

  if (data.legal_city && data.legal_city.trim()) {
    payload.legal_city = data.legal_city.trim();
  }

  if (data.legal_postal_code && data.legal_postal_code.trim()) {
    payload.legal_postal_code = data.legal_postal_code.trim();
  }

  if (data.legal_country && data.legal_country.trim()) {
    payload.legal_country = data.legal_country.trim();
  }

  if (data.business) {
    payload.business = data.business;
  }

  try {
    const response = await apiClient.post<LoginResponse>(
      "/users/register/",
      payload,
    );
    console.log("✅ Registration successful:", response.data);

    return response.data;
  } catch (error: any) {
    throw new Error(formatApiError(error, "Wystąpił błąd podczas rejestracji"));
  }
};

export const logout = async (): Promise<void> => {
  console.log("🚪 Logout initiated");

  try {
    const token = await getToken();
    console.log("🔑 Token status:", token ? "EXISTS" : "MISSING");

    if (token) {
      console.log("📤 Sending logout request...");
      const refresh = await getRefreshToken();
      await apiClient.post("/users/logout/", { refresh });
      console.log("✅ Backend logout successful");
    }
  } catch (error: any) {
    console.warn("⚠️ Backend logout failed:", error.response?.status);
    console.log("📝 Continuing with local logout...");
  } finally {
    console.log("🗑️ Removing local tokens...");
    await removeToken();
    console.log("✅ Logout complete");
  }
};

export const getCurrentUser = async (): Promise<User> => {
  const response = await apiClient.get<User>("/users/me/");
  return response.data;
};

export type UpdateCurrentUserData = {
  preferred_language?: 'pl' | 'en' | 'de';
  preferred_currency?: 'PLN' | 'EUR';
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  notify_email_reminders?: boolean;
  notify_push_reminders?: boolean;
  notify_promotions?: boolean;
  avatar?: { uri: string; fileName?: string | null; mimeType?: string | null };
};

export const updateCurrentUser = async (data: UpdateCurrentUserData): Promise<User> => {
  if (data.avatar) {
    const form = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (key === 'avatar' || value === undefined || value === null) return;
      form.append(key, String(value));
    });
    const asset = data.avatar;
    const rawName = asset.fileName || `avatar-${Date.now()}.jpg`;
    const type = (asset.mimeType || 'image/jpeg').toLowerCase();
    const name = /\.(jpe?g|png|webp)$/i.test(rawName)
      ? rawName
      : `${rawName.replace(/\.[^.]+$/, '') || 'avatar'}.jpg`;
    if (typeof window !== 'undefined' && asset.uri.startsWith('blob:')) {
      const blobRes = await fetch(asset.uri);
      const blob = await blobRes.blob();
      const file = typeof File !== 'undefined' ? new File([blob], name, { type: blob.type || type }) : blob;
      form.append('avatar', file as Blob, name);
    } else if (typeof window !== 'undefined' && asset.uri.startsWith('http')) {
      const blobRes = await fetch(asset.uri);
      const blob = await blobRes.blob();
      form.append('avatar', blob, name);
    } else {
      form.append('avatar', { uri: asset.uri, name, type } as any);
    }
    const response = await apiClient.patch<User>('/users/me/', form, {
      headers: { 'Content-Type': undefined as unknown as string },
    });
    return response.data;
  }
  const response = await apiClient.patch<User>('/users/me/', data);
  return response.data;
};

export const changePassword = async (
  oldPassword: string,
  newPassword: string,
): Promise<void> => {
  await apiClient.post("/users/change-password/", {
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
  business_category:
    | "hairdresser"
    | "doctor"
    | "beauty"
    | "spa"
    | "fitness"
    | "other";
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
  data: RegisterBusinessData,
): Promise<LoginResponse> => {
  console.log("🏢 Starting business owner registration");

  // Rejestracja atomowa: user + business w jednym requestcie.
  const ownerRegistrationData: RegisterWithRoleRequest = {
    username: data.username,
    email: data.email,
    password: data.password,
    password2: data.password2,
    first_name: data.first_name,
    last_name: data.last_name,
    role: "business_owner",
    business: {
      name: data.business_name,
      category: data.business_category,
      description: data.business_description || undefined,
      phone_number: data.business_phone,
      address_line1: data.business_address_line1,
      city: data.business_city,
      postal_code: data.business_postal_code,
      country: "Polska",
      nip: data.business_nip || undefined,
    },
  };

  return register(ownerRegistrationData);
};
