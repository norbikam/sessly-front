import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEV_HOST_IP = '192.168.1.209';
const DEV_PORT = '8000';

const BASE_URL = __DEV__
  ? (Platform.OS === 'android' ? `http://10.0.2.2:${DEV_PORT}/api` : `http://${DEV_HOST_IP}:${DEV_PORT}/api`)
  : 'https://api.twoja-produkcja.pl/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

// Dodaj JWT token do każdego żądania (jeśli użytkownik jest zalogowany)
api.interceptors.request.use(
  async (config) => {
    try {
      // Pobierz token z AsyncStorage
      const accessToken = await AsyncStorage.getItem('access_token');
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
api.interceptors.response.use(
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
        const refreshToken = await AsyncStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${BASE_URL}/users/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          await AsyncStorage.setItem('access_token', access);

          // Powtórz oryginalne żądanie z nowym tokenem
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        // Wyczyść tokeny i wyloguj użytkownika
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
      }
    }

    return Promise.reject(error);
  }
);
