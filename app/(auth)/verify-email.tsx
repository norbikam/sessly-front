import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { resendVerificationCode, verifyEmail } from '../../api/verification';
import Colors from '../../constants/Colors';
import { notify } from '../../utils/notify';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; code?: string; token?: string }>();
  const [email, setEmail] = useState(params.email || '');
  const [code, setCode] = useState(params.code || '');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  const submit = async (opts?: { token?: string; email?: string; code?: string }) => {
    const token = (opts?.token ?? params.token ?? '').toString().trim();
    const mail = (opts?.email ?? email).trim();
    const pin = (opts?.code ?? code).trim();
    if (!token && (!mail || pin.length !== 6)) {
      notify('Brak danych', 'Podaj e-mail oraz 6-cyfrowy kod albo użyj linku z maila.');
      return;
    }
    try {
      setLoading(true);
      await verifyEmail({ email: mail, code: pin, token });
      notify('Konto aktywne', 'Adres e-mail został potwierdzony. Możesz umawiać wizyty.');
      router.replace('/(auth)/login');
    } catch (error: any) {
      notify('Błąd weryfikacji', error?.message || 'Kod lub link jest nieprawidłowy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoTried) return;
    const token = (params.token || '').toString().trim();
    const pin = (params.code || '').toString().trim();
    if (token || (params.email && pin.length === 6)) {
      setAutoTried(true);
      void submit({
        token,
        email: (params.email || '').toString(),
        code: pin,
      });
    }
  }, [params.token, params.email, params.code, autoTried]);

  const resend = async () => {
    if (!email.trim()) return;
    try {
      setResending(true);
      await resendVerificationCode(email);
      notify('Kod wysłany', 'Sprawdź skrzynkę (lokalnie: terminal Django / konsola).');
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się wysłać kodu.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
      </TouchableOpacity>
      <View style={styles.card}>
        <View style={styles.icon}><Ionicons name="mail-open-outline" size={42} color={Colors.light.accent} /></View>
        <Text style={styles.title}>Potwierdź e-mail</Text>
        <Text style={styles.subtitle}>
          Kliknij link z wiadomości albo wpisz kod. Bez tego możesz korzystać z apki, ale nie umówisz wizyty.
        </Text>
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
        <TouchableOpacity style={styles.button} onPress={() => submit()} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Potwierdź konto</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={styles.resend} onPress={resend} disabled={resending}>
          <Text style={styles.resendText}>{resending ? 'Wysyłanie…' : 'Wyślij kod ponownie'}</Text>
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
});
