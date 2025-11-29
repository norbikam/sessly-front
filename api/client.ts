import axios from 'axios';
import { Platform } from 'react-native';

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

// ensure POST/PUT/PATCH requests include trailing slash (Django APPEND_SLASH)
api.interceptors.request.use((config) => {
  try {
    const method = (config.method || 'get').toLowerCase();
    if (['post', 'put', 'patch', 'delete'].includes(method) && config.url) {
      // preserve query string
      const [path, qs] = config.url.split('?');
      if (!path.endsWith('/')) {
        config.url = qs ? `${path}/${'?' + qs}`.replace('/?', '/?') : `${path}/`;
      }
    }
  } catch (e) {
    // ignore
  }
  return config;
}, (err) => Promise.reject(err));

api.interceptors.response.use(
  res => res,
  (error) => {
    console.log('AXIOS ERROR', {
      message: error.message,
      code: error.code,
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
    });
    return Promise.reject(error);
  }
);
