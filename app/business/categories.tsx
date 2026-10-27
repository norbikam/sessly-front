import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  addServiceCategory,
  deleteServiceCategory,
  getServiceCategories,
  updateServiceCategory,
} from '../../api/business';
import { ServiceCategory } from '../../types/api';
import Colors from '../../constants/Colors';
import { useLocation } from '../../contexts/LocationContext';

const COLORS = ['#8B5CF6', '#2563EB', '#059669', '#D97706', '#DC2626', '#DB2777'];

const confirmAction = (title: string, message: string): Promise<boolean> => {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Anuluj', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Usuń', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
};

const showMessage = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
};

export default function CategoriesScreen() {
  const { activeLocation } = useLocation();
  const businessSlug = activeLocation?.slug;
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setColor(COLORS[0]);
  };

  const startEdit = (category: ServiceCategory) => {
    setEditingId(category.id);
    setName(category.name);
    setColor(category.color || COLORS[0]);
  };

  const save = async () => {
    if (!businessSlug || !name.trim()) return;
    try {
      setSaving(true);
      if (editingId) {
        const updated = await updateServiceCategory(businessSlug, editingId, {
          name: name.trim(),
          color,
        });
        setCategories((current) =>
          current.map((item) => (item.id === updated.id ? updated : item)),
        );
      } else {
        const category = await addServiceCategory(businessSlug, {
          name: name.trim(),
          color,
          sort_order: categories.length,
        });
        setCategories((current) => [...current, category]);
      }
      resetForm();
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message
        || error?.response?.data?.name?.[0]
        || 'Nie udało się zapisać kategorii.';
      showMessage('Błąd', String(detail));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (category: ServiceCategory) => {
    if (!businessSlug) return;
    const ok = await confirmAction(
      'Usuń kategorię?',
      'Usługi pozostaną w ofercie bez kategorii.',
    );
    if (!ok) return;
    try {
      await deleteServiceCategory(businessSlug, category.id);
      setCategories((current) => current.filter((item) => item.id !== category.id));
      if (editingId === category.id) resetForm();
    } catch (error: any) {
      const detail =
        error?.response?.data?.error?.message
        || 'Nie udało się usunąć kategorii.';
      showMessage('Błąd', String(detail));
    }
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
          <Text style={styles.sectionTitle}>
            {editingId ? 'Edytuj kategorię' : 'Nowa kategoria'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="np. Koloryzacja"
            value={name}
            onChangeText={setName}
          />
          <View style={styles.colors}>
            {COLORS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.colorDot, { backgroundColor: item }, color === item && styles.colorDotActive]}
                onPress={() => setColor(item)}
              />
            ))}
          </View>
          <View style={styles.formActions}>
            {editingId ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={resetForm} disabled={saving}>
                <Text style={styles.cancelText}>Anuluj</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={[styles.saveBtn, editingId && styles.saveBtnFlex]}
              onPress={save}
              disabled={saving || !name.trim()}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveText}>{editingId ? 'Zapisz zmiany' : 'Dodaj kategorię'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.light.accent} />
        ) : categories.length === 0 ? (
          <Text style={styles.empty}>Nie masz jeszcze kategorii.</Text>
        ) : (
          categories.map((category) => (
            <View key={category.id} style={[styles.item, editingId === category.id && styles.itemActive]}>
              <View style={[styles.dot, { backgroundColor: category.color }]} />
              <Text style={styles.itemName}>{category.name}</Text>
              <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(category)}>
                <Ionicons name="create-outline" size={18} color={Colors.light.accent} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => void remove(category)}>
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
  formActions: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    height: 50, borderRadius: 14, paddingHorizontal: 16, backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  cancelText: { color: '#475569', fontWeight: '800' },
  saveBtn: { height: 50, borderRadius: 14, backgroundColor: Colors.light.accent, alignItems: 'center', justifyContent: 'center', flex: 1 },
  saveBtnFlex: { flex: 1 },
  saveText: { color: '#fff', fontWeight: '800' },
  empty: { textAlign: 'center', color: '#64748B', marginTop: 20 },
  item: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10 },
  itemActive: { borderWidth: 1, borderColor: Colors.light.accent },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  itemName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B' },
  editBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
});
