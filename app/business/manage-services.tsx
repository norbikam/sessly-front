import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getMyServices, addService, deleteService } from '../../api/business';
import { Service } from '../../types/api';
import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';

export default function ManageServicesScreen() {
  // ✅ POBIERAMY SLUG BEZPOŚREDNIO Z ZALOGOWANEGO UŻYTKOWNIKA (OMIJAMY BŁĄD BACKENDU)
  const { user } = useAuth();
  const businessSlug = (user as any)?.business?.slug || (user as any)?.business?.id;

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');

  useEffect(() => { 
    if (businessSlug) {
      loadData(); 
    } else {
      setLoading(false);
    }
  }, [businessSlug]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Używamy prawdziwego sluga z profilu, zamiast "/my-business/"
      const data = await getMyServices(businessSlug);
      
      if (Array.isArray(data)) {
        setServices(data);
      } else if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
        setServices((data as any).results);
      } else {
        setServices([]);
      }
    } catch (e: any) {
      console.error("Błąd ładowania usług:", e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name || !price || !duration) {
      Alert.alert('Brak danych', 'Wypełnij nazwę, cenę oraz czas trwania usługi.');
      return;
    }
    
    if (!businessSlug) {
      Alert.alert('Błąd', 'Nie masz przypisanego salonu do tego konta.');
      return;
    }

    const formattedPrice = parseFloat(price.replace(',', '.'));
    
    if (isNaN(formattedPrice)) {
      Alert.alert('Błąd', 'Cena musi być poprawną liczbą (np. 50 lub 50.50).');
      return;
    }
    
    try {
      setSubmitting(true);
      await addService(businessSlug, {
        name: name.trim(),
        price_amount: formattedPrice,
        duration_minutes: parseInt(duration, 10) || 60,
      });
      
      setName(''); 
      setPrice('');
      setDuration('60');
      
      Alert.alert('Sukces', 'Usługa została pomyślnie dodana!');
      loadData(); 
    } catch (e: any) {
      console.error("Błąd dodawania:", e?.response?.data || e.message);
      Alert.alert(
        'Nie udało się dodać usługi', 
        e?.response?.data ? JSON.stringify(e.response.data) : 'Sprawdź połączenie z serwerem.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (id: string | number) => {
    Alert.alert('Usuwanie', 'Czy na pewno chcesz usunąć tę usługę ze swojej oferty?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => handleRemove(id) }
    ]);
  };

  const handleRemove = async (id: string | number) => {
    if (!businessSlug) return;
    try {
      await deleteService(businessSlug, String(id));
      loadData();
    } catch (e: any) {
      Alert.alert('Błąd', 'Nie udało się usunąć usługi.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Cennik i Usługi</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Nowa usługa</Text>
          
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Nazwa usługi</Text>
            <TextInput 
              style={styles.input} 
              placeholder="np. Strzyżenie Męskie" 
              value={name} 
              onChangeText={setName} 
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputWrapper, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Cena (PLN)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="0.00" 
                keyboardType="numeric" 
                value={price} 
                onChangeText={setPrice} 
              />
            </View>
            <View style={[styles.inputWrapper, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Czas (Min)</Text>
              <TextInput 
                style={styles.input} 
                placeholder="60" 
                keyboardType="numeric" 
                value={duration} 
                onChangeText={setDuration} 
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.addBtn, submitting && styles.addBtnDisabled]} 
            onPress={handleAdd} 
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#fff" />
                <Text style={styles.addBtnText}>Dodaj do oferty</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { marginLeft: 4, marginBottom: 12 }]}>Moje usługi</Text>
        
        {loading && services.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.accent} />
            <Text style={styles.loadingText}>Ładowanie usług...</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>Nie masz jeszcze żadnych usług.</Text>
            <Text style={styles.emptySubtext}>Uzupełnij formularz powyżej, aby dodać swoją pierwszą pozycję do cennika.</Text>
          </View>
        ) : (
          services.map((item) => (
            <View key={String(item.id)} style={styles.serviceItem}>
              <View style={styles.serviceIconContainer}>
                <Ionicons name="cut-outline" size={20} color={Colors.light.accent} />
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{item.name}</Text>
                <View style={styles.serviceMeta}>
                  <Text style={styles.serviceMetaText}>
                    <Ionicons name="time-outline" size={14} /> {item.duration_minutes} min
                  </Text>
                  <View style={styles.dot} />
                  <Text style={styles.serviceMetaTextBold}>
                    {item.price_amount !== undefined && item.price_amount !== null ? Number(item.price_amount).toFixed(2) : '0.00'} PLN
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.deleteBtn}
                onPress={() => confirmDelete(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
    zIndex: 10
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  
  scrollContent: { padding: 20, paddingBottom: 100 },
  
  loadingContainer: { alignItems: 'center', marginTop: 40 },
  loadingText: { marginTop: 12, color: Colors.light.textSecondary, fontWeight: '500' },
  
  formCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 20, 
    marginBottom: 24,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.light.text, marginBottom: 16 },
  inputWrapper: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: Colors.light.textSecondary, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
  input: { 
    backgroundColor: '#F1F5F9', 
    paddingHorizontal: 16, 
    height: 50, 
    borderRadius: 14, 
    fontSize: 15,
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  row: { flexDirection: 'row', gap: 12 },
  addBtn: { 
    flexDirection: 'row',
    backgroundColor: Colors.light.accent, 
    height: 50, 
    borderRadius: 14, 
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
    shadowColor: Colors.light.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4
  },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  serviceItem: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
  },
  serviceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14
  },
  serviceInfo: { flex: 1, paddingRight: 10 },
  serviceName: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center' },
  serviceMetaText: { color: Colors.light.textSecondary, fontSize: 13, fontWeight: '500' },
  serviceMetaTextBold: { color: Colors.light.text, fontSize: 13, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 8 },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center'
  },
  
  emptyContainer: { alignItems: 'center', marginTop: 20, padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 16, fontSize: 16, fontWeight: '800', color: Colors.light.text },
  emptySubtext: { textAlign: 'center', marginTop: 8, color: Colors.light.textSecondary, lineHeight: 20 }
});