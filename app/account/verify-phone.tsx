import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';

import { requestPhoneCode, verifyPhoneCode } from '../../api/phone';
import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../utils/notify';

type Step = 'phone' | 'code';

export default function VerifyPhoneScreen() {
  const { user, refreshUser, updateUser } = useAuth();
  const [step, setStep] = useState<Step>(user?.phone_number && !user?.phone_verified ? 'code' : 'phone');
  const [phone, setPhone] = useState(user?.phone_number || user?.phone || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    if (!phone.trim()) {
      notify('Telefon', 'Podaj numer telefonu.');
      return;
    }
    try {
      setLoading(true);
      const normalized = await requestPhoneCode(phone);
      setPhone(normalized);
      await refreshUser?.();
      notify(
        'Kod wysłany',
        'Sprawdź SMS. Lokalnie kod zobaczysz w terminalu Django (SMS console).',
      );
      setStep('code');
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się wysłać kodu.');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (code.trim().length !== 6) {
      notify('Kod', 'Wpisz 6-cyfrowy kod z SMS.');
      return;
    }
    try {
      setLoading(true);
      const updated = await verifyPhoneCode(code, phone);
      if (updateUser && updated) {
        await updateUser(updated);
      } else {
        await refreshUser?.();
      }
      notify('Gotowe', 'Numer telefonu został potwierdzony.');
      goBackToApp(router, '/(tabs)/account');
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się potwierdzić numeru.');
    } finally {
      setLoading(false);
    }
  };

  const verified = Boolean(user?.phone_verified || user?.phone_verified_at);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackToApp(router, '/(tabs)/account')} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Numer telefonu</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.icon}>
          <Ionicons name="call-outline" size={40} color={Colors.light.accent} />
        </View>
        {verified ? (
          <>
            <Text style={styles.ok}>Numer potwierdzony</Text>
            <Text style={styles.subtitle}>{user?.phone_number}</Text>
            <TouchableOpacity style={styles.secondary} onPress={() => setStep('phone')}>
              <Text style={styles.secondaryText}>Zmień numer</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {(!verified || step === 'phone') && step === 'phone' ? (
          <>
            <Text style={styles.subtitle}>
              Podaj numer — wyślemy SMS z kodem. Format: 500600700 lub +48…
            </Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+48 500 000 000"
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <TouchableOpacity style={styles.button} onPress={sendCode} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Wyślij kod SMS</Text>}
            </TouchableOpacity>
          </>
        ) : null}

        {step === 'code' && !verified ? (
          <>
            <Text style={styles.subtitle}>Kod wysłany na {phone}</Text>
            <TextInput
              style={[styles.input, styles.code]}
              value={code}
              onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />
            <TouchableOpacity style={styles.button} onPress={confirm} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Potwierdź numer</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={sendCode} disabled={loading}>
              <Text style={styles.secondaryText}>Wyślij ponownie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondary} onPress={() => setStep('phone')}>
              <Text style={styles.secondaryText}>Zmień numer</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  back: { padding: 4 },
  title: { fontSize: 20, fontWeight: '900', color: Colors.light.text },
  card: {
    margin: 20, padding: 24, borderRadius: 24, backgroundColor: '#fff',
  },
  icon: {
    width: 72, height: 72, borderRadius: 22, alignSelf: 'center', marginBottom: 16,
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF',
  },
  ok: { textAlign: 'center', fontSize: 18, fontWeight: '900', color: '#059669', marginBottom: 6 },
  subtitle: {
    textAlign: 'center', color: Colors.light.textSecondary, lineHeight: 20, marginBottom: 18,
  },
  input: {
    height: 52, borderRadius: 14, paddingHorizontal: 16, marginBottom: 12,
    backgroundColor: '#F1F5F9', color: Colors.light.text,
  },
  code: { fontSize: 24, fontWeight: '800', letterSpacing: 8 },
  button: {
    height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.light.accent, marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: '800' },
  secondary: { alignItems: 'center', padding: 12, marginTop: 4 },
  secondaryText: { color: Colors.light.accent, fontWeight: '700' },
});
