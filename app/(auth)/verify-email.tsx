import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';

import { resendVerificationCode, verifyEmail } from '../../api/verification';
import { useAuth } from '../../contexts/AuthContext';
import Colors from '../../constants/Colors';
import {
  captureAndScrubAuthSecrets,
  clearAuthSecretHandoff,
} from '../../utils/authSecrets';
import { notify } from '../../utils/notify';

const RESEND_COOLDOWN_SEC = 60;

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { isLoggedIn, refreshUser, updateUser, isLoading: authLoading } = useAuth();
  const params = useLocalSearchParams<{ email?: string; code?: string; token?: string }>();
  const [boot] = useState(() =>
    captureAndScrubAuthSecrets(
      { email: params.email, code: params.code, token: params.token },
      'verify',
    ),
  );
  const [email, setEmail] = useState(boot.email);
  const [code, setCode] = useState(boot.code);
  const [token] = useState(boot.token);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const submittingRef = useRef(false);
  const autoTriedRef = useRef(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const markVerifiedLocally = async () => {
    await refreshUser();
    await updateUser({
      email_verified: true,
      email_verified_at: new Date().toISOString(),
    });
  };

  const submit = async (opts?: { token?: string; email?: string; code?: string }) => {
    if (submittingRef.current) return;
    const linkToken = (opts?.token ?? token ?? '').toString().trim();
    const mail = (opts?.email ?? email).trim();
    const pin = (opts?.code ?? code).trim();
    if (!linkToken && (!mail || pin.length !== 6)) {
      notify('Brak danych', 'Podaj e-mail oraz 6-cyfrowy kod albo użyj linku z maila.');
      return;
    }
    try {
      submittingRef.current = true;
      setLoading(true);
      await verifyEmail({ email: mail, code: pin, token: linkToken });
      clearAuthSecretHandoff('verify');
      await markVerifiedLocally();
      notify('Konto aktywne', 'Adres e-mail został potwierdzony.');
      router.replace(isLoggedIn ? '/(tabs)' : '/(auth)/login');
    } catch (error: any) {
      const message = error?.message || 'Kod lub link jest nieprawidłowy.';
      // Idempotent API / used link: refresh from server; only succeed if actually verified.
      await refreshUser();
      if (/już potwierdzony|already/i.test(message)) {
        clearAuthSecretHandoff('verify');
        await updateUser({
          email_verified: true,
          email_verified_at: new Date().toISOString(),
        });
        notify('Konto aktywne', 'Adres e-mail jest już potwierdzony.');
        router.replace(isLoggedIn ? '/(tabs)' : '/(auth)/login');
        return;
      }
      notify('Błąd weryfikacji', message);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoTriedRef.current || authLoading) return;
    const linkToken = token.trim();
    const pin = code.trim();
    if (!(linkToken || (email && pin.length === 6))) return;
    autoTriedRef.current = true;
    // Defer so loading state updates are not synchronous inside the effect body.
    const timer = setTimeout(() => {
      void submit({ token: linkToken, email, code: pin });
    }, 0);
    return () => clearTimeout(timer);
    // Auto-submit once from deep-link secrets; submit closes over current fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, email, code, authLoading]);

  const resend = async () => {
    if (!email.trim() || cooldown > 0) return;
    try {
      setResending(true);
      await resendVerificationCode(email);
      setCooldown(RESEND_COOLDOWN_SEC);
      notify('Kod wysłany', 'Sprawdź skrzynkę e-mail.');
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się wysłać kodu.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => goBackToApp(router, '/(auth)/login')}>
        <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
      </TouchableOpacity>
      <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="mail-open-outline" size={42} color={Colors.light.accent} /></View>
        <Text style={styles.title}>Potwierdź e-mail</Text>
        <Text style={styles.subtitle}>
          Kliknij link z wiadomości albo wpisz kod. Bez tego możesz korzystać z apki, ale nie umówisz wizyty.
        </Text>
        {(authLoading || loading) && (
          <ActivityIndicator color={Colors.light.accent} style={{ marginBottom: 16 }} />
        )}
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, styles.code]}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />
        <TouchableOpacity style={styles.button} onPress={() => submit()} disabled={loading || authLoading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Potwierdź konto</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.resend} onPress={resend} disabled={resending || cooldown > 0}>
          <Text style={[styles.resendText, (resending || cooldown > 0) && styles.resendDisabled]}>
            {cooldown > 0
              ? `Wyślij ponownie za ${cooldown}s`
              : resending
                ? 'Wysyłanie…'
                : 'Wyślij kod ponownie'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  back: { position: 'absolute', top: Platform.OS === 'ios' ? 58 : 34, left: 24, padding: 8 },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', padding: 28, borderRadius: 24, backgroundColor: '#fff' },
  icon: { width: 76, height: 76, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#F5F3FF', marginBottom: 18 },
  title: { textAlign: 'center', color: Colors.light.text, fontSize: 25, fontWeight: '900' },
  subtitle: { textAlign: 'center', color: Colors.light.textSecondary, marginTop: 8, marginBottom: 24, lineHeight: 20 },
  input: { height: 52, borderRadius: 14, paddingHorizontal: 16, marginBottom: 14, backgroundColor: '#F1F5F9', color: Colors.light.text },
  code: { fontSize: 25, fontWeight: '800', letterSpacing: 8 },
  button: { height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.accent },
  buttonText: { color: '#fff', fontWeight: '800' },
  resend: { alignItems: 'center', marginTop: 18, padding: 8 },
  resendText: { color: Colors.light.accent, fontWeight: '700' },
  resendDisabled: { opacity: 0.55 },
});
