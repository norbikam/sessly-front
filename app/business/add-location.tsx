import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { createBusiness } from '../../api/business';
import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { notify } from '../../utils/notify';

const CATEGORIES = [
  { label: 'Fryzjer', value: 'hairdresser' },
  { label: 'Uroda i Kosmetyka', value: 'beauty' },
  { label: 'Lekarz / Specjalista', value: 'doctor' },
  { label: 'SPA & Masaż', value: 'spa' },
  { label: 'Inne', value: 'other' },
];

function FormField({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} style={[styles.input, style]} placeholderTextColor="#64748B" />
    </View>
  );
}

export default function AddLocationScreen() {
  const { user } = useAuth();
  const { refreshLocations, selectLocation } = useLocation();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('hairdresser');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [saving, setSaving] = useState(false);

  const billing = useMemo(() => {
    const org = user?.organization;
    if (!org) return null;
    const street = (org.legal_address_line1 || '').trim();
    const billingCity = (org.legal_city || '').trim();
    const postal = (org.legal_postal_code || '').trim();
    if (!street && !billingCity) return null;
    return {
      street,
      city: billingCity,
      postal,
      phone: (org.phone_number || '').trim(),
      label: [street, [postal, billingCity].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    };
  }, [user?.organization]);

  const useBillingAddress = () => {
    if (!billing) return;
    setAddress(billing.street);
    setCity(billing.city);
    setZip(billing.postal);
    if (!phone.trim() && billing.phone) setPhone(billing.phone);
    notify('Adres uzupełniony', 'Skopiowaliśmy adres rozliczeniowy firmy. Możesz go jeszcze zmienić.');
  };

  const save = async () => {
    if (!name.trim() || !phone.trim() || !address.trim() || !city.trim()) {
      Alert.alert('Brak danych', 'Podaj nazwę, telefon, ulicę i miasto miejsca.');
      return;
    }
    try {
      setSaving(true);
      const created = await createBusiness({
        name: name.trim(),
        category: category as any,
        phone_number: phone.trim(),
        address_line1: address.trim(),
        city: city.trim(),
        postal_code: zip.trim() || '00-000',
        country: 'Polska',
        // NIP należy do firmy (organizacji), nie do pojedynczego miejsca.
        nip: user?.organization?.nip || undefined,
      });
      await refreshLocations();
      if (created?.id) await selectLocation(String(created.id));
      notify('Miejsce dodane', created.name);
      router.replace('/(tabs)' as any);
    } catch (error: any) {
      Alert.alert('Nie udało się dodać miejsca', error?.response?.data ? JSON.stringify(error.response.data) : error?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Nowe miejsce</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Podaj adres, pod którym przyjmujesz klientów. NIP i dane rozliczeniowe masz już przy firmie — tutaj chodzi tylko o lokalizację usług.
        </Text>
        <FormField label="Nazwa miejsca *" placeholder="np. Studio Urody Centrum" value={name} onChangeText={setName} />
        <Text style={styles.label}>Kategoria</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
          {CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.chip, category === item.value && styles.chipActive]}
              onPress={() => setCategory(item.value)}
            >
              <Text style={[styles.chipText, category === item.value && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <FormField label="Telefon do miejsca *" placeholder="+48 500 000 000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

        <View style={styles.addressHeader}>
          <Text style={styles.sectionLabel}>Adres miejsca usług</Text>
          {billing ? (
            <TouchableOpacity style={styles.copyBtn} onPress={useBillingAddress}>
              <Ionicons name="copy-outline" size={16} color={Colors.light.accent} />
              <Text style={styles.copyBtnText}>Jak adres rozliczeniowy</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {billing ? (
          <Text style={styles.billingHint}>
            Firma: {billing.label}. Kliknij powyżej, jeśli klienci przychodzą pod ten sam adres.
          </Text>
        ) : null}

        <FormField label="Ulica i numer *" placeholder="ul. Przykładowa 10" value={address} onChangeText={setAddress} />
        <View style={styles.row}>
          <View style={{ flex: 2 }}><FormField label="Miasto *" placeholder="Warszawa" value={city} onChangeText={setCity} /></View>
          <View style={{ flex: 1 }}><FormField label="Kod" placeholder="00-000" value={zip} onChangeText={setZip} /></View>
        </View>
        <TouchableOpacity style={styles.save} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Dodaj miejsce</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  content: { padding: 20, paddingBottom: 40 },
  hint: { color: '#64748B', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '800', color: '#334155', marginBottom: 6 },
  sectionLabel: { fontSize: 13, fontWeight: '800', color: Colors.light.text },
  input: { backgroundColor: '#fff', height: 50, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E2E8F0', fontSize: 15, color: '#0F172A' },
  addressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8, marginTop: 4 },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE',
  },
  copyBtnText: { color: Colors.light.accent, fontWeight: '800', fontSize: 12 },
  billingHint: { color: '#64748B', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: '#F1F5F9' },
  chipActive: { backgroundColor: '#EDE9FE' },
  chipText: { color: '#64748B', fontWeight: '700' },
  chipTextActive: { color: Colors.light.accent },
  row: { flexDirection: 'row', gap: 12 },
  save: { height: 54, borderRadius: 16, backgroundColor: Colors.light.accent, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
