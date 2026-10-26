import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import Colors from '../../constants/Colors';
import { lookupBusinessRegistry, updateBusinessProfile, UploadAsset } from '../../api/business';
import { notify } from '../../utils/notify';
import { useLocation } from '../../contexts/LocationContext';

const BRAND_COLORS = [
  '#8B5CF6', '#6366F1', '#2563EB', '#0891B2',
  '#059669', '#65A30D', '#D97706', '#DC2626',
  '#DB2777', '#7C3AED', '#475569', '#18181B',
];

export default function EditBusinessProfileScreen() {
  const { activeLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lookingUpNip, setLookingUpNip] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Formularz danych
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [nip, setNip] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoAsset, setLogoAsset] = useState<UploadAsset | null>(null);
  const [brandColor, setBrandColor] = useState('#8B5CF6');
  
  // Adres
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [depositPercent, setDepositPercent] = useState('0');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Zamiast szukać w pamięci telefonu, odpytujemy bezpośrednio endpoint dla właścicieli:
      const response = await apiClient.get('/businesses/my-business/');
      
      let data = response.data;
      if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
        data = (data as any).results;
      }

      if (!Array.isArray(data) || data.length === 0) {
        Alert.alert('Błąd', 'Do Twojego konta nie jest przypisany żaden salon.');
        router.back();
        return;
      }

      const business = data.find(
        (item: any) => String(item.id) === activeLocation?.id || item.slug === activeLocation?.slug
      ) || data[0];

      // 2. Bezpiecznie zapisujemy PRAWDZIWE ID z bazy danych
      setBusinessId(String(business.id));

      setName(business.name || '');
      setDescription(business.description || '');
      setPhone(business.phone_number || '');
      setWebsite(business.website_url || '');
      setNip(business.nip || '');
      setLogoUrl(business.logo_url || '');
      setBrandColor(BRAND_COLORS.includes(business.brand_color) ? business.brand_color : '#8B5CF6');
      
      setAddress(business.address_line1 || '');
      setCity(business.city || '');
      setPostalCode(business.postal_code || '');
      setDepositPercent(
        business.deposit_percent != null ? String(business.deposit_percent) : '0'
      );
      
    } catch (e) {
      console.error('Błąd pobierania wizytówki:', e);
      Alert.alert('Błąd', 'Nie udało się pobrać aktualnych danych salonu z serwera.');
    } finally {
      setLoading(false);
    }
  }, [activeLocation?.id, activeLocation?.slug]);

  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  const handleNipLookup = async () => {
    try {
      setLookingUpNip(true);
      const company = await lookupBusinessRegistry(nip);
      setNip(company.nip);
      setName(company.name || name);
      setAddress(company.address_line1 || company.address || address);
      if (company.city) setCity(company.city);
      if (company.postal_code) setPostalCode(company.postal_code);
      notify('Znaleziono firmę', company.regon ? `REGON: ${company.regon}` : 'Dane zostały uzupełnione.');
    } catch (error: any) {
      const message = error?.response?.data?.error?.message
        || error?.response?.data?.detail
        || 'Nie udało się pobrać danych firmy.';
      notify('Błąd wyszukiwania', message);
    } finally {
      setLookingUpNip(false);
    }
  };

  const handlePickLogo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Brak dostępu', 'Zezwól aplikacji na dostęp do zdjęć.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled) setLogoAsset(result.assets[0]);
  };

  const handleSave = async () => {
    if (!name || !phone || !address || !city) {
      Alert.alert('Brak danych', 'Uzupełnij wymagane pola (Nazwa, Telefon, Ulica, Miasto).');
      return;
    }
    
    if (!businessId) {
      Alert.alert('Błąd krytyczny', 'Brakuje identyfikatora biznesu. Odśwież stronę.');
      return;
    }

    // Bezpieczeństwo dla URL (Django rzuca błędem, gdy brakuje http/https)
    let safeWebsite = website.trim();
    if (safeWebsite && !safeWebsite.startsWith('http://') && !safeWebsite.startsWith('https://')) {
      safeWebsite = 'https://' + safeWebsite;
    }

    try {
      setSaving(true);
      
      const depositValue = Math.min(
        100,
        Math.max(0, Number(String(depositPercent).replace(',', '.')) || 0)
      );

      const payload = {
        name: name.trim(),
        description: description.trim(),
        phone_number: phone.trim(),
        website_url: safeWebsite,
        nip: nip.trim(),
        brand_color: brandColor,
        address_line1: address.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
        deposit_percent: depositValue,
      };

      await updateBusinessProfile(businessId, payload, logoAsset);

      notify('Sukces!', 'Wizytówka Twojego salonu została pomyślnie zaktualizowana.');
      router.back();
    } catch (e: any) {
      console.error('Błąd zapisu:', e?.response?.data || e);
      notify(
        'Błąd zapisu', 
        e?.response?.data ? JSON.stringify(e.response.data) : 'Sprawdź połączenie z serwerem.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
        <Text style={styles.loadingText}>Ładowanie danych...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Edytuj Wizytówkę</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Podstawowe Informacje</Text>
          
          <Text style={styles.inputLabel}>Nazwa Salonu *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="np. Barber Shop XYZ" />

          <Text style={styles.inputLabel}>Opis (O firmie)</Text>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={description} 
            onChangeText={setDescription} 
            placeholder="Napisz kilka słów o swoim salonie, żeby przyciągnąć klientów..." 
            multiline 
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Kontakt i Rozliczenia</Text>
          
          <Text style={styles.inputLabel}>Telefon kontaktowy *</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="np. 123 456 789" />

          <Text style={styles.inputLabel}>Strona WWW / Social Media</Text>
          <TextInput style={styles.input} value={website} onChangeText={setWebsite} keyboardType="url" autoCapitalize="none" placeholder="https://twojastrona.pl" />

          <Text style={styles.inputLabel}>NIP (Opcjonalnie)</Text>
          <View style={styles.nipRow}>
            <TextInput
              style={[styles.input, styles.nipInput]}
              value={nip}
              onChangeText={setNip}
              keyboardType="numeric"
              placeholder="Twój NIP"
              maxLength={13}
            />
            <TouchableOpacity
              style={styles.lookupButton}
              onPress={handleNipLookup}
              disabled={lookingUpNip}
            >
              {lookingUpNip
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.lookupButtonText}>Pobierz dane</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Zaliczka przy rezerwacji (%)</Text>
          <TextInput
            style={styles.input}
            value={depositPercent}
            onChangeText={setDepositPercent}
            keyboardType="decimal-pad"
            placeholder="0 = wyłączone, np. 30"
          />
          <Text style={styles.hint}>
            Klient płaci ten procent ceny usługi po rezerwacji. 0 wyłącza zaliczki.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Wygląd wizytówki</Text>

          <Text style={styles.inputLabel}>Logo</Text>
          <TouchableOpacity style={styles.logoPicker} onPress={handlePickLogo}>
            {logoAsset || logoUrl ? (
              <Image source={{ uri: logoAsset?.uri || logoUrl }} style={styles.logoPreview} contentFit="cover" />
            ) : (
              <Ionicons name="image-outline" size={34} color={Colors.light.accent} />
            )}
            <View style={styles.logoPickerText}>
              <Text style={styles.logoPickerTitle}>{logoAsset || logoUrl ? 'Zmień logo' : 'Wybierz logo'}</Text>
              <Text style={styles.logoPickerHint}>Kwadratowe zdjęcie, maks. 8 MB</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.inputLabel}>Kolor profilu</Text>
          <View style={styles.colorGrid}>
            {BRAND_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  brandColor === color && styles.colorOptionSelected,
                ]}
                onPress={() => setBrandColor(color)}
                accessibilityLabel={`Wybierz kolor ${color}`}
              >
                {brandColor === color ? <Ionicons name="checkmark" size={22} color="#fff" /> : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Lokalizacja</Text>
          
          <Text style={styles.inputLabel}>Ulica i numer *</Text>
          <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="np. Kwiatowa 12/4" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Kod pocztowy</Text>
              <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} placeholder="00-000" />
            </View>
            <View style={{ flex: 2 }}>
              <Text style={styles.inputLabel}>Miasto *</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="np. Warszawa" />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]} 
          onPress={handleSave} 
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Zapisz Zmiany</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: Colors.light.textSecondary, fontWeight: '500' },
  
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  formCard: { 
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16,
    shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: Colors.light.text, marginBottom: 16 },
  
  inputLabel: { fontSize: 12, fontWeight: '700', color: Colors.light.textSecondary, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
  input: { 
    backgroundColor: '#F1F5F9', paddingHorizontal: 16, height: 50, borderRadius: 14, 
    fontSize: 15, color: Colors.light.text, marginBottom: 16
  },
  textArea: { height: 100, paddingTop: 14, paddingBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  nipRow: { flexDirection: 'row', gap: 10 },
  nipInput: { flex: 1 },
  lookupButton: {
    height: 50, paddingHorizontal: 16, borderRadius: 14, backgroundColor: Colors.light.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  lookupButtonText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  hint: { fontSize: 12, color: '#64748B', marginTop: -8, marginBottom: 12, marginLeft: 4, lineHeight: 16 },
  logoPicker: { flexDirection: 'row', alignItems: 'center', minHeight: 88, padding: 12, marginBottom: 16, borderRadius: 16, borderWidth: 1, borderColor: '#DDD6FE', backgroundColor: '#FAF5FF' },
  logoPreview: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#EDE9FE' },
  logoPickerText: { flex: 1, marginLeft: 14 },
  logoPickerTitle: { color: Colors.light.accent, fontWeight: '800', fontSize: 15 },
  logoPickerHint: { color: '#64748B', fontSize: 12, marginTop: 4 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorOption: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  colorOptionSelected: { borderWidth: 3, borderColor: '#E2E8F0', transform: [{ scale: 1.08 }] },

  saveBtn: { 
    backgroundColor: Colors.light.accent, height: 54, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center', marginTop: 10,
    shadowColor: Colors.light.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});