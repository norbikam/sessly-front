import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { BusinessStats, getBusinessDetail, getBusinessStats } from '@/api/business';
import { getBusinessAppointments } from '@/api/appointments';
import Colors from '@/constants/Colors';
import { useLocation } from '@/contexts/LocationContext';
import { appointmentClientName, staffDisplayName } from '@/utils/staffName';

const ACTIONS = [
  {
    route: '/business/schedule',
    icon: 'calendar-outline' as const,
    label: 'Grafik Wizyt',
    sub: 'Nadchodzące rezerwacje',
    accent: '#D97706',
    bg: '#FEF3C7',
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
    route: '/business/staff',
    icon: 'people-outline' as const,
    label: 'Pracownicy',
    sub: 'Zespół i grafiki',
    accent: '#DB2777',
    bg: '#FCE7F3',
  },
  {
    route: '/business/locations',
    icon: 'business-outline' as const,
    label: 'Miejsca',
    sub: 'Dodaj kolejny lokal',
    accent: '#0F766E',
    bg: '#CCFBF1',
  },
  {
    route: '/business/edit-profile',
    icon: 'create-outline' as const,
    label: 'Edytuj Profil',
    sub: 'Adres, opis, kontakt',
    accent: '#7C3AED',
    bg: '#EDE9FE',
  },
  {
    route: '/business/subscription',
    icon: 'diamond-outline' as const,
    label: 'Subskrypcja',
    sub: 'Plan Sessly dla salonu',
    accent: '#B45309',
    bg: '#FEF3C7',
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
    route: '/business/gallery',
    icon: 'images-outline' as const,
    label: 'Galeria',
    sub: 'Logo i zdjęcia',
    accent: '#4F46E5',
    bg: '#E0E7FF',
  },
];

function StatCard({
  label,
  value,
  icon,
  accent,
  onPress,
}: {
  label: string;
  value: string | number;
  icon: any;
  accent: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.statCard, { borderLeftColor: accent }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      disabled={!onPress}
    >
      <View style={[styles.statIcon, { backgroundColor: accent + '20' }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function BusinessDashboard() {
  const router = useRouter();
  const segments = useSegments();
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === 'web' && width >= 1024;
  const { user, logout } = useAuth();
  const { activeLocation } = useLocation();
  const [business, setBusiness] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // /business as a stack screen has no tab bar — bounce owners back into tabs.
  useEffect(() => {
    if (segments[0] === 'business' && segments.length === 1) {
      router.replace('/(tabs)' as any);
    }
  }, [router, segments]);

  const loadData = useCallback(async () => {
    try {
      if (!activeLocation) {
        setBusiness(null);
        return;
      }
      const biz = await getBusinessDetail(activeLocation.slug);
      setBusiness(biz);
      if (biz?.slug) {
        const [apts, businessStats] = await Promise.all([
          getBusinessAppointments(biz.slug),
          getBusinessStats(String(biz.id)),
        ]);
        setAppointments(Array.isArray(apts) ? apts : []);
        setStats(businessStats);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeLocation]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleExitDashboard = () => {
    Alert.alert('Wylogować się?', 'Zakończysz bieżącą sesję konta biznesowego.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Wyloguj',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const now = new Date();
  const upcoming = appointments
    .filter((a) => a.start && new Date(a.start) > now && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
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

  if (!activeLocation) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="business-outline" size={48} color="#C4B5FD" />
        <Text style={[styles.loadingText, { color: '#1E293B', fontWeight: '800', fontSize: 18 }]}>Dodaj pierwsze miejsce</Text>
        <Text style={[styles.loadingText, { textAlign: 'center', paddingHorizontal: 32 }]}>
          Konto firmowe jest gotowe. Lokalizację tworzysz dopiero po rejestracji.
        </Text>
        <TouchableOpacity
          style={styles.emptyCta}
          onPress={() => router.push('/business/add-location' as any)}
        >
          <Text style={styles.emptyCtaText}>Dodaj miejsce</Text>
        </TouchableOpacity>
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
  const needsOnboarding = business != null && business.is_active === false;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.scroll, isDesktop && styles.scrollDesktop]}
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
        style={[styles.header, isDesktop && styles.headerDesktop]}
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
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/account/edit-profile' as any)}
            >
              <Text style={styles.avatarLetter}>
                {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.exitBtn} onPress={handleExitDashboard} accessibilityLabel="Wyloguj się">
              <Ionicons name="log-out-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bizBadge}>
          <Ionicons name="business" size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.bizBadgeText} numberOfLines={1}>
            {bizName}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statPill} onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'today' } } as any)}>
            <Text style={styles.statPillNum}>{todayApts.length}</Text>
            <Text style={styles.statPillLbl}>Dziś</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statPill} onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'all' } } as any)}>
            <Text style={styles.statPillNum}>{upcoming.length}</Text>
            <Text style={styles.statPillLbl}>Nadchodzące</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity style={styles.statPill} onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'pending' } } as any)}>
            <Text style={styles.statPillNum}>{pendingApts.length}</Text>
            <Text style={styles.statPillLbl}>Oczekujące</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {needsOnboarding ? (
        <TouchableOpacity
          style={[styles.onboardingBanner, isDesktop && { marginHorizontal: 28 }]}
          onPress={() => router.push('/business/onboarding' as any)}
        >
          <View style={styles.onboardingIcon}>
            <Ionicons name="rocket-outline" size={22} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.onboardingTitle}>Lokal jest ukryty</Text>
            <Text style={styles.onboardingSub}>
              Dokończ checklistę i włącz rezerwacje online.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#B45309" />
        </TouchableOpacity>
      ) : null}

      {/* ── UPCOMING APPOINTMENTS ── */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
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
            const staffName = staffDisplayName(apt.staff);
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
                    <Text style={styles.aptDot}>·</Text>
                    <Ionicons name="person-outline" size={13} color="#94A3B8" />
                    <Text style={styles.aptTime} numberOfLines={1}>
                      {appointmentClientName(apt)}
                    </Text>
                  </View>
                  <View style={styles.aptMeta}>
                    <Ionicons name="cut-outline" size={13} color="#94A3B8" />
                    <Text style={styles.aptTime} numberOfLines={1}>
                      {staffName ? staffName : 'Nieprzypisany pracownik'}
                    </Text>
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

      {/* ── QUICK ACTIONS ── */}
      <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
        <Text style={styles.sectionTitle}>Panel zarządzania</Text>
        <View style={styles.actionsGrid}>
          {ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.route}
              style={[styles.actionCard, isDesktop && styles.actionCardDesktop]}
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

      {stats ? (
        <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
          <Text style={styles.sectionTitle}>Bieżący miesiąc</Text>
          <View style={styles.summaryGrid}>
            <StatCard
              label="Wizyty"
              value={stats.current_month ?? stats.last_30_days}
              icon="calendar-outline"
              accent="#7C3AED"
              onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'all' } } as any)}
            />
            <StatCard
              label="Zakończone"
              value={stats.current_month_completed ?? stats.last_30_completed}
              icon="checkmark-circle-outline"
              accent="#059669"
              onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'completed' } } as any)}
            />
            <StatCard
              label="Anulowane"
              value={stats.current_month_cancelled ?? stats.last_30_cancelled}
              icon="close-circle-outline"
              accent="#DC2626"
              onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'cancelled' } } as any)}
            />
            <StatCard
              label="Przychód"
              value={`${Number(stats.current_month_revenue ?? stats.last_30_revenue).toFixed(2)} zł`}
              icon="cash-outline"
              accent="#D97706"
              onPress={() => router.push({ pathname: '/business/schedule', params: { filter: 'completed' } } as any)}
            />
          </View>
          {stats.top_services.length ? (
            <View style={styles.topServices}>
              <Text style={styles.topServicesTitle}>Najpopularniejsze usługi</Text>
              {stats.top_services.map((service) => (
                <TouchableOpacity
                  key={service.name}
                  style={styles.topServiceRow}
                  onPress={() => router.push('/business/manage-services' as any)}
                >
                  <Text style={styles.topServiceName}>{service.name}</Text>
                  <Text style={styles.topServiceValue}>{service.count} wizyt · {Number(service.revenue).toFixed(2)} zł</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {stats.by_staff?.length ? (
            <View style={styles.topServices}>
              <Text style={styles.topServicesTitle}>Pracownicy</Text>
              {stats.by_staff.map((member) => (
                <TouchableOpacity
                  key={member.id || 'unassigned'}
                  style={styles.topServiceRow}
                  onPress={() => member.id
                    ? router.push({ pathname: '/business/staff-stats', params: { id: member.id } } as any)
                    : router.push({ pathname: '/business/schedule', params: { filter: 'all' } } as any)}
                >
                  <Text style={styles.topServiceName}>{member.name}</Text>
                  <Text style={styles.topServiceValue}>
                    {member.upcoming} umówionych · {member.current_month ?? member.last_30_days} w tym miesiącu
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* ── PROFILE COMPLETION ── */}
      {(!business?.description || !business?.phone_number || !business?.address_line1) && (
        <View style={[styles.section, isDesktop && styles.sectionDesktop]}>
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
  // Wide enough to use a 32" screen without reading left↔right across the whole display
  scrollDesktop: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 48,
  },
  headerDesktop: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    paddingHorizontal: 28,
  },
  sectionDesktop: { paddingHorizontal: 28 },
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9 },
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
  exitBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
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
  actionCardDesktop: {
    width: '31.5%',
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
  onboardingBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: '#FFFBEB',
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  onboardingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onboardingTitle: { fontSize: 15, fontWeight: '800', color: '#92400E' },
  onboardingSub: { fontSize: 12, color: '#B45309', marginTop: 2 },
  emptyCta: {
    marginTop: 20,
    backgroundColor: Colors.accent,
    paddingHorizontal: 22,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCtaText: { color: '#fff', fontWeight: '800' },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  topServices: { marginTop: 14, padding: 16, borderRadius: 16, backgroundColor: '#fff' },
  topServicesTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginBottom: 10 },
  topServiceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E2E8F0' },
  topServiceName: { flex: 1, color: '#334155', fontWeight: '700' },
  topServiceValue: { color: '#64748B', fontSize: 12 },

  // STAT CARDS
  statCard: {
    flexGrow: 1,
    flexBasis: '47%',
    minHeight: 126,
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