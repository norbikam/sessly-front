import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getMyServices, addService, deleteService } from '../../api/business';
import { Service } from '../../types/api';
import Colors from '../../constants/Colors';

export default function ManageServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('60');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getMyServices();
      setServices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!name || !price) {
      Alert.alert('Błąd', 'Wypełnij nazwę i cenę.');
      return;
    }
    try {
      setSubmitting(true);
      await addService({
        name,
        price_amount: price,
        duration_minutes: parseInt(duration)
      });
      setName(''); setPrice('');
      Alert.alert('Sukces', 'Usługa została dodana!');
      loadData();
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się dodać usługi.');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (id: number) => {
    Alert.alert('Usuń', 'Czy na pewno chcesz usunąć tę usługę?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => handleRemove(id) }
    ]);
  };

  const handleRemove = async (id: number) => {
    try {
      await deleteService(id);
      loadData();
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się usunąć usługi.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Moje Usługi</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Dodaj nową usługę</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Nazwa usługi" 
          value={name} 
          onChangeText={setName} 
        />
        <View style={styles.row}>
          <TextInput 
            style={[styles.input, { flex: 1 }]} 
            placeholder="Cena (PLN)" 
            keyboardType="numeric" 
            value={price} 
            onChangeText={setPrice} 
          />
          <TextInput 
            style={[styles.input, { flex: 1 }]} 
            placeholder="Czas (min)" 
            keyboardType="numeric" 
            value={duration} 
            onChangeText={setDuration} 
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.addBtnText}>Dodaj Usługę</Text>}
        </TouchableOpacity>
      </View>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ padding: 20 }}
        renderItem={({ item }) => (
          <View style={styles.serviceItem}>
            <View>
              <Text style={styles.serviceName}>{item.name}</Text>
              <Text style={styles.serviceDetails}>
                {(item as any).duration_minutes || item.duration} min • {(item as any).price_amount || item.price} PLN
              </Text>
            </View>
            <TouchableOpacity onPress={() => confirmDelete(Number(item.id))}>
              <Ionicons name="trash-outline" size={22} color="#e74c3c" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>Brak aktywnych usług.</Text> : null}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold' },
  formCard: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  label: { fontSize: 12, fontWeight: 'bold', color: '#999', marginBottom: 10, textTransform: 'uppercase' },
  input: { backgroundColor: '#f0f2f5', padding: 12, borderRadius: 10, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  addBtn: { backgroundColor: Colors.accent, padding: 15, borderRadius: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  serviceItem: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#eee' },
  serviceName: { fontSize: 16, fontWeight: 'bold' },
  serviceDetails: { color: '#666', marginTop: 4 },
  empty: { textAlign: 'center', marginTop: 30, color: '#999', fontStyle: 'italic' }
});