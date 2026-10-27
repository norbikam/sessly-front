import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Platform, Alert, ScrollView, useWindowDimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';
import {
  getBusinessAppointments,
  confirmAppointment,
  cancelBusinessAppointment,
  proposeAppointmentTime,
} from '../../api/appointments';
import { Appointment, BusinessStaff, Service } from '../../types/api';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../constants/designTokens';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarGrid } from '../../components/business/CalendarGrid';
import { CompletedAppointmentsList } from '../../components/business/CompletedAppointmentsList';
import {
  MobileDayCalendar,
  localDateIso,
  sameDay,
  startOfDay,
} from '../../components/business/MobileDayCalendar';
import { ManualAppointmentModal } from '../../components/business/ManualAppointmentModal';
import RescheduleModal from '../../components/appointments/RescheduleModal';
import { getBusinessStaff, getMyServices } from '../../api/business';
import { appointmentClientName, staffDisplayName } from '../../utils/staffName';
import { formatApiError, notify } from '../../utils/notify';

type MobileTab = 'calendar' | 'daylist' | 'pending' | 'completed' | 'cancelled';

const mobileTabFromFilter = (value?: string): MobileTab => {
  if (value === 'pending' || value === 'completed' || value === 'cancelled') return value;
  return 'calendar';
};

type FilterType = 'all' | 'today' | 'week' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
const FILTERS: FilterType[] = ['all', 'today', 'week', 'pending', 'confirmed', 'cancelled', 'completed'];

export default function ScheduleScreen() {
  const router = useRouter();
  const { filter, staffId } = useLocalSearchParams<{ filter?: string; staffId?: string }>();
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    FILTERS.includes(filter as FilterType) ? (filter as FilterType) : 'all'
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<BusinessStaff[]>([]);
  const [showManual, setShowManual] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>(() => mobileTabFromFilter(filter));
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(staffId ? String(staffId) : null);
  const [draftSlot, setDraftSlot] = useState<{ date: string; time: string } | null>(null);
  const [proposeTarget, setProposeTarget] = useState<Appointment | null>(null);
  const [proposeSubmitting, setProposeSubmitting] = useState(false);

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');
  const { width } = useWindowDimensions();
  const { activeLocation } = useLocation();
  const { user } = useAuth();
  const canManage = user?.role === 'business_owner';
  const insets = useSafeAreaInsets();
  const useSplit = width >= 1280;

  const loadScheduleForSlug = useCallback(async (targetSlug: string) => {
    try {
      const data = await getBusinessAppointments(
        targetSlug,
        canManage && staffId ? { staff_id: String(staffId) } : undefined
      );
      const sorted = data.sort((a, b) =>
        new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime()
      );
      setAppointments(sorted);
      setLastUpdated(new Date().toISOString());
    } catch (e) {
      console.error('Error loading schedule:', e);
      Alert.alert('Błąd', 'Nie udało się załadować wizyt.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canManage, staffId]);

  const loadSchedule = useCallback(async () => {
    if (businessSlug) {
      await loadScheduleForSlug(businessSlug);
    }
  }, [businessSlug, loadScheduleForSlug]);

  const loadCatalogForSlug = useCallback(async (targetSlug: string) => {
    if (!canManage) {
      setServices([]);
      setStaff([]);
      return;
    }
    const [serviceData, staffData] = await Promise.all([
      getMyServices(targetSlug),
      getBusinessStaff(targetSlug),
    ]);
    setServices(serviceData);
    setStaff(staffData);
  }, [canManage]);

  useEffect(() => {
    if (FILTERS.includes(filter as FilterType)) {
      setActiveFilter(filter as FilterType);
    }
    setMobileTab(mobileTabFromFilter(filter));
    if (filter === 'today') setSelectedDate(startOfDay(new Date()));
  }, [filter]);

  useEffect(() => {
    if (staffId) setSelectedStaffId(String(staffId));
  }, [staffId]);
  useEffect(() => {
    const init = async () => {
      try {
        const slug = activeLocation?.slug;
        if (!slug) {
          setLoading(false);
          return;
        }
        setLoading(true);
        setBusinessSlug(slug);
        await Promise.all([loadScheduleForSlug(slug), loadCatalogForSlug(slug)]);
      } catch (e) {
        console.error('Error initializing business schedule:', e);
        setLoading(false);
      }
    };
    init();
  }, [activeLocation, loadCatalogForSlug, loadScheduleForSlug]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  useFocusEffect(
    useCallback(() => {
      if (businessSlug) {
        loadSchedule();
      }
    }, [businessSlug, loadSchedule])
  );

  useEffect(() => {
    if (!businessSlug) return;
    const interval = setInterval(() => {
      loadSchedule();
    }, 20000);

    return () => clearInterval(interval);
  }, [businessSlug, loadSchedule]);

  // Filter appointments based on active filter
  const filteredAppointments = useMemo(() => {
    const filtered = appointments.filter(appointment => {
      switch (activeFilter) {
        case 'pending':
          return appointment.status === 'pending' || appointment.status === 'proposed';
        case 'confirmed':
          return appointment.status === 'confirmed';
        case 'cancelled':
          return appointment.status === 'cancelled';
        case 'completed':
          return appointment.status === 'completed';
        default:
          return true;
      }
    });
    return activeFilter === 'cancelled' || activeFilter === 'completed' ? [...filtered].reverse() : filtered;
  }, [appointments, activeFilter]);
  const isStatusList = activeFilter === 'pending' || activeFilter === 'cancelled';
  const isCompletedList = activeFilter === 'completed';

  const pendingAppointments = useMemo(
    () => appointments.filter(
      (appointment) => appointment.status === 'pending' || appointment.status === 'proposed',
    ),
    [appointments]
  );

  const dayListAppointments = useMemo(
    () => appointments.filter((item) => {
      if (!item.start || item.status === 'cancelled') return false;
      if (!sameDay(new Date(item.start), selectedDate)) return false;
      if (!selectedStaffId) return true;
      const assigned = typeof item.staff === 'object' ? item.staff?.id : item.staff;
      return assigned === selectedStaffId;
    }),
    [appointments, selectedDate, selectedStaffId]
  );

  const openManual = (dateIso?: string, time?: string) => {
    setDraftSlot({
      date: dateIso || localDateIso(selectedDate),
      time: time || '10:00',
    });
    setShowManual(true);
  };

  const mobileTabs = [
    { key: 'calendar', label: 'Kalendarz' },
    { key: 'daylist', label: 'Lista' },
    { key: 'pending', label: pendingAppointments.length ? `Oczekujące (${pendingAppointments.length})` : 'Oczekujące' },
    { key: 'completed', label: 'Zakończone' },
    { key: 'cancelled', label: 'Anulowane' },
  ] as const;

  // Filter tabs data
  const filterTabs = [
    { key: 'all', label: 'Wszystkie', icon: 'calendar-outline' },
    { key: 'today', label: 'Dzisiaj', icon: 'today-outline' },
    { key: 'week', label: 'Tydzień', icon: 'time-outline' },
    { key: 'pending', label: 'Oczekujące', icon: 'hourglass-outline' },
    { key: 'confirmed', label: 'Potwierdzone', icon: 'checkmark-circle-outline' },
    { key: 'cancelled', label: 'Anulowane', icon: 'close-circle-outline' },
    { key: 'completed', label: 'Zakończone', icon: 'checkmark-done-outline' },
  ] as const;

  const handleConfirm = async (id: string) => {
    if (!businessSlug) return;
    try {
      setActionLoading(id);
      await confirmAppointment(businessSlug, id);
      notify('Sukces', 'Wizyta została potwierdzona.');
      loadSchedule();
    } catch (e: any) {
      notify('Błąd', formatApiError(e, 'Nie udało się potwierdzić wizyty.'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = (id: string) => {
    const run = async () => {
      if (!businessSlug) return;
      try {
        setActionLoading(id);
        await cancelBusinessAppointment(businessSlug, id);
        notify('Anulowano', 'Wizyta została anulowana.');
        loadSchedule();
      } catch (e: any) {
        notify('Błąd', formatApiError(e, 'Nie udało się anulować wizyty.'));
      } finally {
        setActionLoading(null);
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Czy na pewno chcesz anulować tę wizytę?')) {
        void run();
      }
      return;
    }
    Alert.alert('Anuluj wizytę', 'Czy na pewno chcesz anulować tę wizytę?', [
      { text: 'Nie', style: 'cancel' },
      { text: 'Tak, anuluj', style: 'destructive', onPress: () => void run() },
    ]);
  };

  const handleProposeConfirm = async (date: string, time: string) => {
    if (!businessSlug || !proposeTarget) return;
    try {
      setProposeSubmitting(true);
      setActionLoading(String(proposeTarget.id));
      await proposeAppointmentTime(businessSlug, String(proposeTarget.id), {
        date,
        start_time: time,
      });
      setProposeTarget(null);
      notify('Wysłano', 'Klient dostał propozycję innego terminu.');
      loadSchedule();
    } catch (e: any) {
      notify('Błąd', formatApiError(e, 'Nie udało się zaproponować terminu.'));
    } finally {
      setProposeSubmitting(false);
      setActionLoading(null);
    }
  };

  const handleAppointmentPress = (appointment: Appointment) => {
    const start = new Date(appointment.start);
    const proposed = appointment.proposed_start
      ? new Date(appointment.proposed_start).toLocaleString('pl-PL')
      : null;
    const staff = staffDisplayName(appointment.staff);
    const details = [
      appointment.service?.name || 'Wizyta',
      `Termin: ${start.toLocaleString('pl-PL')}`,
      proposed ? `Propozycja: ${proposed}` : null,
      appointmentClientName(appointment),
      staff ? `Pracownik: ${staff}` : 'Pracownik: nieprzypisany',
    ].filter(Boolean).join('\n');
    if ((appointment.status === 'pending' || appointment.status === 'proposed') && canManage) {
      if (Platform.OS === 'web') {
        window.alert(details);
        return;
      }
      Alert.alert('Oczekująca wizyta', details, [
        { text: 'Zamknij', style: 'cancel' },
        { text: 'Odrzuć', style: 'destructive', onPress: () => handleCancel(appointment.id) },
        { text: 'Inny termin', onPress: () => setProposeTarget(appointment) },
        { text: 'Potwierdź', onPress: () => handleConfirm(appointment.id) },
      ]);
      return;
    }
    notify(canManage ? 'Szczegóły wizyty' : 'Twoja wizyta', details);
  };

  const renderStatusBadge = (status?: string) => {
    const statusConfig = {
      pending: { bg: '#FEF3C7', text: '#D97706', label: 'Oczekująca' },
      proposed: { bg: '#E0E7FF', text: '#4338CA', label: 'Propozycja' },
      confirmed: { bg: '#D1FAE5', text: '#059669', label: 'Potwierdzona' },
      cancelled: { bg: '#FEE2E2', text: '#DC2626', label: 'Anulowana' },
      completed: { bg: '#E0E7FF', text: '#2563EB', label: 'Zakończona' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
      </View>
    );
  };

  const renderAppointmentCard = ({ item }: { item: Appointment }) => {
    const needsAction = item.status === 'pending' || item.status === 'proposed';
    const isLoadingThis = actionLoading === String(item.id);

    const clientName = appointmentClientName(item);
    const staffName = staffDisplayName(item.staff);

    const appointmentDate = item.start ? new Date(item.start) : null;
    const timeString = appointmentDate
      ? appointmentDate.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const dateString = appointmentDate
      ? appointmentDate.toLocaleDateString('pl-PL', { weekday: 'short', month: 'short', day: 'numeric' })
      : '';
    const proposedLabel = item.proposed_start
      ? new Date(item.proposed_start).toLocaleString('pl-PL', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

    return (
      <Card style={styles.appointmentCard} shadow="md">
        <View style={styles.cardContent}>
          <View style={styles.timeSection}>
            <Text style={[styles.timeText, { color: Colors.primary }]}>{timeString}</Text>
            <Text style={[styles.dateText, { color: Colors.light.textSecondary }]}>{dateString}</Text>
          </View>

          <View style={styles.infoSection}>
            <Text style={[styles.clientName, { color: textColor }]} numberOfLines={1}>
              {clientName}
            </Text>
            <Text style={[styles.serviceName, { color: Colors.light.textSecondary }]} numberOfLines={1}>
              {item.service?.name || "Service"}
            </Text>
            <Text style={[styles.serviceName, { color: Colors.light.textSecondary }]} numberOfLines={1}>
              {staffName ? `Pracownik: ${staffName}` : 'Pracownik: nieprzypisany'}
            </Text>
            {proposedLabel ? (
              <Text style={[styles.notesText, { color: '#4338CA' }]} numberOfLines={2}>
                Propozycja: {proposedLabel}
              </Text>
            ) : null}
            {item.notes && (
              <Text style={[styles.notesText, { color: Colors.light.textTertiary }]} numberOfLines={2}>
                {item.notes}
              </Text>
            )}
            {renderStatusBadge(item.status)}
            {item.source && item.source !== 'app' ? (
              <Text style={[styles.notesText, { color: Colors.light.textTertiary }]}>
                {item.source === 'phone' ? 'Telefon' : 'Osobiście'}
              </Text>
            ) : null}
          </View>

          <View style={styles.priceSection}>
            <Text style={[styles.priceText, { color: Colors.primary }]}>
              {item.service?.price_amount || '0'} zł
            </Text>
          </View>
        </View>

        {needsAction && canManage && (
          <View style={styles.actionsWrap}>
            <View style={styles.actionsContainer}>
              <Button
                title="Odrzuć"
                variant="outline"
                size="sm"
                onPress={() => handleCancel(String(item.id))}
                disabled={isLoadingThis}
                style={styles.declineButton}
              />
              <Button
                title="Potwierdź"
                variant="primary"
                size="sm"
                onPress={() => handleConfirm(String(item.id))}
                loading={isLoadingThis}
                style={styles.confirmButton}
              />
            </View>
            <Button
              title="Zaproponuj inny termin"
              variant="outline"
              size="sm"
              onPress={() => setProposeTarget(item)}
              disabled={isLoadingThis}
              style={styles.proposeButton}
            />
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: Colors.light.textSecondary }]}>
          Loading schedule...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor }]}>
      {useSplit ? (
        // Desktop Layout
        <View style={styles.desktopLayout}>
          {/* Desktop Header */}
          <View style={[styles.desktopHeader, { backgroundColor: cardColor }]}>
              <View style={styles.desktopHeaderLeft}>
                <TouchableOpacity
                  onPress={() => goBackToApp(router, '/business')}
                  style={styles.desktopBackButton}
                  accessibilityLabel="Wróć do panelu"
                >
                  <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
                  <Text style={styles.desktopBackLabel}>Wróć</Text>
                </TouchableOpacity>
                <View>
                  <Text style={[styles.desktopTitle, { color: textColor }]}>{canManage ? 'Grafik wizyt' : 'Mój grafik'}</Text>
                  {lastUpdated && (
                    <Text style={[styles.updatedText, { color: Colors.light.textSecondary }]}>Ostatnia aktualizacja: {new Date(lastUpdated).toLocaleTimeString('pl-PL')}</Text>
                  )}
                </View>
              </View>
              <View style={styles.desktopHeaderActions}>
                {canManage ? (
                <TouchableOpacity style={styles.manualButton} onPress={() => openManual()} disabled={!services.length}>
                  <Ionicons name="add" size={20} color="#fff" />
                  <Text style={styles.manualButtonText}>Dodaj wizytę</Text>
                </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                  <Ionicons name="reload" size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

          <View style={styles.desktopContent}>
          {/* Desktop Filters Sidebar */}
            <View style={[styles.desktopFilters, { backgroundColor: cardColor }]}>
              <Text style={[styles.filtersTitle, { color: textColor }]}>Filtry</Text>
              <View style={styles.filterTabs}>
                {filterTabs.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.desktopFilterTab,
                      activeFilter === tab.key && [styles.activeDesktopFilterTab, { backgroundColor: Colors.primary }],
                      { backgroundColor: activeFilter === tab.key ? Colors.primary : 'transparent' }
                    ]}
                    onPress={() => setActiveFilter(tab.key)}
                    accessibilityLabel={`Filter by ${tab.label}`}
                  >
                    <Ionicons
                      name={tab.icon}
                      size={20}
                      color={activeFilter === tab.key ? Colors.light.card : Colors.primary}
                    />
                    <Text style={[
                      styles.desktopFilterTabText,
                      { color: activeFilter === tab.key ? Colors.light.card : textColor }
                    ]}>
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Desktop Appointments List */}
            <View style={styles.desktopAppointments}>
              {isCompletedList ? (
                <CompletedAppointmentsList
                  appointments={filteredAppointments}
                  onAppointmentPress={handleAppointmentPress}
                />
              ) : isStatusList ? (
                <FlatList
                  data={filteredAppointments}
                  keyExtractor={(item) => `${activeFilter}-${item.id}`}
                  renderItem={renderAppointmentCard}
                  contentContainerStyle={styles.statusList}
                  ListEmptyComponent={<Text style={[styles.emptySubtext, { color: Colors.light.textSecondary }]}>Brak wizyt w tej kategorii.</Text>}
                />
              ) : (
                <CalendarGrid
                  key={activeFilter}
                  appointments={filteredAppointments}
                  onAppointmentPress={handleAppointmentPress}
                  daysToShow={activeFilter === 'week' ? 7 : activeFilter === 'today' ? 1 : undefined}
                />
              )}
            </View>

            {!isStatusList && !isCompletedList ? <View style={[styles.desktopQueue, { backgroundColor: cardColor }]}>
              <Text style={[styles.filtersTitle, { color: textColor }]}>Do zatwierdzenia</Text>
              <Text style={[styles.updatedText, { color: Colors.light.textSecondary, marginBottom: Spacing.md }]}>
                {pendingAppointments.length} oczekujących
              </Text>
              <FlatList
                data={pendingAppointments}
                keyExtractor={(item) => `pending-${item.id}`}
                renderItem={renderAppointmentCard}
                ListEmptyComponent={
                  <Text style={[styles.emptySubtext, { color: Colors.light.textSecondary }]}>
                    Brak wizyt do zatwierdzenia.
                  </Text>
                }
              />
            </View> : null}
          </View>
        </View>
      ) : (
        <>
          <View style={[styles.header, { backgroundColor: cardColor, paddingTop: insets.top + Spacing.sm }]}>
            <TouchableOpacity
              onPress={() => goBackToApp(router, '/business')}
              style={styles.backButton}
              accessibilityLabel="Wróć do panelu"
            >
              <Ionicons name="arrow-back" size={22} color={Colors.light.text} />
              <Text style={styles.backLabel}>Wróć</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: textColor }]}>{canManage ? 'Grafik' : 'Mój grafik'}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerIconButton} onPress={onRefresh}>
                <Ionicons name={refreshing ? 'hourglass-outline' : 'reload'} size={20} color={Colors.primary} />
              </TouchableOpacity>
              {canManage ? (
                <TouchableOpacity style={styles.headerAddButton} onPress={() => openManual()} disabled={!services.length}>
                  <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
            contentContainerStyle={styles.filtersContent}
          >
            {mobileTabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  mobileTab === tab.key && styles.activeFilterTab,
                  { backgroundColor: mobileTab === tab.key ? Colors.primary : cardColor },
                ]}
                onPress={() => setMobileTab(tab.key)}
              >
                <Text style={[
                  styles.filterTabText,
                  { color: mobileTab === tab.key ? Colors.light.card : textColor },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.mobileCalendar, { paddingBottom: insets.bottom + (canManage ? 76 : 8) }]}>
            {mobileTab === 'completed' ? (
              <CompletedAppointmentsList
                appointments={appointments.filter((item) => item.status === 'completed')}
                onAppointmentPress={handleAppointmentPress}
              />
            ) : mobileTab === 'pending' ? (
              <FlatList
                data={pendingAppointments}
                keyExtractor={(item) => `pending-${item.id}`}
                renderItem={renderAppointmentCard}
                contentContainerStyle={styles.statusList}
                ListEmptyComponent={<Text style={[styles.emptySubtext, { color: Colors.light.textSecondary }]}>Brak wizyt do zatwierdzenia.</Text>}
              />
            ) : mobileTab === 'cancelled' ? (
              <FlatList
                data={[...appointments.filter((item) => item.status === 'cancelled')].reverse()}
                keyExtractor={(item) => `cancelled-${item.id}`}
                renderItem={renderAppointmentCard}
                contentContainerStyle={styles.statusList}
                ListEmptyComponent={<Text style={[styles.emptySubtext, { color: Colors.light.textSecondary }]}>Brak anulowanych wizyt.</Text>}
              />
            ) : (
              <>
                <MobileDayCalendar
                  selectedDate={selectedDate}
                  onChangeDate={setSelectedDate}
                  appointments={appointments}
                  staff={staff}
                  selectedStaffId={selectedStaffId}
                  onSelectStaff={setSelectedStaffId}
                  onAppointmentPress={handleAppointmentPress}
                  onEmptySlotPress={canManage ? (dateIso, time) => openManual(dateIso, time) : undefined}
                  canManage={canManage}
                  showTimeline={mobileTab === 'calendar'}
                />
                {mobileTab === 'daylist' ? (
                  <FlatList
                    style={{ flex: 1 }}
                    data={dayListAppointments}
                    keyExtractor={(item) => `day-${item.id}`}
                    renderItem={renderAppointmentCard}
                    contentContainerStyle={styles.statusList}
                    ListEmptyComponent={
                      <Text style={[styles.emptySubtext, { color: Colors.light.textSecondary }]}>
                        Brak wizyt w tym dniu.
                      </Text>
                    }
                  />
                ) : null}
              </>
            )}
          </View>

          {canManage ? (
            <TouchableOpacity
              style={[styles.fab, { bottom: insets.bottom + 18 }]}
              onPress={() => openManual()}
              disabled={!services.length}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </>
      )}
      {canManage && businessSlug ? (
        <ManualAppointmentModal
          visible={showManual}
          slug={businessSlug}
          services={services}
          staff={staff}
          initialDate={draftSlot?.date}
          initialTime={draftSlot?.time}
          initialStaffId={selectedStaffId || undefined}
          onClose={() => {
            setShowManual(false);
            setDraftSlot(null);
          }}
          onCreated={loadSchedule}
        />
      ) : null}
      <RescheduleModal
        visible={Boolean(proposeTarget)}
        appointment={proposeTarget}
        submitting={proposeSubmitting}
        title="Zaproponuj inny termin"
        hint="Klient dostanie powiadomienie i będzie mógł zaakceptować albo odrzucić propozycję. Pierwotny termin zostaje do jego odpowiedzi."
        confirmLabel="Wyślij propozycję"
        onClose={() => {
          if (!proposeSubmitting) setProposeTarget(null);
        }}
        onConfirm={handleProposeConfirm}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.xxxl : Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    ...Shadows.sm,
  },
  backButton: {
    marginRight: Spacing.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  backLabel: {
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    flex: 1,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.card,
  },
  headerAddButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  filtersContainer: {
    maxHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filtersContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  mobileCalendar: { flex: 1 },
  fab: {
    position: 'absolute',
    right: 18,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  statusList: { padding: Spacing.sm, paddingBottom: Spacing.xxl, flexGrow: 1 },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.xs,
  },
  activeFilterTab: {
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  listContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  appointmentCard: {
    marginBottom: Spacing.md,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  timeSection: {
    alignItems: 'center',
    minWidth: 80,
    marginRight: Spacing.md,
  },
  timeText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
  dateText: {
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
    fontWeight: Typography.fontWeight.medium,
  },
  infoSection: {
    flex: 1,
  },
  clientName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.xs,
  },
  serviceName: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xs,
  },
  notesText: {
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  priceSection: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  priceText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  actionsWrap: {
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  declineButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
  },
  proposeButton: {
    width: '100%',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed,
  },
  // Desktop styles
  desktopLayout: {
    flex: 1,
    flexDirection: 'column',
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    ...Shadows.sm,
  },
  desktopHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flexShrink: 1,
  },
  desktopBackButton: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.light.backgroundSecondary,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  desktopBackLabel: {
    color: Colors.light.text,
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold as any,
  },
  desktopTitle: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
  },
  desktopHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  desktopContent: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopFilters: {
    width: 280,
    borderRightWidth: 1,
    borderRightColor: Colors.light.border,
    padding: Spacing.lg,
  },
  filtersTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.lg,
  },
  filterTabs: {
    gap: Spacing.sm,
  },
  desktopFilterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: Spacing.sm,
  },
  activeDesktopFilterTab: {
    borderColor: Colors.primary,
  },
  desktopFilterTabText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
  },
  desktopAppointments: {
    flex: 1.2,
  },
  desktopQueue: {
    width: 360,
    borderLeftWidth: 1,
    borderLeftColor: Colors.light.border,
    padding: Spacing.lg,
  },
  desktopListContent: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  desktopEmptyContainer: {
    alignItems: 'center',
    marginTop: Spacing.xxxl * 2,
    paddingHorizontal: Spacing.xl,
  },
  desktopEmptyText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  desktopEmptySubtext: {
    fontSize: Typography.fontSize.md,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed,
  },
  refreshButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.light.card,
  },
  manualButton: { height: 40, paddingHorizontal: 14, borderRadius: BorderRadius.md, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: Colors.primary },
  manualButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  updatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  updatedText: {
    fontSize: Typography.fontSize.sm,
  },
});