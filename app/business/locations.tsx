import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';
import apiClient from '../../api/client';
import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from '../../contexts/LocationContext';
import { notify } from '../../utils/notify';

type LocationRow = {
  id: string;
  name: string;
  slug: string;
  category?: string;
  city?: string;
  is_active?: boolean;
};

export default function LocationsScreen() {
  const { locations, activeLocation, selectLocation, refreshLocations } = useLocation();
  const { refreshUser } = useAuth();
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiClient.get('/businesses/my-business/');
      let data = response.data;
      if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
        data = (data as any).results;
      }
      if (Array.isArray(data)) {
        setRows(data.map((item: any) => ({
          id: String(item.id),
          name: item.name,
          slug: item.slug,
          category: item.category,
          city: item.city,
          is_active: item.is_active !== false,
        })));
      } else {
        setRows(locations.map((l) => ({ ...l, is_active: l.is_active !== false })));
      }
    } catch {
      setRows(locations.map((l) => ({ ...l, is_active: l.is_active !== false })));
    }
  }, [locations]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const toggleActive = async (location: LocationRow, next: boolean) => {
    try {
      setTogglingId(location.id);
      await apiClient.patch(`/businesses/my-business/${location.id}/`, { is_active: next });
      setRows((current) => current.map((row) => (
        row.id === location.id ? { ...row, is_active: next } : row
      )));
      await refreshLocations();
      await refreshUser?.();
      notify(
        next ? 'Miejsce aktywne' : 'Miejsce nieaktywne',
        next
          ? 'Klienci widzą to miejsce i mogą umawiać wizyty.'
          : 'Miejsce jest ukryte — dokończ usługi i godziny, potem włącz ponownie.',
      );
    } catch (error: any) {
      notify('Nie udało się zmienić statusu', error?.message || 'Spróbuj ponownie.');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackToApp(router, '/(tabs)')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Miejsca działalności</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.hint}>
          Nieaktywne miejsce jest niewidoczne dla klientów. Włącz je, gdy masz usługi, godziny i zespół gotowe do rezerwacji.
        </Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/business/add-location' as any)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.addText}>Dodaj miejsce</Text>
        </TouchableOpacity>
        {rows.length === 0 ? (
          <Text style={styles.empty}>Nie masz jeszcze żadnego miejsca. Dodaj salon po założeniu konta firmowego.</Text>
        ) : (
          rows.map((location) => {
            const selected = activeLocation?.id === location.id;
            const active = location.is_active !== false;
            return (
              <View key={location.id} style={[styles.card, selected && styles.cardSelected]}>
                <TouchableOpacity style={styles.cardMain} onPress={() => selectLocation(location.id)}>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={Colors.light.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{location.name}</Text>
                    {!!location.city && <Text style={styles.city}>{location.city}</Text>}
                    <Text style={[styles.status, active ? styles.statusOn : styles.statusOff]}>
                      {active ? 'Widoczne dla klientów' : 'Ukryte — w trakcie przygotowania'}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.switchCol}>
                  {togglingId === location.id ? (
                    <ActivityIndicator color={Colors.light.accent} />
                  ) : (
                    <Switch
                      value={active}
                      onValueChange={(value) => toggleActive(location, value)}
                      trackColor={{ false: '#E2E8F0', true: Colors.light.accent }}
                    />
                  )}
                  <Text style={styles.switchLabel}>{active ? 'Aktywne' : 'Nieaktywne'}</Text>
                </View>
              </View>
            );
          })
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
  content: { padding: 20 },
  hint: { color: '#64748B', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  addBtn: {
    flexDirection: 'row', gap: 8, height: 50, borderRadius: 14, backgroundColor: Colors.light.accent,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  addText: { color: '#fff', fontWeight: '800' },
  empty: { color: '#64748B', lineHeight: 20, textAlign: 'center', marginTop: 20 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: 16,
    backgroundColor: '#fff', marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0',
  },
  cardSelected: { borderColor: Colors.light.accent, backgroundColor: '#FAF5FF' },
  cardMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  city: { fontSize: 13, color: '#64748B', marginTop: 2 },
  status: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  statusOn: { color: '#059669' },
  statusOff: { color: '#D97706' },
  switchCol: { alignItems: 'center', gap: 4, minWidth: 72 },
  switchLabel: { fontSize: 11, fontWeight: '700', color: '#64748B' },
});
