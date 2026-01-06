import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
  Alert, Image, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { getUserAppointments } from '../../api/appointments';
import { Appointment } from '../../types/api';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';

export default function AccountScreen() {
  const { user, isLoggedIn, logout } = useAuth();
  const { favoritesData } = useFavorites();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = async () => {
    if (!isLoggedIn) {
      setAppointments([]);
      return;
    }
    
    try {
      setLoading(true);
      const data = await getUserAppointments();
      
      console.log('🔵 [AccountScreen] Appointments loaded:', {
        data,
        type: typeof data,
        isArray: Array.isArray(data),
      });
      
      // ✅ FIX: Upewnij się że data jest tablicą
      if (Array.isArray(data)) {
        setAppointments(data);
      } else if (data && typeof data === 'object') {
        // Backend może zwracać { results: [...] } lub { data: [...] }
        const responseData = data as any;
        if (Array.isArray(responseData.results)) {
          setAppointments(responseData.results);
        } else if (Array.isArray(responseData.data)) {
          setAppointments(responseData.data);
        } else {
          console.error('❌ Invalid appointments format:', data);
          setAppointments([]);
        }
      } else {
        console.error('❌ Appointments is not an array:', typeof data, data);
        setAppointments([]);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [isLoggedIn]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, []);

  // ✅ Handle appointment press - navigate to detail
  const handleAppointmentPress = (appointment: Appointment) => {
    router.push({
      pathname: '/appointment/[id]',
      params: { id: String(appointment.id) }
    });
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="person-circle-outline" size={100} color={Colors.accent} />
          <Text style={styles.title}>Witaj w Sessly!</Text>
          <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginButtonText}>Zaloguj się</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
    >
      {/* ✅ NOTCH FIX */}
      <View style={{ paddingTop: Platform.OS === 'web' ? 0 : 38 }} />

      <View style={styles.profileSection}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.userName}>{user?.first_name} {user?.last_name || user?.username}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        
        {user?.is_specialist && (
          <View style={styles.specialistBadge}>
            <Text style={styles.specialistBadgeText}>PROFIL SPECJALISTY</Text>
          </View>
        )}
      </View>

      {/* ✅ STATYSTYKI */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Ionicons name="calendar-outline" size={24} color={Colors.accent} />
          <Text style={styles.statNumber}>{appointments.length}</Text>
          <Text style={styles.statLabel}>Wizyty</Text>
        </View>
        <View style={styles.statBox}>
          <Ionicons name="heart-outline" size={24} color="#e74c3c" />
          <Text style={styles.statNumber}>{favoritesData.length}</Text>
          <Text style={styles.statLabel}>Ulubione</Text>
        </View>
      </View>

      {/* PANEL SPECJALISTY */}
      {user?.is_specialist && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={22} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Zarządzanie Biznesem</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.specialistMenuBtn}
            onPress={() => router.push('/business/manage-services' as any)}
          >
            <Ionicons name="list-outline" size={24} color={Colors.accent} style={styles.specialistMenuIcon} />
            <Text style={styles.specialistMenuText}>Moje Usługi i Cennik</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.specialistMenuBtn}
            onPress={() => router.push('/business/schedule' as any)}
          >
            <Ionicons name="calendar" size={24} color={Colors.accent} style={styles.specialistMenuIcon} />
            <Text style={styles.specialistMenuText}>Twój Grafik Wizyt</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>
      )}

      {/* OSTATNIE WIZYTY */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar" size={22} color={Colors.accent} />
          <Text style={styles.sectionTitle}>Twoje wizyty</Text>
        </View>
        
        {loading ? (
          <ActivityIndicator size="small" color={Colors.accent} style={{ marginVertical: 20 }} />
        ) : appointments.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <Ionicons name="calendar-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Nie masz żadnych wizyt</Text>
            <Text style={styles.emptySubtext}>Umów swoją pierwszą wizytę już teraz!</Text>
          </View>
        ) : (
          <>
            {appointments.slice(0, 3).map((apt) => {
              const status = apt.status || 'pending';
              const statusColor = 
                status === 'confirmed' ? '#10b981' : 
                status === 'cancelled' ? '#ef4444' : 
                '#f59e0b';
              
              return (
                <TouchableOpacity
                  key={apt.id}
                  style={styles.appointmentCard}
                  onPress={() => handleAppointmentPress(apt)}
                  activeOpacity={0.7}
                >
                  <View style={styles.appointmentContent}>
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentService}>
                        {(apt.service as any)?.name || 'Usługa'}
                      </Text>
                      <Text style={styles.appointmentDate}>
                        {apt.start ? new Date(apt.start).toLocaleDateString('pl-PL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Brak daty'}
                      </Text>
                    </View>
                    <View style={styles.appointmentRight}>
                      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                        <Text style={styles.statusText}>
                          {status === 'confirmed' ? 'Potwierdzona' : 
                           status === 'cancelled' ? 'Anulowana' : 
                           'Oczekuje'}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#999" style={{ marginTop: 8 }} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            
            {appointments.length > 3 && (
              <TouchableOpacity 
                style={styles.viewAllButton}
                onPress={() => router.push('/(tabs)/appointments' as any)}
              >
                <Text style={styles.viewAllButtonText}>Zobacz wszystkie wizyty</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.accent} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {/* USTAWIENIA */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings" size={22} color={Colors.accent} />
          <Text style={styles.sectionTitle}>Ustawienia</Text>
        </View>
        
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/edit-profile' as any)}>
          <Ionicons name="person-outline" size={20} color="#666" />
          <Text style={styles.menuItemText}>Edytuj profil</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/change-password' as any)}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" />
          <Text style={styles.menuItemText}>Zmień hasło</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={[styles.menuItemText, { color: '#ef4444' }]}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f9',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  specialistBadge: {
    marginTop: 12,
    backgroundColor: '#fef3c7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  specialistBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
    letterSpacing: 0.5,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginLeft: 8,
  },
  specialistMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 8,
  },
  specialistMenuIcon: {
    marginRight: 12,
  },
  specialistMenuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    marginLeft: 12,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentService: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  appointmentDate: {
    fontSize: 13,
    color: '#666',
  },
  appointmentRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 10,
  },
  viewAllButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    marginRight: 4,
  },
  emptyStateContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    marginTop: 6,
  },
  loginButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    marginTop: 16,
  },
});