import axios, { create as createAxios, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getApiLanguage } from '../i18n/languageStore';
import { getRefreshToken, getToken, removeToken, updateAccessToken } from '../utils/storage';
import { notifySessionExpired } from '../utils/session';

const DEV_PORT = '8000';

function normalizeApiUrl(value: string): string {
  const trimmed = value.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function getDevUrl(): string {
  const fullUrl = process.env.EXPO_PUBLIC_API_URL;
  if (fullUrl) return normalizeApiUrl(fullUrl);

  const fromEnv = process.env.EXPO_PUBLIC_API_HOST;
  if (fromEnv?.startsWith('http://') || fromEnv?.startsWith('https://')) {
    return normalizeApiUrl(fromEnv);
  }
  if (fromEnv) return `http://${fromEnv}:${DEV_PORT}/api`;

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as { linkingUri?: string }).linkingUri;

  const host = hostUri
    ?.replace(/^[a-z]+:\/\//, "")
    .split(":")[0]
    .split("/")[0];

  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:${DEV_PORT}/api`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEV_PORT}/api`;
  }

  return `http://localhost:${DEV_PORT}/api`;
}

const productionApiUrl = process.env.EXPO_PUBLIC_API_URL;
if (!__DEV__ && !productionApiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL must be configured for production builds.');
}

const BASE_URL = __DEV__
  ? getDevUrl()
  : normalizeApiUrl(productionApiUrl as string);

export const API_BASE_URL = BASE_URL;

type RetriableConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _retryAnonymous?: boolean;
};

const apiClient = createAxios({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;

      const response = await axios.post(`${BASE_URL}/users/token/refresh/`, {
        refresh: refreshToken,
      });
      const access = response.data?.access as string | undefined;
      if (!access) return null;
      await updateAccessToken(access);
      return access;
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function clearAuthHeader(config: RetriableConfig) {
  if (config.headers) {
    delete (config.headers as Record<string, unknown>).Authorization;
    delete (config.headers as Record<string, unknown>).authorization;
  }
}

apiClient.interceptors.request.use(
  async (config) => {
    try {
      const accessToken = await getToken();

      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      config.headers['Accept-Language'] = getApiLanguage();

      // FormData must keep the browser/RN multipart boundary — never force JSON.
      if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
        const headers = config.headers as { delete?: (name: string) => void } & Record<string, unknown>;
        if (typeof headers.delete === 'function') {
          headers.delete('Content-Type');
        } else {
          delete headers['Content-Type'];
          delete headers['content-type'];
        }
      }

      const method = (config.method || 'get').toLowerCase();
      if (['post', 'put', 'patch', 'delete'].includes(method) && config.url) {
        const [path, qs] = config.url.split('?');
        if (!path.endsWith('/')) {
          config.url = qs ? `${path}/?${qs}` : `${path}/`;
        }
      }
    } catch (e) {
      console.error('Request interceptor error:', e);
    }
    return config;
  },
  (err) => Promise.reject(err)
);

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const url = originalRequest?.url || '';

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !url.includes('/login/') &&
      !url.includes('/token/refresh/') &&
      !url.includes('/register/')
    ) {
      originalRequest._retry = true;

      try {
        const access = await refreshAccessToken();
        if (access) {
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch {
        // Fall through to anonymous retry / session clear.
      }

      await removeToken();
      notifySessionExpired();

      if (!originalRequest._retryAnonymous) {
        originalRequest._retryAnonymous = true;
        clearAuthHeader(originalRequest);
        return apiClient(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export const api = apiClient;
