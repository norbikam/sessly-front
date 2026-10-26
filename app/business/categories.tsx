import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { addServiceCategory, deleteServiceCategory, getServiceCategories } from '../../api/business';
import { ServiceCategory } from '../../types/api';
import Colors from '../../constants/Colors';
import { useLocation } from '../../contexts/LocationContext';

const COLORS = ['#8B5CF6', '#2563EB', '#059669', '#D97706', '#DC2626', '#DB2777'];

export default function CategoriesScreen() {
  const { activeLocation } = useLocation();
  const businessSlug = activeLocation?.slug;
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!businessSlug) return setLoading(false);
    try {
      setCategories(await getServiceCategories(businessSlug));
    } finally {
      setLoading(false);
    }
  }, [businessSlug]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!businessSlug || !name.trim()) return;
    try {
      setSaving(true);
      const category = await addServiceCategory(businessSlug, {
        name: name.trim(),
        color,
        sort_order: categories.length,
      });
      setCategories((current) => [...current, category]);
      setName('');
    } catch {
      Alert.alert('Błąd', 'Nie udało się utworzyć kategorii.');
    } finally {
      setSaving(false);
    }
  };

  const remove = (category: ServiceCategory) => {
    if (!businessSlug) return;
    Alert.alert('Usuń kategorię?', 'Usługi pozostaną w ofercie bez kategorii.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          await deleteServiceCategory(businessSlug, category.id);
          setCategories((current) => current.filter((item) => item.id !== category.id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Kategorie usług</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Nowa kategoria</Text>
          <TextInput style={styles.input} placeholder="np. Koloryzacja" value={name} onChangeText={setName} />
          <View style={styles.colors}>
            {COLORS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.colorDot, { backgroundColor: item }, color === item && styles.colorDotActive]}
                onPress={() => setColor(item)}
              />
            ))}
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={add} disabled={saving || !name.trim()}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Dodaj kategorię</Text>}
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.light.accent} />
        ) : categories.length === 0 ? (
          <Text style={styles.empty}>Nie masz jeszcze kategorii.</Text>
        ) : (
          categories.map((category) => (
            <View key={category.id} style={styles.item}>
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              <Text style={styles.itemName}>{category.name}</Text>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => remove(category)}>
                <Ionicons name="trash-outline" size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
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
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: Colors.light.text, marginBottom: 12 },
  input: { backgroundColor: '#F1F5F9', height: 50, borderRadius: 14, paddingHorizontal: 16, fontSize: 15, color: Colors.light.text },
  colors: { flexDirection: 'row', gap: 10, marginTop: 14, marginBottom: 16 },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: '#1E293B' },
  saveBtn: { height: 50, borderRadius: 14, backgroundColor: Colors.light.accent, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#fff', fontWeight: '800' },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 20 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  itemName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B' },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
});
