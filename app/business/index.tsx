import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { getMyBusiness } from '@/api/business';
import { getBusinessAppointments } from '@/api/appointments';
import Colors from '@/constants/Colors';

const ACTIONS = [
  {
    route: '/business/edit-profile',
    icon: 'create-outline' as const,
    label: 'Edytuj Profil',
    sub: 'Adres, opis, kontakt',
    accent: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    route: '/business/manage-services',
    icon: 'list-outline' as const,
    label: 'Usługi & Ceny',
    sub: 'Zarządzaj ofertą',
    accent: '#0284C7',
    bg: '#E0F2FE',
  },
  {
    route: '/business/opening-hours',
    icon: 'time-outline' as const,
    label: 'Godziny Otwarcia',
    sub: 'Dostępność firmy',
    accent: '#059669',
    bg: '#D1FAE5',
  },
  {
    route: '/business/schedule',
    icon: 'calendar-outline' as const,
    label: 'Grafik Wizyt',
    sub: 'Nadchodzące rezerwacje',
    accent: '#D97706',
    bg: '#FEF3C7',
  },
];

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: any;
  accent: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: accent }]}>
      <View style={[styles.statIcon, { backgroundColor: accent + '20' }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function BusinessDashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [business, setBusiness] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const biz = await getMyBusiness();
      setBusiness(biz);
      if (biz?.slug) {
        const apts = await getBusinessAppointments(biz.slug);
        setAppointments(Array.isArray(apts) ? apts : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const now = new Date();
  const upcoming = appointments.filter(
    (a) => a.start && new Date(a.start) > now && a.status !== 'cancelled'
  );
  const todayApts = upcoming.filter((a) => {
    const d = new Date(a.start);
    return d.toDateString() === now.toDateString();
  });
  const pendingApts = appointments.filter((a) => a.status === 'pending');

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Ładowanie panelu…</Text>
      </View>
    );
  }

  const bizName = business?.name || user?.business?.name || 'Twoja Firma';
  const greeting =
    new Date().getHours() < 12
      ? 'Dzień dobry'
      : new Date().getHours() < 18
      ? 'Dobry wieczór'
      : 'Dobry wieczór';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* ── HEADER ── */}
      <LinearGradient
        colors={['#4F46E5', '#7C3AED', '#9333EA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* decorative circles */}
        <View style={styles.deco1} />
        <View style={styles.deco2} />

        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.first_name || user?.username || 'właścicielu'} 👋
            </Text>
          </View>
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/account/edit-profile' as any)}
          >
            <Text style={styles.avatarLetter}>
              {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bizBadge}>
          <Ionicons name="business" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.bizBadgeText} numberOfLines={1}>
            {bizName}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statPillNum}>{todayApts.length}</Text>
            <Text style={styles.statPillLbl}>Dziś</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statPillNum}>{upcoming.length}</Text>
            <Text style={styles.statPillLbl}>Nadchodzące</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statPill}>
            <Text style={styles.statPillNum}>{pendingApts.length}</Text>
            <Text style={styles.statPillLbl}>Oczekujące</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── QUICK ACTIONS ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Panel zarządzania</Text>
        <View style={styles.actionsGrid}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.route}
              style={styles.actionCard}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.85}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                <Ionicons name={action.icon} size={22} color={action.accent} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={styles.actionSub}>{action.sub}</Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color="#CBD5E1"
                style={styles.actionChevron}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── UPCOMING APPOINTMENTS ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Najbliższe wizyty</Text>
          <TouchableOpacity onPress={() => router.push('/business/schedule' as any)}>
            <Text style={styles.seeAll}>Zobacz wszystkie</Text>
          </TouchableOpacity>
        </View>

        {upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Brak nadchodzących wizyt</Text>
            <Text style={styles.emptySub}>
              Rezerwacje pojawią się tutaj po zatwierdzeniu przez klientów.
            </Text>
          </View>
        ) : (
          upcoming.slice(0, 4).map((apt) => {
            const d = apt.start ? new Date(apt.start) : null;
            const isToday = d?.toDateString() === now.toDateString();
            const statusColor =
              apt.status === 'confirmed'
                ? '#10B981'
                : apt.status === 'pending'
                ? '#F59E0B'
                : '#EF4444';
            const statusLabel =
              apt.status === 'confirmed'
                ? 'Potwierdzona'
                : apt.status === 'pending'
                ? 'Oczekuje'
                : apt.status;
            return (
              <TouchableOpacity
                key={apt.id}
                style={styles.aptCard}
                onPress={() => router.push('/business/schedule' as any)}
                activeOpacity={0.8}
              >
                <View style={[styles.aptDateBox, isToday && styles.aptDateBoxToday]}>
                  <Text style={[styles.aptDay, isToday && styles.aptDayToday]}>
                    {d ? d.getDate() : '--'}
                  </Text>
                  <Text style={[styles.aptMonth, isToday && styles.aptMonthToday]}>
                    {d
                      ? d.toLocaleString('pl-PL', { month: 'short' }).toUpperCase()
                      : '---'}
                  </Text>
                </View>
                <View style={styles.aptInfo}>
                  <Text style={styles.aptService} numberOfLines={1}>
                    {apt.service?.name || 'Usługa'}
                  </Text>
                  <View style={styles.aptMeta}>
                    <Ionicons name="time-outline" size={13} color="#94A3B8" />
                    <Text style={styles.aptTime}>
                      {d
                        ? d.toLocaleTimeString('pl-PL', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '--:--'}
                    </Text>
                    {apt.customer_first_name && (
                      <>
                        <Text style={styles.aptDot}>·</Text>
                        <Ionicons name="person-outline" size={13} color="#94A3B8" />
                        <Text style={styles.aptTime}>
                          {apt.customer_first_name} {apt.customer_last_name || ''}
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                <View style={[styles.aptStatus, { backgroundColor: statusColor + '18' }]}>
                  <Text style={[styles.aptStatusText, { color: statusColor }]}>
                    {statusLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* ── PROFILE COMPLETION ── */}
      {(!business?.description || !business?.phone_number || !business?.address_line1) && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.completionCard}
            onPress={() => router.push('/business/edit-profile' as any)}
            activeOpacity={0.9}
          >
            <View style={styles.completionLeft}>
              <Ionicons name="alert-circle" size={22} color="#D97706" />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.completionTitle}>Uzupełnij profil firmy</Text>
                <Text style={styles.completionSub}>
                  Dodaj opis, telefon lub adres, aby klienci mogli Cię znaleźć.
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#D97706" />
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingBottom: 40 },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: { marginTop: 12, color: '#94A3B8', fontSize: 15 },

  // HEADER
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 20,
    paddingBottom: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  deco2: {
    position: 'absolute',
    bottom: -30,
    left: 60,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: { flex: 1 },
  greeting: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '500' },
  userName: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 18, fontWeight: '800' },
  bizBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 20,
  },
  bizBadgeText: { color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' },

  // Stats in header
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  statPill: { flex: 1, alignItems: 'center' },
  statPillNum: { color: '#fff', fontSize: 22, fontWeight: '800' },
  statPillLbl: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },

  // SECTIONS
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 14 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  seeAll: { fontSize: 13, fontWeight: '700', color: Colors.accent },

  // ACTION CARDS
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  actionSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  actionChevron: { position: 'absolute', top: 16, right: 16 },

  // APPOINTMENT CARDS
  aptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  aptDateBox: {
    width: 48,
    height: 52,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aptDateBoxToday: { backgroundColor: '#EDE9FE' },
  aptDay: { fontSize: 18, fontWeight: '800', color: '#475569' },
  aptDayToday: { color: '#7C3AED' },
  aptMonth: { fontSize: 10, fontWeight: '700', color: '#94A3B8', marginTop: 1 },
  aptMonthToday: { color: '#9333EA' },
  aptInfo: { flex: 1 },
  aptService: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  aptMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  aptTime: { fontSize: 12, color: '#94A3B8' },
  aptDot: { fontSize: 12, color: '#CBD5E1', marginHorizontal: 2 },
  aptStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 8,
  },
  aptStatusText: { fontSize: 11, fontWeight: '700' },

  // EMPTY
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#475569' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },

  // PROFILE COMPLETION
  completionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 16,
    justifyContent: 'space-between',
  },
  completionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  completionTitle: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  completionSub: { fontSize: 12, color: '#B45309', marginTop: 2, lineHeight: 16 },

  // STAT CARDS (unused now, kept for reference)
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 3,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  statLabel: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
});