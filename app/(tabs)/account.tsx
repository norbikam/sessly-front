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
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { getUserAppointments, cancelAppointment } from '../../api/appointments';
import { Appointment } from '../../types/api';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';

export default function AccountScreen() {
  const { user, isLoggedIn, logout } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pobierz rezerwacje przy montowaniu komponentu
  useEffect(() => {
    if (isLoggedIn) {
      console.log('🔵 [AccountScreen] User logged in, fetching appointments');
      fetchAppointments();
    } else {
      console.log('⚠️ [AccountScreen] User not logged in');
    }
  }, [isLoggedIn]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📤 [AccountScreen] Fetching appointments...');
      
      const data = await getUserAppointments();
      
      console.log('✅ [AccountScreen] Appointments fetched:', {
        count: data.length,
        appointments: data,
      });
      
      setAppointments(data);
    } catch (err: any) {
      console.error('❌ [AccountScreen] Failed to fetch appointments:', err);
      console.error('❌ [AccountScreen] Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      
      setError(
        err?.response?.data?.detail || 
        err?.response?.data?.message || 
        'Nie udało się pobrać rezerwacji'
      );
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    console.log('🔄 [AccountScreen] Refreshing appointments...');
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, []);

  const handleCancelAppointment = (appointment: Appointment) => {
    console.log('🔵 [AccountScreen] Cancel appointment clicked:', appointment.id);
    
    const serviceName = appointment.service?.name || 'Usługa';
    const appointmentDate = formatDate(appointment.start);
    const appointmentInfo = `${serviceName} - ${appointmentDate}`;
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Czy na pewno chcesz anulować rezerwację?\n\n${appointmentInfo}`
      );
      
      if (confirmed) {
        performCancelAppointment(appointment.id);
      }
    } else {
      Alert.alert(
        'Anuluj rezerwację',
        `Czy na pewno chcesz anulować tę rezerwację?\n\n${appointmentInfo}`,
        [
          { text: 'Nie', style: 'cancel' },
          {
            text: 'Tak, anuluj',
            style: 'destructive',
            onPress: () => performCancelAppointment(appointment.id),
          },
        ]
      );
    }
  };

  const performCancelAppointment = async (appointmentId: string | number | undefined) => {
    if (!appointmentId) {
      console.error('❌ [AccountScreen] No appointment ID provided');
      return;
    }
    
    try {
      console.log('📤 [AccountScreen] Cancelling appointment:', appointmentId);
      await cancelAppointment(String(appointmentId));
      
      console.log('✅ [AccountScreen] Appointment cancelled successfully');
      
      if (Platform.OS === 'web') {
        window.alert('Rezerwacja została anulowana');
      } else {
        Alert.alert('Sukces', 'Rezerwacja została anulowana');
      }
      
      await fetchAppointments(); // Odśwież listę
    } catch (err: any) {
      console.error('❌ [AccountScreen] Cancel appointment error:', err);
      console.error('❌ [AccountScreen] Error details:', {
        message: err?.message,
        response: err?.response?.data,
        status: err?.response?.status,
      });
      
      const errorMsg = err?.response?.data?.detail || 
        err?.response?.data?.message || 
        'Nie udało się anulować rezerwacji';
      
      if (Platform.OS === 'web') {
        window.alert(`Błąd:\n${errorMsg}`);
      } else {
        Alert.alert('Błąd', errorMsg);
      }
    }
  };

  const handleLogout = async () => {
    console.log('🔵 [AccountScreen] Logout clicked');
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Czy na pewno chcesz się wylogować?');
      if (confirmed) {
        performLogout();
      }
    } else {
      Alert.alert('Wyloguj się', 'Czy na pewno chcesz się wylogować?', [
        { text: 'Anuluj', style: 'cancel' },
        {
          text: 'Wyloguj',
          style: 'destructive',
          onPress: performLogout,
        },
      ]);
    }
  };

  const performLogout = async () => {
    try {
      console.log('📤 [AccountScreen] Logging out...');
      await logout();
      console.log('✅ [AccountScreen] Logged out successfully');
      router.replace('/');
    } catch (err) {
      console.error('❌ [AccountScreen] Logout error:', err);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Brak daty';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getBusinessName = (business: string | any | undefined): string => {
    if (!business) return 'Biznes';
    if (typeof business === 'string') return business;
    return business.name || 'Biznes';
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return { bg: '#d4edda', text: '#155724' };
      case 'pending':
        return { bg: '#fff3cd', text: '#856404' };
      case 'cancelled':
        return { bg: '#f8d7da', text: '#721c24' };
      default:
        return { bg: '#e2e3e5', text: '#383d41' };
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return 'Potwierdzone';
      case 'pending':
        return 'Oczekujące';
      case 'cancelled':
        return 'Anulowane';
      default:
        return status || 'Nieznany';
    }
  };

  // Ekran dla niezalogowanego użytkownika
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="person-circle-outline" size={80} color={Colors.accent} />
          <Text style={styles.title}>Zaloguj się</Text>
          <Text style={styles.subtitle}>
            Aby zobaczyć swoje rezerwacje i profil, musisz się zalogować.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Ionicons name="log-in-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.loginButtonText}>Zaloguj się</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.registerButtonText}>Utwórz konto</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          tintColor={Colors.accent}
          colors={[Colors.accent]}
        />
      }
    >
      {/* Profil użytkownika */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {user?.avatar ? (
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={40} color="#fff" />
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Moje rezerwacje</Text>
          {appointments.length > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{appointments.length}</Text>
            </View>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={styles.loadingText}>Ładowanie rezerwacji...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchAppointments}>
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
            </TouchableOpacity>
          </View>
        ) : appointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Brak rezerwacji</Text>
            <Text style={styles.emptyStateText}>
              Nie masz jeszcze żadnych rezerwacji. Znajdź biznes i umów wizytę!
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.exploreButtonText}>Przeglądaj usługi</Text>
            </TouchableOpacity>
          </View>
        ) : (
          appointments.map((appointment) => {
            const statusColors = getStatusColor(appointment.status);
            return (
              <View key={String(appointment.id)} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentHeaderLeft}>
                    <Ionicons name="business" size={20} color={Colors.accent} />
                    <Text style={styles.appointmentBusiness}>
                      {getBusinessName(appointment.business)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.appointmentStatus,
                      { backgroundColor: statusColors.bg },
                    ]}
                  >
                    <Text style={[styles.appointmentStatusText, { color: statusColors.text }]}>
                      {getStatusLabel(appointment.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.appointmentDetails}>
                  <View style={styles.appointmentDetailRow}>
                    <Ionicons name="cut-outline" size={16} color="#666" />
                    <Text style={styles.appointmentService}>
                      {appointment.service?.name || 'Usługa'}
                    </Text>
                  </View>

                  <View style={styles.appointmentDetailRow}>
                    <Ionicons name="calendar-outline" size={16} color="#666" />
                    <Text style={styles.appointmentDate}>
                      {formatDate(appointment.start)}
                    </Text>
                  </View>

                  {appointment.notes && (
                    <View style={styles.appointmentDetailRow}>
                      <Ionicons name="document-text-outline" size={16} color="#666" />
                      <Text style={styles.appointmentNotes}>{appointment.notes}</Text>
                    </View>
                  )}
                </View>

                {appointment.status !== 'cancelled' && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelAppointment(appointment)}
                  >
                    <Ionicons name="close-circle-outline" size={18} color="#fff" />
                    <Text style={styles.cancelButtonText}>Anuluj rezerwację</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ustawienia</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={24} color="#666" />
          <Text style={styles.menuItemText}>Edytuj profil</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <Text style={styles.menuItemText}>Powiadomienia</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
          <Text style={[styles.menuItemText, { color: '#e74c3c' }]}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  badge: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    marginTop: 12,
    marginBottom: 16,
    color: '#e74c3c',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  exploreButton: {
    marginTop: 20,
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  appointmentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  appointmentBusiness: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  appointmentStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appointmentStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  appointmentDetails: {
    gap: 8,
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appointmentService: {
    fontSize: 15,
    color: '#666',
    flex: 1,
  },
  appointmentDate: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
  appointmentNotes: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    flex: 1,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e74c3c',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  menuItemText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#333',
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
    color: '#333',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 32,
    lineHeight: 22,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginBottom: 12,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  registerButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.accent,
  },
  registerButtonText: {
    color: Colors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});