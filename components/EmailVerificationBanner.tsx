import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { resendVerificationCode, verifyEmail } from '../api/verification';
import { useAuth } from '../contexts/AuthContext';
import { notify } from '../utils/notify';

const RESEND_COOLDOWN_SEC = 60;

export function EmailVerificationBanner() {
  const insets = useSafeAreaInsets();
  const { user, isLoggedIn, refreshUser } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const needsVerification =
    isLoggedIn &&
    !!user?.email &&
    !user.email_verified &&
    !user.email_verified_at;

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!needsVerification) return null;

  const submitCode = async () => {
    if (code.trim().length !== 6) {
      notify('Kod', 'Wpisz 6-cyfrowy kod z e-maila.');
      return;
    }
    try {
      setLoading(true);
      await verifyEmail({ email: user?.email || '', code: code.trim() });
      await refreshUser();
      setCode('');
      notify('Gotowe', 'Adres e-mail został potwierdzony.');
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się potwierdzić e-maila.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || !user?.email) return;
    try {
      setResending(true);
      await resendVerificationCode(user.email);
      setCooldown(RESEND_COOLDOWN_SEC);
      notify('Wysłano', 'Nowy kod trafił na Twoją skrzynkę.');
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się wysłać kodu.');
    } finally {
      setResending(false);
    }
  };

  return (
    <View
      style={[
        styles.wrap,
        { paddingTop: Math.max(insets.top, Platform.OS === 'web' ? 12 : 8) },
      ]}
    >
      <Text style={styles.title}>Potwierdź adres e-mail</Text>
      <Text style={styles.subtitle}>
        Konto nie jest potwierdzone — bez tego nie umówisz wizyty. Kod wysłaliśmy na{' '}
        {user?.email}.
      </Text>
      <View style={styles.row}>
        <TextInput
          style={styles.codeInput}
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          placeholderTextColor="#FDE68A"
          keyboardType="number-pad"
          maxLength={6}
          textAlign="center"
        />
        <TouchableOpacity style={styles.confirmBtn} onPress={submitCode} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <Text style={styles.confirmText}>Potwierdź</Text>
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.resendBtn}
        onPress={resend}
        disabled={resending || cooldown > 0}
      >
        <Text style={[styles.resendText, (resending || cooldown > 0) && styles.resendDisabled]}>
          {cooldown > 0
            ? `Wyślij ponownie za ${cooldown}s`
            : resending
              ? 'Wysyłanie…'
              : 'Wyślij kod ponownie'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#92400E',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#B45309',
    zIndex: 50,
  },
  title: {
    color: '#FFFBEB',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#FDE68A',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.22)',
    color: '#FFFBEB',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 6,
    paddingHorizontal: 12,
  },
  confirmBtn: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FBBF24',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
  },
  confirmText: {
    color: '#111827',
    fontWeight: '800',
    fontSize: 14,
  },
  resendBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  resendText: {
    color: '#FFFBEB',
    fontWeight: '700',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  resendDisabled: {
    opacity: 0.55,
    textDecorationLine: 'none',
  },
});
