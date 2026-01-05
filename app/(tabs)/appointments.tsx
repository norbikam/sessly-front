import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserAppointments, cancelAppointment } from '../../api/appointments';
import { Appointment } from '../../types/api';
import Colors from '../../constants/Colors';

type FilterType = 'all' | 'upcoming' | 'past' | 'cancelled';

const FILTERS: { value: FilterType; label: string; icon: string }[] = [
  { value: 'all', label: 'Wszystkie', icon: 'list' },
  { value: 'upcoming', label: 'Nadchodzące', icon: 'calendar' },
  { value: 'past', label: 'Przeszłe', icon: 'time' },
  { value: 'cancelled', label: 'Anulowane', icon: 'close-circle' },
];

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'confirmed':
      return { label: 'Potwierdzona', color: '#10b981', bg: '#d1fae5' };
    case 'pending':
      return { label: 'Oczekująca', color: '#f59e0b', bg: '#fef3c7' };
    case 'cancelled':
      return { label: 'Anulowana', color: '#ef4444', bg: '#fee2e2' };
    default:
      return { label: status, color: '#6b7280', bg: '#f3f4f6' };
  }
};

export default function AppointmentsScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }

    try {
      console.log('📤 [Appointments] Fetching appointments...');
      const data = await getUserAppointments();
      console.log('✅ [Appointments] Loaded:', data.length);
      
      setAppointments(data);
      setError(null);
    } catch (e: any) {
      console.error('❌ [Appointments] Error:', e);
      setError('Nie udało się załadować wizyt');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAppointments();
  };

  const handleCancelAppointment = (appointmentId: string | number) => {
    const confirmMessage = 'Czy na pewno chcesz anulować tę wizytę?';

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        performCancel(appointmentId);
      }
    } else {
      Alert.alert(
        'Anuluj wizytę',
        confirmMessage,
        [
          { text: 'Nie', style: 'cancel' },
          {
            text: 'Tak, anuluj',
            style: 'destructive',
            onPress: () => performCancel(appointmentId),
          },
        ]
      );
    }
  };

  const performCancel = async (appointmentId: string | number) => {
    try {
      console.log('📤 [Appointments] Cancelling appointment:', appointmentId);
      await cancelAppointment(String(appointmentId));
      console.log('✅ [Appointments] Cancelled successfully');

      // Refresh list
      fetchAppointments();

      if (Platform.OS === 'web') {
        window.alert('Wizyta została anulowana');
      } else {
        Alert.alert('Sukces', 'Wizyta została anulowana');
      }
    } catch (e: any) {
      console.error('❌ [Appointments] Cancel error:', e);
      
      const errorMessage = e?.response?.data?.detail || e?.message || 'Nie udało się anulować wizyty';

      if (Platform.OS === 'web') {
        window.alert(`Błąd: ${errorMessage}`);
      } else {
        Alert.alert('Błąd', errorMessage);
      }
    }
  };

  const handleBusinessPress = (businessSlug: string) => {
    router.push({
      pathname: '/business/[id]',
      params: { id: businessSlug },
    });
  };

  // Filter appointments
  const filteredAppointments = useMemo(() => {
    const now = new Date();

    switch (filter) {
      case 'upcoming':
        return appointments.filter((apt) => {
          if (!apt.start || !apt.status) return false;
          const startDate = new Date(apt.start);
          return startDate > now && apt.status !== 'cancelled';
        });
      case 'past':
        return appointments.filter((apt) => {
          if (!apt.start || !apt.status) return false;
          const startDate = new Date(apt.start);
          return startDate <= now && apt.status !== 'cancelled';
        });
      case 'cancelled':
        return appointments.filter((apt) => apt.status === 'cancelled');
      default:
        return appointments;
    }
  }, [appointments, filter]);

  const renderAppointment = useCallback(
    ({ item }: { item: Appointment }) => {
      const statusInfo = getStatusInfo(item.status || 'pending');
      const canCancel = item.status === 'confirmed' || item.status === 'pending';

      const startDate = item.start ? new Date(item.start) : null;
      const formattedDate = startDate
        ? startDate.toLocaleString('pl-PL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Termin nieustalony';

      // Pobierz nazwę firmy (może być string lub obiekt)
      const businessName = typeof item.business === 'string' 
        ? item.business 
        : (item.business as any)?.name || 'Firma';

      const businessSlug = typeof item.business === 'string'
        ? item.business
        : (item.business as any)?.slug || String(item.business);

      return (
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.serviceInfo}>
              <Text style={styles.serviceName} numberOfLines={1}>
                {item.service?.name || 'Brak nazwy usługi'}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
          </View>

          {/* Business */}
          {item.business && (
            <TouchableOpacity
              style={styles.businessRow}
              onPress={() => handleBusinessPress(businessSlug)}
            >
              <Ionicons name="business" size={18} color={Colors.accent} />
              <Text style={styles.businessText} numberOfLines={1}>
                {businessName}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </TouchableOpacity>
          )}

          {/* Date & Time */}
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={18} color="#666" />
            <Text style={styles.detailText}>{formattedDate}</Text>
          </View>

          {/* Service Duration */}
          {item.service?.duration && (
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.detailText}>
                {(item.service as any).duration_minutes || item.service.duration} min
              </Text>
            </View>
          )}

          {/* Notes */}
          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notatki:</Text>
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}

          {/* Cancel Button */}
          {canCancel && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => handleCancelAppointment(item.id)}
            >
              <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
              <Text style={styles.cancelButtonText}>Anuluj wizytę</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
    []
  );

  // Not logged in
  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="log-in-outline" size={64} color={Colors.accent} />
        <Text style={styles.emptyText}>Zaloguj się, aby zobaczyć wizyty</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/(auth)/login')}
        >
          <Text style={styles.loginButtonText}>Zaloguj się</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Loading
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Ładowanie wizyt...</Text>
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#e74c3c" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchAppointments} style={styles.retryButton}>
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.retryText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Empty state for filter
  const renderEmpty = () => {
    const emptyMessages: Record<FilterType, { icon: string; text: string; subtext: string }> = {
      all: {
        icon: 'calendar-outline',
        text: 'Brak wizyt',
        subtext: 'Zarezerwuj swoją pierwszą wizytę',
      },
      upcoming: {
        icon: 'calendar-outline',
        text: 'Brak nadchodzących wizyt',
        subtext: 'Zarezerwuj nową wizytę',
      },
      past: {
        icon: 'time-outline',
        text: 'Brak przeszłych wizyt',
        subtext: 'Twoje zakończone wizyty pojawią się tutaj',
      },
      cancelled: {
        icon: 'close-circle-outline',
        text: 'Brak anulowanych wizyt',
        subtext: 'To dobrze! Nie anulowałeś żadnych wizyt',
      },
    };

    const message = emptyMessages[filter];

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name={message.icon as any} size={60} color="#ddd" />
        </View>
        <Text style={styles.emptyText}>{message.text}</Text>
        <Text style={styles.emptySubtext}>{message.subtext}</Text>
        
        {(filter === 'all' || filter === 'upcoming') && (
          <TouchableOpacity
            style={styles.exploreButton}
            onPress={() => router.push('/(tabs)' as any)}
          >
            <Ionicons name="search" size={20} color="#fff" />
            <Text style={styles.exploreButtonText}>Przeglądaj firmy</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Twoje wizyty</Text>
        <Text style={styles.headerSubtitle}>
          {filteredAppointments.length} {filteredAppointments.length === 1 ? 'wizyta' : 'wizyt'}
        </Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Ionicons
              name={f.icon as any}
              size={16}
              color={filter === f.value ? '#fff' : Colors.accent}
            />
            <Text
              style={[styles.filterText, filter === f.value && styles.filterTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={filteredAppointments}
        renderItem={renderAppointment}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[
          styles.list,
          filteredAppointments.length === 0 && styles.listEmpty,
        ]}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e74c3c',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: Platform.OS === 'web' ? 50 : 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  filtersContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF5F0',
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 16,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    gap: 8,
  },
  businessText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});