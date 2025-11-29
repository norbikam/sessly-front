import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (!isLoggedIn) {
          router.replace('/(auth)/login');
        } else {
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.log('Deferred navigation error', e);
      }
    }, 50); // 50ms delay — wystarczy, by RootLayout zamontował Slot

    return () => clearTimeout(t);
  }, [isLoggedIn, router]);

  return null;
}