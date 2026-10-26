import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessStats, getStaffStats } from '@/api/business';
import { getBusinessAppointments } from '@/api/appointments';
import Colors from '@/constants/Colors';
import { useLocation } from '@/contexts/LocationContext';
import { Appointment } from '@/types/api';

export default function StaffHome() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { activeLocation } = useLocation();
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const staffId = user?.staff_position?.id;

  const load = useCallback(async () => {
    if (!activeLocation?.slug || !staffId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const [businessStats, apts] = await Promise.all([
        getStaffStats(activeLocation.slug, staffId),
        getBusinessAppointments(activeLocation.slug),
      ]);
      setStats(businessStats);
      setAppointments(Array.isArray(apts) ? apts : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLocation?.slug, staffId]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const now = new Date();
  const upcoming = appointments
    .filter((item) => item.start && new Date(item.start) > now && item.status !== 'cancelled')
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const pending = appointments.filter((item) => item.status === 'pending');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (!activeLocation?.slug || !staffId) {
    return (
      <View style={styles.center}>
        <Text style={styles.empty}>Nie znaleziono Twojego miejsca pracy. Zaloguj się ponownie.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={Colors.accent} />}
    >
      <LinearGradient colors={['#4F46E5', '#7C3AED']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Twój grafik</Text>
            <Text style={styles.name}>{user?.first_name || user?.username}</Text>
          </View>
          <TouchableOpacity style={styles.logout} onPress={async () => { await logout(); router.replace('/(auth)/login'); }}>
            <Ionicons name="log-out-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.place}>{activeLocation?.name || user?.staff_position?.name}</Text>
        <View style={styles.pills}>
          <TouchableOpacity style={styles.pill} onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'today' } } as any)}>
            <Text style={styles.pillNum}>{upcoming.filter((item) => new Date(item.start).toDateString() === now.toDateString()).length}</Text>
            <Text style={styles.pillLbl}>Dziś</Text>
          </TouchableOpacity>
          <View style={styles.pillLine} />
          <TouchableOpacity style={styles.pill} onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'all' } } as any)}>
            <Text style={styles.pillNum}>{upcoming.length}</Text>
            <Text style={styles.pillLbl}>Umówieni</Text>
          </TouchableOpacity>
          <View style={styles.pillLine} />
          <TouchableOpacity style={styles.pill} onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'pending' } } as any)}>
            <Text style={styles.pillNum}>{pending.length}</Text>
            <Text style={styles.pillLbl}>Oczekujące</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.section}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/business/schedule' as any)}>
          <Ionicons name="calendar" size={20} color="#fff" />
          <Text style={styles.primaryText}>Otwórz mój grafik</Text>
        </TouchableOpacity>
      </View>

      {stats ? (
        <View style={styles.section}>
          <Text style={styles.title}>Moje statystyki · ten miesiąc</Text>
          <View style={styles.grid}>
            <View style={styles.card}><Text style={styles.value}>{stats.current_month ?? stats.last_30_days}</Text><Text style={styles.label}>Wizyty</Text></View>
            <View style={styles.card}><Text style={styles.value}>{stats.current_month_completed ?? stats.last_30_completed}</Text><Text style={styles.label}>Zakończone</Text></View>
            <View style={styles.card}><Text style={styles.value}>{stats.upcoming}</Text><Text style={styles.label}>Nadchodzące</Text></View>
            <View style={styles.card}><Text style={styles.value}>{Number(stats.current_month_revenue ?? stats.last_30_revenue).toFixed(0)} zł</Text><Text style={styles.label}>Przychód</Text></View>
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.title}>Kto jest do Ciebie umówiony</Text>
        {upcoming.length === 0 ? (
          <Text style={styles.empty}>Brak nadchodzących wizyt w Twoim grafiku.</Text>
        ) : upcoming.slice(0, 6).map((item) => {
          const date = item.start ? new Date(item.start) : null;
          const client = item.customer_first_name
            ? `${item.customer_first_name} ${item.customer_last_name || ''}`.trim()
            : item.guest_name || item.customer_email || 'Klient';
          return (
            <TouchableOpacity key={item.id} style={styles.apt} onPress={() => router.push('/business/schedule' as any)}>
              <View>
                <Text style={styles.aptName}>{client}</Text>
                <Text style={styles.aptMeta}>{item.service?.name} · {date?.toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <Text style={[styles.aptStatus, item.status === 'pending' && { color: '#D97706' }]}>
                {item.status === 'pending' ? 'Oczekuje' : 'Potwierdzona'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 48, paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  name: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 4 },
  logout: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  place: { color: 'rgba(255,255,255,0.85)', marginTop: 8, marginBottom: 16 },
  pills: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, paddingVertical: 14 },
  pill: { flex: 1, alignItems: 'center' },
  pillNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
  pillLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
  pillLine: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  section: { paddingHorizontal: 20, marginTop: 22 },
  primaryBtn: { height: 52, borderRadius: 16, backgroundColor: Colors.accent, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontWeight: '800' },
  title: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  value: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  label: { color: '#64748B', marginTop: 4, fontWeight: '600' },
  empty: { color: '#64748B' },
  apt: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aptName: { fontWeight: '800', color: '#1E293B' },
  aptMeta: { color: '#64748B', marginTop: 4, fontSize: 12 },
  aptStatus: { color: '#059669', fontWeight: '700', fontSize: 12 },
});
