import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = '@auth_token';
const REFRESH_TOKEN_KEY = '@refresh_token';

// ✅ Web fallback keys (używane przez AuthContext)
const WEB_TOKEN_KEY = 'access_token';
const WEB_REFRESH_TOKEN_KEY = 'refresh_token';

export const saveToken = async (accessToken: string, refreshToken: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, accessToken);
    await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    
    // ✅ Zapisz też do localStorage dla web
    if (Platform.OS === 'web') {
      localStorage.setItem(WEB_TOKEN_KEY, accessToken);
      localStorage.setItem(WEB_REFRESH_TOKEN_KEY, refreshToken);
    }
    
    console.log('✅ Tokens saved to AsyncStorage');
  } catch (error) {
    console.error('❌ Error saving tokens:', error);
    throw error;
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    let token = await AsyncStorage.getItem(TOKEN_KEY);
    
    // ✅ FALLBACK do localStorage dla web
    if (!token && Platform.OS === 'web') {
      token = localStorage.getItem('access_token');
      console.log('🔵 Token from localStorage:', token ? 'EXISTS ✅' : 'MISSING ❌');
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error getting token:', error);
    return null;
  }
};


export const getRefreshToken = async (): Promise<string | null> => {
  try {
    // ✅ Próbuj z AsyncStorage
    let token = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    
    // ✅ Fallback do localStorage dla web
    if (!token && Platform.OS === 'web') {
      token = localStorage.getItem(WEB_REFRESH_TOKEN_KEY);
    }
    
    return token;
  } catch (error) {
    console.error('❌ Error getting refresh token:', error);
    return null;
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    
    // ✅ Usuń też z localStorage dla web
    if (Platform.OS === 'web') {
      localStorage.removeItem(WEB_TOKEN_KEY);
      localStorage.removeItem(WEB_REFRESH_TOKEN_KEY);
      localStorage.removeItem('user'); // też usuń user
    }
    
    console.log('✅ Tokens removed from AsyncStorage');
  } catch (error) {
    console.error('❌ Error removing tokens:', error);
    throw error;
  }
};