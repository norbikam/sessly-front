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
import AppointmentCard from '../../components/appointments/AppointmentCard';

type FilterType = 'all' | 'upcoming' | 'past' | 'cancelled';

const FILTERS: { value: FilterType; label: string; icon: string }[] = [
  { value: 'all', label: 'Wszystkie', icon: 'list' },
  { value: 'upcoming', label: 'Nadchodzące', icon: 'calendar' },
  { value: 'past', label: 'Przeszłe', icon: 'time' },
  { value: 'cancelled', label: 'Anulowane', icon: 'close-circle' },
];

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
      const data = await getUserAppointments();
      setAppointments(data);
      setError(null);
    } catch (e: any) {
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
      Alert.alert('Anuluj wizytę', confirmMessage, [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak, anuluj',
          style: 'destructive',
          onPress: () => performCancel(appointmentId),
        },
      ]);
    }
  };

  const performCancel = async (appointmentId: string | number) => {
    try {
      await cancelAppointment(String(appointmentId));
      fetchAppointments();

      if (Platform.OS === 'web') {
        window.alert('Wizyta została anulowana');
      } else {
        Alert.alert('Sukces', 'Wizyta została anulowana');
      }
    } catch (e: any) {
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Ładowanie wizyt...</Text>
      </View>
    );
  }

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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Twoje wizyty</Text>
        <Text style={styles.headerSubtitle}>
          {filteredAppointments.length} {filteredAppointments.length === 1 ? 'wizyta' : 'wizyt'}
        </Text>
      </View>

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

      <FlatList
        data={filteredAppointments}
        renderItem={({ item }) => (
          <AppointmentCard 
            appointment={item} 
            onCancel={handleCancelAppointment}
            onBusinessPress={handleBusinessPress} 
          />
        )}
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