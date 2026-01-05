import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_HOST_IP = '192.168.1.209';
const DEV_PORT = '8000';

const BASE_URL = __DEV__
  ? (Platform.OS === 'android' ? `http://10.0.2.2:${DEV_PORT}/api` : `http://${DEV_HOST_IP}:${DEV_PORT}/api`)
  : 'https://api.twoja-produkcja.pl/api';

// Eksportuj instancję axios jako apiClient (default export)
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Dodaj JWT token do każdego żądania (jeśli użytkownik jest zalogowany)
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Pobierz token z AsyncStorage
      let accessToken = await AsyncStorage.getItem('access_token');
      
      // ✅ FALLBACK do localStorage dla web
      if (!accessToken && Platform.OS === 'web') {
        accessToken = localStorage.getItem('access_token');
      }
      
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }

      // Zapewnij trailing slash dla POST/PUT/PATCH/DELETE (Django APPEND_SLASH)
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

// Obsługa błędów i odświeżania tokenu
apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    console.log('AXIOS ERROR', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });

    // Jeśli dostaniemy 401 i to nie była próba logowania, spróbuj odświeżyć token
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/login/')
    ) {
      originalRequest._retry = true;

      try {
        let refreshToken = await AsyncStorage.getItem('refresh_token');
        
        // ✅ FALLBACK do localStorage dla web
        if (!refreshToken && Platform.OS === 'web') {
          refreshToken = localStorage.getItem('refresh_token');
        }
        
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/users/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          await AsyncStorage.setItem('access_token', access);
          
          // ✅ Zapisz też do localStorage na web
          if (Platform.OS === 'web') {
            localStorage.setItem('access_token', access);
          }

          // Powtórz oryginalne żądanie z nowym tokenem
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Wyczyść tokeny i wyloguj użytkownika
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
        if (Platform.OS === 'web') {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
    }

    return Promise.reject(error);
  }
);

// ✅ Default export (dla import apiClient from './client')
export default apiClient;

// ✅ Named export (dla import { api } from './client')
export const api = apiClient;
