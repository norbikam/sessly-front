import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { SUPPORT_EMAIL } from '../../constants/config';

export default function DeleteAccountScreen() {
  const { user, logout } = useAuth();
  const isOwner = user?.role === 'business_owner';
  const [password, setPassword] = useState('');
  const [confirmBusiness, setConfirmBusiness] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const confirmDelete = () => {
    if (!password.trim()) {
      const msg = 'Podaj hasło, aby potwierdzić usunięcie konta.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Hasło wymagane', msg);
      return;
    }
    if (isOwner && !confirmBusiness) {
      const msg =
        'Zaznacz potwierdzenie usunięcia firmy i lokalizacji — bez tego nie usuniemy konta właściciela.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Potwierdzenie wymagane', msg);
      return;
    }

    const title = 'Usunąć konto na zawsze?';
    const body = isOwner
      ? 'Usuniemy konto właściciela oraz powiązane lokale, usługi, grafik i dane firmy. Klienci stracą historię wizyt w tych lokalach. Tej operacji nie da się cofnąć.'
      : 'Usuniemy Twoje dane logowania. Historia wizyt u salonów może zostać zanonimizowana. Tej operacji nie da się cofnąć.';

    if (Platform.OS === 'web') {
      if (window.confirm(`${title}\n\n${body}`)) void performDelete();
      return;
    }
    Alert.alert(title, body, [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń konto', style: 'destructive', onPress: () => void performDelete() },
    ]);
  };

  const performDelete = async () => {
    try {
      setSubmitting(true);
      await apiClient.delete('/users/me/', {
        data: {
          password,
          delete_business_data: isOwner ? true : undefined,
        },
      });
      await logout();
      router.replace('/(auth)/login');
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        `Nie udało się usunąć konta. Napisz na ${SUPPORT_EMAIL}.`;
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Błąd', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Usuń konto</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Ionicons name="warning-outline" size={36} color="#DC2626" />
          <Text style={styles.heading}>To działanie jest nieodwracalne</Text>
          <Text style={styles.copy}>
            Zgodnie z RODO i wymaganiami sklepów możesz usunąć konto w aplikacji. Po
            usunięciu nie zalogujesz się tym samym adresem e-mail bez ponownej rejestracji.
          </Text>

          {isOwner ? (
            <TouchableOpacity
              style={styles.confirmRow}
              onPress={() => setConfirmBusiness((v) => !v)}
            >
              <View style={[styles.checkbox, confirmBusiness && styles.checkboxOn]}>
                {confirmBusiness ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
              <Text style={styles.confirmText}>
                Rozumiem, że usunięcie konta właściciela trwale usuwa lokale, usługi,
                grafik i dane organizacji w Sessly.
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.label}>Hasło</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Potwierdź hasłem"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.deleteBtn, submitting && styles.disabled]}
            onPress={confirmDelete}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.deleteText}>Usuń moje konto</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  scroll: { paddingBottom: 40 },
  card: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'flex-start',
  },
  heading: { fontSize: 18, fontWeight: '800', color: '#111', marginTop: 12 },
  copy: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 16,
  },
  confirmRow: { flexDirection: 'row', gap: 10, marginBottom: 16, alignItems: 'flex-start' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  confirmText: { flex: 1, fontSize: 13, color: '#334155', lineHeight: 18 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.light.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  deleteBtn: {
    width: '100%',
    backgroundColor: '#DC2626',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.6 },
  deleteText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
