import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoggedIn, isLoading } = useAuth();
  const redirected = useRef(false);

  useEffect(() => {
    if (isLoading || redirected.current) return;
    // Stay idle once we leave `/` so remounts do not steal focus from login inputs.
    if (pathname !== '/' && pathname !== '/index') return;

    redirected.current = true;
    const t = setTimeout(() => {
      try {
        if (!isLoggedIn) {
          router.replace('/(auth)/login');
        } else {
          router.replace('/(tabs)');
        }
      } catch (e) {
        redirected.current = false;
        console.log('Deferred navigation error', e);
      }
    }, 50);

    return () => clearTimeout(t);
  }, [isLoggedIn, isLoading, pathname, router]);

  return null;
}