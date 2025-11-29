import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserAppointments, cancelAppointment } from '@/api/appointments';
import { Appointment } from '../../types/api';
import { router } from 'expo-router';

export default function AccountScreen() {
  const { user, isLoggedIn, logout } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pobierz rezerwacje przy montowaniu komponentu
  useEffect(() => {
    if (isLoggedIn) {
      fetchAppointments();
    }
  }, [isLoggedIn]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const data = await getUserAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, []);

  const handleCancelAppointment = (appointmentId: string) => {
    Alert.alert(
      'Anuluj rezerwację',
      'Czy na pewno chcesz anulować tę rezerwację?',
      [
        { text: 'Nie', style: 'cancel' },
        {
          text: 'Tak, anuluj',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelAppointment(appointmentId);
              Alert.alert('Sukces', 'Rezerwacja została anulowana');
              await fetchAppointments(); // Odśwież listę
            } catch (error: any) {
              Alert.alert(
                'Błąd',
                error?.response?.data?.detail || 'Nie udało się anulować rezerwacji'
              );
            }
          },
        },
      ]
    );
  };

  const handleLogout = async () => {
    Alert.alert('Wyloguj się', 'Czy na pewno chcesz się wylogować?', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Wyloguj',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        },
      },
    ]);
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Zaloguj się</Text>
        <Text style={styles.subtitle}>
          Aby zobaczyć swoje rezerwacje i profil, musisz się zalogować.
        </Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/login')} // Utwórz ekran logowania
        >
          <Text style={styles.loginButtonText}>Zaloguj się</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Profil użytkownika */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#999" />
            </View>
          )}
        </View>
        <Text style={styles.userName}>
          {user?.first_name && user?.last_name
            ? `${user.first_name} ${user.last_name}`
            : user?.username || user?.email}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Rezerwacje */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Moje rezerwacje</Text>
        {loading ? (
          <Text style={styles.loadingText}>Ładowanie...</Text>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>Brak rezerwacji</Text>
          </View>
        ) : (
          appointments.map((appointment) => (
            <View key={String(appointment.id)} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <Text style={styles.appointmentBusiness}>
                  {appointment.business || 'Biznes'}
                </Text>
                <Text style={[
                  styles.appointmentStatus,
                  appointment.status === 'confirmed' && styles.statusConfirmed,
                  appointment.status === 'pending' && styles.statusPending,
                  appointment.status === 'cancelled' && styles.statusCancelled,
                ]}>
                  {appointment.status === 'confirmed' ? 'Potwierdzone' :
                   appointment.status === 'pending' ? 'Oczekujące' : 'Anulowane'}
                </Text>
              </View>
              <Text style={styles.appointmentService}>
                {appointment.service?.name || 'Usługa'}
              </Text>
              <Text style={styles.appointmentDate}>
                {new Date(appointment.start).toLocaleString('pl-PL')}
              </Text>
              {appointment.notes && (
                <Text style={styles.appointmentNotes}>
                  Notatki: {appointment.notes}
                </Text>
              )}
              {appointment.status !== 'cancelled' && (
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => handleCancelAppointment(String(appointment.id))}
                >
                  <Text style={styles.cancelButtonText}>Anuluj rezerwację</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
          <Text style={[styles.menuItemText, { color: '#e74c3c' }]}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadingText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
  appointmentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentBusiness: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  appointmentStatus: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusConfirmed: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  statusCancelled: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  appointmentService: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  appointmentNotes: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 8,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignSelf: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
