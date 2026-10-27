import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';
import { BusinessStats, getStaffStats } from '../../api/business';
import Colors from '../../constants/Colors';
import { useLocation } from '../../contexts/LocationContext';

export default function StaffStatsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeLocation } = useLocation();
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [name, setName] = useState('Pracownik');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeLocation?.slug || !id) {
      setLoading(false);
      return;
    }
    try {
      const data = await getStaffStats(activeLocation.slug, String(id));
      setStats(data);
      setName(data.name || 'Pracownik');
    } finally {
      setLoading(false);
    }
  }, [activeLocation?.slug, id]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackToApp(router, '/business/staff')} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>{name}</Text>
          <Text style={styles.sub}>{activeLocation?.name}</Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.light.accent} />
      ) : stats ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.grid}>
            <View style={styles.card}><Text style={styles.value}>{stats.upcoming}</Text><Text style={styles.label}>Umówieni</Text></View>
            <View style={styles.card}><Text style={styles.value}>{stats.pending || 0}</Text><Text style={styles.label}>Do zatwierdzenia</Text></View>
            <View style={styles.card}><Text style={styles.value}>{stats.current_month ?? stats.last_30_days}</Text><Text style={styles.label}>Ten miesiąc</Text></View>
            <View style={styles.card}><Text style={styles.value}>{Number(stats.current_month_revenue ?? stats.last_30_revenue).toFixed(0)} zł</Text><Text style={styles.label}>Przychód</Text></View>
          </View>
          <TouchableOpacity
            style={styles.cta}
            onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'all', staffId: id } } as any)}
          >
            <Text style={styles.ctaText}>Zobacz grafik i zatwierdź wizyty</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <Text style={styles.empty}>Nie udało się pobrać statystyk.</Text>
      )}
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
  back: { marginRight: 14 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  sub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  content: { padding: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  value: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  label: { color: '#64748B', marginTop: 4, fontWeight: '600' },
  cta: { marginTop: 20, height: 52, borderRadius: 16, backgroundColor: Colors.light.accent, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontWeight: '800' },
  empty: { textAlign: 'center', marginTop: 40, color: '#64748B' },
});
