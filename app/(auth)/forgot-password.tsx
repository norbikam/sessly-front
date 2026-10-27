import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';

import { confirmPasswordReset, requestPasswordReset } from '../../api/verification';
import Colors from '../../constants/Colors';
import {
  captureAndScrubAuthSecrets,
  clearAuthSecretHandoff,
} from '../../utils/authSecrets';
import { notify } from '../../utils/notify';

type Step = 'email' | 'reset';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; code?: string; token?: string }>();
  const [boot] = useState(() =>
    captureAndScrubAuthSecrets(
      { email: params.email, code: params.code, token: params.token },
      'reset',
    ),
  );
  const [step, setStep] = useState<Step>(boot.code || boot.token ? 'reset' : 'email');
  const [email, setEmail] = useState(boot.email);
  const [code, setCode] = useState(boot.code);
  const [token] = useState(boot.token);
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!email.trim() || !email.includes('@')) {
      notify('E-mail', 'Podaj poprawny adres e-mail.');
      return;
    }
    try {
      setLoading(true);
      const detail = await requestPasswordReset(email);
      notify(
        'Kod wysłany',
        `${detail}\n\nLokalnie: treść maila zobaczysz w terminalu Django (console backend).`,
      );
      setStep('reset');
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się wysłać kodu.');
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (!token && code.trim().length !== 6) {
      notify('Kod', 'Wpisz 6-cyfrowy kod z e-maila albo użyj linku.');
      return;
    }
    if (password.length < 8) {
      notify('Hasło', 'Hasło musi mieć minimum 8 znaków.');
      return;
    }
    if (password !== password2) {
      notify('Hasło', 'Hasła nie są identyczne.');
      return;
    }
    try {
      setLoading(true);
      await confirmPasswordReset({
        email,
        code,
        token,
        newPassword: password,
        newPassword2: password2,
      });
      clearAuthSecretHandoff('reset');
      notify('Gotowe', 'Hasło zostało zmienione. Możesz się zalogować.');
      router.replace('/(auth)/login');
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się zmienić hasła.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => (step === 'reset' ? setStep('email') : goBackToApp(router, '/(auth)/login'))}>
        <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
      </TouchableOpacity>

      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="key-outline" size={42} color={Colors.light.accent} />
        </View>
        <Text style={styles.title}>
          {step === 'email' ? 'Zapomniałem hasła' : 'Nowe hasło'}
        </Text>
        <Text style={styles.subtitle}>
          {step === 'email'
            ? 'Podaj e-mail konta — wyślemy kod i link.'
            : `Ustaw nowe hasło${email ? ` dla ${email}` : ''}.`}
        </Text>

        {step === 'email' ? (
          <>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TouchableOpacity style={styles.button} onPress={sendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Wyślij kod</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {!token ? (
              <TextInput
                style={[styles.input, styles.code]}
                value={code}
                onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />
            ) : (
              <Text style={styles.linkHint}>Link z e-maila jest aktywny — wystarczy ustawić hasło.</Text>
            )}
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Nowe hasło"
              secureTextEntry
              autoComplete="new-password"
            />
            <TextInput
              style={styles.input}
              value={password2}
              onChangeText={setPassword2}
              placeholder="Powtórz nowe hasło"
              secureTextEntry
              autoComplete="new-password"
            />
            <TouchableOpacity style={styles.button} onPress={submitReset} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Zmień hasło</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.resend} onPress={sendCode} disabled={loading}>
              <Text style={styles.resendText}>Wyślij kod ponownie</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC' },
  back: { position: 'absolute', top: Platform.OS === 'ios' ? 58 : 34, left: 24, padding: 8, zIndex: 2 },
  card: {
    width: '100%', maxWidth: 460, alignSelf: 'center', padding: 28, borderRadius: 24, backgroundColor: '#fff',
  },
  icon: {
    width: 76, height: 76, alignSelf: 'center', alignItems: 'center', justifyContent: 'center',
    borderRadius: 24, backgroundColor: '#F5F3FF', marginBottom: 18,
  },
  title: { textAlign: 'center', color: Colors.light.text, fontSize: 25, fontWeight: '900' },
  subtitle: {
    textAlign: 'center', color: Colors.light.textSecondary, marginTop: 8, marginBottom: 24, lineHeight: 20,
  },
  linkHint: {
    textAlign: 'center', color: '#059669', fontWeight: '700', marginBottom: 14, lineHeight: 18,
  },
  input: {
    height: 52, borderRadius: 14, paddingHorizontal: 16, marginBottom: 14,
    backgroundColor: '#F1F5F9', color: Colors.light.text,
  },
  code: { fontSize: 25, fontWeight: '800', letterSpacing: 8 },
  button: {
    height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.light.accent, marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: '800' },
  resend: { alignItems: 'center', marginTop: 18, padding: 8 },
  resendText: { color: Colors.light.accent, fontWeight: '700' },
});
