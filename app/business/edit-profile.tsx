import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import Colors from '../../constants/Colors';

export default function EditBusinessProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  // Formularz danych
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [nip, setNip] = useState('');
  
  // Adres
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
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

      const business = data[0]; // Bierzemy pierwszy (Twój) salon z listy

      // 2. Bezpiecznie zapisujemy PRAWDZIWE ID z bazy danych
      setBusinessId(String(business.id));

      setName(business.name || '');
      setDescription(business.description || '');
      setPhone(business.phone_number || '');
      setWebsite(business.website_url || '');
      setNip(business.nip || '');
      
      setAddress(business.address_line1 || '');
      setCity(business.city || '');
      setPostalCode(business.postal_code || '');
      
    } catch (e) {
      console.error('Błąd pobierania wizytówki:', e);
      Alert.alert('Błąd', 'Nie udało się pobrać aktualnych danych salonu z serwera.');
    } finally {
      setLoading(false);
    }
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
      
      const payload = {
        name: name.trim(),
        description: description.trim(),
        phone_number: phone.trim(),
        website_url: safeWebsite,
        nip: nip.trim(),
        address_line1: address.trim(),
        city: city.trim(),
        postal_code: postalCode.trim(),
      };

      // 3. Uderzamy precyzyjnie w endpoint PATCH z konkretnym, potwierdzonym ID
      await apiClient.patch(`/businesses/my-business/${businessId}/`, payload);

      Alert.alert('Sukces!', 'Wizytówka Twojego salonu została pomyślnie zaktualizowana.');
      router.back();
    } catch (e: any) {
      console.error('Błąd zapisu:', e?.response?.data || e);
      Alert.alert(
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
          <TextInput style={styles.input} value={nip} onChangeText={setNip} keyboardType="numeric" placeholder="Twój NIP" />
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

  saveBtn: { 
    backgroundColor: Colors.light.accent, height: 54, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center', marginTop: 10,
    shadowColor: Colors.light.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});