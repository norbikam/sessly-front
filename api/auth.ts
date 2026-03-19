import {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    User,
} from "../types/api";
import { getToken, removeToken, saveToken } from "../utils/storage";
import apiClient from "./client";

interface RegisterApiError {
  message?: string;
  detail?: string;
  details?: Record<string, string | string[]>;
  [key: string]: any;
}

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

interface RegisterWithRoleRequest extends RegisterRequest {
  role?: User["role"];
  business?: RegisterBusinessPayload;
}

// ============ PODSTAWOWA AUTORYZACJA ============

export const login = async (
  credentials: LoginRequest,
): Promise<LoginResponse> => {
  const response = await apiClient.post<LoginResponse>(
    "/users/login/",
    credentials,
  );
  await saveToken(response.data.access, response.data.refresh);
  return response.data;
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

  if (data.business) {
    payload.business = data.business;
  }

  try {
    const response = await apiClient.post<LoginResponse>(
      "/users/register/",
      payload,
    );
    console.log("✅ Registration successful:", response.data);

    // ✅ ZAPISZ TOKENY PO REJESTRACJI
    if (response.data.access && response.data.refresh) {
      await saveToken(response.data.access, response.data.refresh);
      console.log("✅ Tokens saved");
    }

    return response.data;
  } catch (error: any) {
    console.error("❌ Registration error:", error.response?.data);

    const errorData: RegisterApiError | undefined = error.response?.data;
    const message =
      errorData?.message ||
      errorData?.detail ||
      error.message ||
      "Wystąpił błąd podczas rejestracji";

    const registrationError = new Error(message) as Error & {
      details?: RegisterApiError["details"];
      raw?: RegisterApiError;
    };

    if (errorData?.details) {
      registrationError.details = errorData.details;
    }

    if (errorData) {
      registrationError.raw = errorData;
    }

    throw registrationError;
  }
};

export const logout = async (): Promise<void> => {
  console.log("🚪 Logout initiated");

  try {
    const token = await getToken();
    console.log("🔑 Token status:", token ? "EXISTS" : "MISSING");

    if (token) {
      console.log("📤 Sending logout request...");
      await apiClient.post("/users/logout/");
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
