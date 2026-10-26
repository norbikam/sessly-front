import { useEffect } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { EmailVerificationBanner } from '../components/EmailVerificationBanner';
import { AuthProvider } from '../contexts/AuthContext';
import { FavoritesProvider } from '../contexts/FavoritesContext';
import { LocaleProvider } from '../contexts/LocaleContext';
import { LocationProvider } from '../contexts/LocationContext';
import { NotificationsProvider } from '../contexts/NotificationsContext';

SplashScreen.preventAutoHideAsync();

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.boundary}>
      <Text style={styles.boundaryTitle}>Coś poszło nie tak</Text>
      <Text style={styles.boundaryMessage}>{error?.message || 'Nieoczekiwany błąd.'}</Text>
      <Pressable style={styles.boundaryButton} onPress={retry}>
        <Text style={styles.boundaryButtonText}>Spróbuj ponownie</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <LocaleProvider>
        <LocationProvider>
          <FavoritesProvider>
            <NotificationsProvider>
              <View style={styles.root}>
                <EmailVerificationBanner />
                <View style={styles.stack}>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  </Stack>
                </View>
              </View>
            </NotificationsProvider>
          </FavoritesProvider>
        </LocationProvider>
      </LocaleProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stack: {
    flex: 1,
  },
  boundary: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  boundaryTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  boundaryMessage: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  boundaryButton: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  boundaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
