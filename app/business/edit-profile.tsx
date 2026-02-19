import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '@/components/ui/Input'; // Twój komponent
import { getMyBusiness, updateBusinessProfile } from '@/api/business';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    website_url: '',
    phone_number: '',
    address_line1: '',
    city: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await getMyBusiness();
      setForm({
        name: data.name || '',
        description: data.description || '',
        website_url: data.website_url || '',
        phone_number: data.phone_number || '',
        address_line1: data.address_line1 || '',
        city: data.city || '',
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Błąd', 'Nie udało się pobrać danych firmy.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateBusinessProfile(form);
      await refreshUser(); // Odśwież context, jeśli nazwa się zmieniła
      Alert.alert('Sukces', 'Profil zaktualizowany');
      router.back();
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zapisać zmian.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <ActivityIndicator style={{flex: 1}} />;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Edytuj Profil</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Podstawowe</Text>
        <Input 
          label="Nazwa firmy" 
          value={form.name} 
          onChangeText={(v) => setForm({...form, name: v})} 
        />
        <Input 
          label="Opis działalności" 
          value={form.description} 
          onChangeText={(v) => setForm({...form, description: v})} 
          multiline
          style={{ height: 80, textAlignVertical: 'top' }}
        />

        <Text style={styles.sectionTitle}>Kontakt</Text>
        <Input 
          label="Telefon" 
          icon="call-outline"
          value={form.phone_number} 
          keyboardType="phone-pad"
          onChangeText={(v) => setForm({...form, phone_number: v})} 
        />
        <Input 
          label="Strona WWW" 
          icon="globe-outline"
          value={form.website_url} 
          autoCapitalize="none"
          keyboardType="url"
          onChangeText={(v) => setForm({...form, website_url: v})} 
        />

        <Text style={styles.sectionTitle}>Adres</Text>
        <Input 
          label="Ulica i numer" 
          icon="location-outline"
          value={form.address_line1} 
          onChangeText={(v) => setForm({...form, address_line1: v})} 
        />
        <Input 
          label="Miasto" 
          value={form.city} 
          onChangeText={(v) => setForm({...form, city: v})} 
        />

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Zapisz zmiany</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, 
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' 
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 10, color: '#666' },
  saveButton: { 
    backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, marginBottom: 40 
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});