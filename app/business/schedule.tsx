import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Platform, Alert, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import {
  getBusinessAppointments,
  confirmAppointment,
  cancelBusinessAppointment
} from '../../api/appointments';
import { Appointment } from '../../types/api';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../constants/designTokens';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useResponsive } from '../../hooks/useResponsive';

type FilterType = 'all' | 'today' | 'week' | 'pending' | 'confirmed';

export default function ScheduleScreen() {
  const [businessSlug, setBusinessSlug] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');
  const { isDesktop, isMobile } = useResponsive();

  // Initialize business data
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get('/businesses/my-business/');
        let data = response.data;
        if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
          data = (data as any).results;
        }

        if (Array.isArray(data) && data.length > 0) {
          const slug = String(data[0].slug || data[0].id);
          setBusinessSlug(slug);
          await loadSchedule(slug);
        } else {
          setLoading(false);
        }
      } catch (e) {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadSchedule = async (slugToUse?: string) => {
    const targetSlug = slugToUse || businessSlug;
    if (!targetSlug) return;

    try {
      const data = await getBusinessAppointments(targetSlug);
      const sorted = data.sort((a, b) =>
        new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime()
      );
      setAppointments(sorted);
    } catch (e) {
      console.error("Error loading schedule:", e);
      Alert.alert('Error', 'Failed to load appointments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  // Filter appointments based on active filter
  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekFromNow = new Date(today);
    weekFromNow.setDate(today.getDate() + 7);

    return appointments.filter(appointment => {
      const appointmentDate = appointment.start ? new Date(appointment.start) : null;

      switch (activeFilter) {
        case 'today':
          return appointmentDate && appointmentDate.toDateString() === today.toDateString();
        case 'week':
          return appointmentDate && appointmentDate >= today && appointmentDate <= weekFromNow;
        case 'pending':
          return appointment.status === 'pending';
        case 'confirmed':
          return appointment.status === 'confirmed';
        default:
          return true;
      }
    });
  }, [appointments, activeFilter]);

  // Filter tabs data
  const filterTabs = [
    { key: 'all', label: 'All', icon: 'calendar-outline' },
    { key: 'today', label: 'Today', icon: 'today-outline' },
    { key: 'week', label: 'This Week', icon: 'time-outline' },
    { key: 'pending', label: 'Pending', icon: 'hourglass-outline' },
    { key: 'confirmed', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  ] as const;

  const handleConfirm = async (id: string) => {
    if (!businessSlug) return;
    try {
      setActionLoading(id);
      await confirmAppointment(businessSlug, id);
      Alert.alert('Success', 'Appointment confirmed.');
      loadSchedule();
    } catch (e) {
      Alert.alert('Error', 'Failed to confirm appointment.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          if (!businessSlug) return;
          try {
            setActionLoading(id);
            await cancelBusinessAppointment(businessSlug, id);
            Alert.alert('Cancelled', 'Appointment has been cancelled.');
            loadSchedule();
          } catch (e) {
            Alert.alert('Error', 'Failed to cancel appointment.');
          } finally {
            setActionLoading(null);
          }
        }
      }
    ]);
  };

  const renderStatusBadge = (status?: string) => {
    const statusConfig = {
      pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending' },
      confirmed: { bg: '#D1FAE5', text: '#059669', label: 'Confirmed' },
      cancelled: { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled' },
      completed: { bg: '#E0E7FF', text: '#2563EB', label: 'Completed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <View style={[styles.badge, { backgroundColor: config.bg }]}>
        <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
      </View>
    );
  };

  const renderAppointmentCard = ({ item }: { item: Appointment }) => {
    const isPending = item.status === 'pending';
    const isLoadingThis = actionLoading === String(item.id);

    const clientName = (item as any).user?.first_name
      ? `${(item as any).user.first_name} ${(item as any).user.last_name || ''}`.trim()
      : (item as any).user_email || 'Sessly Client';

    const appointmentDate = item.start ? new Date(item.start) : null;
    const timeString = appointmentDate
      ? appointmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const dateString = appointmentDate
      ? appointmentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : '';

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
            {item.notes && (
              <Text style={[styles.notesText, { color: Colors.light.textTertiary }]} numberOfLines={2}>
                {item.notes}
              </Text>
            )}
            {renderStatusBadge(item.status)}
          </View>

          <View style={styles.priceSection}>
            <Text style={[styles.priceText, { color: Colors.primary }]}>
              ${item.service?.price || '0'}
            </Text>
          </View>
        </View>

        {isPending && (
          <View style={styles.actionsContainer}>
            <Button
              title="Decline"
              variant="outline"
              size="sm"
              onPress={() => handleCancel(String(item.id))}
              disabled={isLoadingThis}
              style={styles.declineButton}
            />
            <Button
              title="Confirm"
              variant="primary"
              size="sm"
              onPress={() => handleConfirm(String(item.id))}
              loading={isLoadingThis}
              style={styles.confirmButton}
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
      {isDesktop ? (
        // Desktop Layout
        <View style={styles.desktopLayout}>
          {/* Desktop Header */}
          <View style={[styles.desktopHeader, { backgroundColor: cardColor }]}>
            <Text style={[styles.desktopTitle, { color: textColor }]}>Appointment Schedule</Text>
            <View style={styles.desktopHeaderActions}>
              {/* Could add refresh button, settings, etc. */}
            </View>
          </View>

          <View style={styles.desktopContent}>
          {/* Desktop Filters Sidebar */}
            <View style={[styles.desktopFilters, { backgroundColor: cardColor }]}>
              <Text style={[styles.filtersTitle, { color: textColor }]}>Filters</Text>
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
              <FlatList
                data={filteredAppointments}
                keyExtractor={(item) => String(item.id)}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={Colors.primary}
                    colors={[Colors.primary]}
                  />
                }
                contentContainerStyle={styles.desktopListContent}
                renderItem={renderAppointmentCard}
                ListEmptyComponent={
                  <View style={styles.desktopEmptyContainer}>
                    <Ionicons name="calendar-outline" size={80} color={Colors.light.textSecondary} />
                    <Text style={[styles.desktopEmptyText, { color: textColor }]}>
                      No appointments found
                    </Text>
                    <Text style={[styles.desktopEmptySubtext, { color: Colors.light.textSecondary }]}>
                      {activeFilter === 'all'
                        ? "When clients book appointments, they'll appear here."
                        : `No ${activeFilter} appointments at the moment.`
                      }
                    </Text>
                  </View>
                }
              />
            </View>
          </View>
        </View>
      ) : (
        // Mobile Layout (existing)
        <>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: cardColor }]}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: textColor }]}>Appointment Schedule</Text>
            <View style={styles.headerSpacer} />
          </View>

          {/* Filter Tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filtersContainer}
            contentContainerStyle={styles.filtersContent}
          >
            {filterTabs.map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  activeFilter === tab.key && styles.activeFilterTab,
                  { backgroundColor: activeFilter === tab.key ? Colors.primary : cardColor }
                ]}
                onPress={() => setActiveFilter(tab.key)}
                accessibilityLabel={`Filter by ${tab.label}`}
              >
                <Ionicons
                  name={tab.icon}
                  size={16}
                  color={activeFilter === tab.key ? Colors.light.card : Colors.primary}
                />
                <Text style={[
                  styles.filterTabText,
                  { color: activeFilter === tab.key ? Colors.light.card : textColor }
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Appointments List */}
          <FlatList
            data={filteredAppointments}
            keyExtractor={(item) => String(item.id)}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            contentContainerStyle={styles.listContent}
            renderItem={renderAppointmentCard}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={64} color={Colors.light.textSecondary} />
                <Text style={[styles.emptyText, { color: textColor }]}>
                  No appointments found
                </Text>
                <Text style={[styles.emptySubtext, { color: Colors.light.textSecondary }]}>
                  {activeFilter === 'all'
                    ? "When clients book appointments, they'll appear here."
                    : `No ${activeFilter} appointments at the moment.`
                  }
                </Text>
              </View>
            }
          />
        </>
      )}
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
    padding: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    flex: 1,
  },
  headerSpacer: { width: 40 },
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
  actionsContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  declineButton: {
    flex: 1,
  },
  confirmButton: {
    flex: 1,
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
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    ...Shadows.sm,
  },
  desktopTitle: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
  },
  desktopHeaderActions: {
    position: 'absolute',
    right: Spacing.xl,
    top: Spacing.lg,
    flexDirection: 'row',
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
    flex: 1,
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
});