import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
  Platform, ActivityIndicator, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { getUserAppointments } from '../../api/appointments';
import { Appointment } from '../../types/api';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';

export default function AccountScreen() {
  const router = useRouter();
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
      
      if (Array.isArray(data)) {
        setAppointments(data);
      } else if (data && typeof data === 'object') {
        const responseData = data as any;
        if (Array.isArray(responseData.results)) {
          setAppointments(responseData.results);
        } else if (Array.isArray(responseData.data)) {
          setAppointments(responseData.data);
        } else {
          setAppointments([]);
        }
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  // Używamy useFocusEffect, aby odświeżyć dane po wejściu w zakładkę
  useFocusEffect(
    useCallback(() => {
      fetchAppointments();
    }, [isLoggedIn])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAppointments();
    setRefreshing(false);
  }, [isLoggedIn]);

  const handleAppointmentPress = (appointment: Appointment) => {
    router.push({
      pathname: '/appointment/[id]',
      params: { id: String(appointment.id) }
    });
  };

  // Ekran dla niezalogowanych
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <LinearGradient 
          colors={['#8B7AB8', '#B8A3E0']} 
          style={styles.notLoggedInGradient}
        >
          <View style={styles.notLoggedInCard}>
            <View style={styles.iconCircle}>
              <Ionicons name="person" size={50} color="#8B7AB8" />
            </View>
            <Text style={styles.title}>Witaj w Sessly!</Text>
            <Text style={styles.subtitle}>Zaloguj się, aby zarządzać swoimi rezerwacjami i ulubionymi miejscami.</Text>
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={() => router.push('/(auth)/login')}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>Zaloguj się lub utwórz konto</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  // Aktywne (przyszłe) wizyty do statystyk
  const upcomingCount = appointments.filter(apt => {
    if (!apt.start || apt.status === 'cancelled') return false;
    return new Date(apt.start) > new Date();
  }).length;

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
      >
        {/* HEADER Z GRADIENTEM */}
        <LinearGradient 
          colors={['#8B7AB8', '#B8A3E0', '#9D8AC7']} 
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Dekoracje tła */}
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />
          <Text style={styles.headerTitle}>Twój Profil</Text>
        </LinearGradient>

        {/* GŁÓWNA KARTA PROFILU (Nachodząca na Header) */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
            </Text>
          </View>
          
          <Text style={styles.userName}>
            {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {user?.is_specialist && (
            <View style={styles.specialistBadge}>
              <Ionicons name="star" size={12} color="#D97706" />
              <Text style={styles.specialistBadgeText}>KONTO SPECJALISTY</Text>
            </View>
          )}

          {/* STATYSTYKI W KARCIE */}
          <View style={styles.statsRow}>
            <TouchableOpacity 
              style={styles.statItem} 
              onPress={() => router.push('/(tabs)/appointments')}
            >
              <Text style={styles.statNumber}>{upcomingCount}</Text>
              <Text style={styles.statLabel}>Wizyty</Text>
            </TouchableOpacity>
            
            <View style={styles.statDivider} />
            
            <TouchableOpacity 
              style={styles.statItem}
              onPress={() => router.push('/(tabs)/favorites')}
            >
              <Text style={styles.statNumber}>{favoritesData.length}</Text>
              <Text style={styles.statLabel}>Ulubione</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* OSTATNIE WIZYTY PREVIEW */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nadchodzące wizyty</Text>
            {appointments.length > 0 && (
              <TouchableOpacity onPress={() => router.push('/(tabs)/appointments')}>
                <Text style={styles.seeAllText}>Wszystkie</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color="#8B7AB8" style={{ marginVertical: 30 }} />
          ) : appointments.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="calendar-outline" size={32} color="#8B7AB8" />
              </View>
              <Text style={styles.emptyText}>Brak nadchodzących wizyt</Text>
              <TouchableOpacity 
                style={styles.bookNowBtn}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={styles.bookNowText}>Znajdź usługę</Text>
              </TouchableOpacity>
            </View>
          ) : (
            appointments.slice(0, 2).map((apt) => {
              const status = apt.status || 'pending';
              const isConfirmed = status === 'confirmed';
              const isCancelled = status === 'cancelled';
              const statusColor = isConfirmed ? '#10B981' : isCancelled ? '#EF4444' : '#F59E0B';
              const statusBg = isConfirmed ? '#D1FAE5' : isCancelled ? '#FEE2E2' : '#FEF3C7';
              
              const date = apt.start ? new Date(apt.start) : null;
              
              return (
                <TouchableOpacity
                  key={apt.id}
                  style={styles.miniAptCard}
                  onPress={() => handleAppointmentPress(apt)}
                  activeOpacity={0.7}
                >
                  <View style={styles.miniAptDateBox}>
                    <Text style={styles.miniAptDay}>{date ? date.getDate() : '-'}</Text>
                    <Text style={styles.miniAptMonth}>
                      {date ? date.toLocaleString('pl-PL', { month: 'short' }).toUpperCase() : '-'}
                    </Text>
                  </View>
                  
                  <View style={styles.miniAptInfo}>
                    <Text style={styles.miniAptService} numberOfLines={1}>
                      {(apt.service as any)?.name || 'Usługa'}
                    </Text>
                    <Text style={styles.miniAptTime}>
                      <Ionicons name="time-outline" size={14} color="#666" /> {date ? date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </Text>
                  </View>
                  
                  <View style={[styles.miniAptStatus, { backgroundColor: statusBg }]}>
                    <Text style={[styles.miniAptStatusText, { color: statusColor }]}>
                      {isConfirmed ? 'Potwierdzona' : isCancelled ? 'Anulowana' : 'Oczekuje'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* PANEL SPECJALISTY (Jeśli dotyczy) */}
        {user?.is_specialist && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Panel Specjalisty</Text>
            <View style={styles.menuGroup}>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/business/manage-services')}>
                <View style={[styles.menuIconBox, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="list" size={20} color="#9333EA" />
                </View>
                <Text style={styles.menuItemText}>Usługi i Cennik</Text>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </TouchableOpacity>
              
              <View style={styles.menuDivider} />

              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/business/schedule')}>
                <View style={[styles.menuIconBox, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="calendar" size={20} color="#2563EB" />
                </View>
                <Text style={styles.menuItemText}>Twój Grafik</Text>
                <Ionicons name="chevron-forward" size={20} color="#CCC" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* USTAWIENIA KONTA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ustawienia Konta</Text>
          <View style={styles.menuGroup}>
            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/edit-profile')}>
              <View style={[styles.menuIconBox, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="person-outline" size={20} color="#4B5563" />
              </View>
              <Text style={styles.menuItemText}>Edytuj profil</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/change-password')}>
              <View style={[styles.menuIconBox, { backgroundColor: '#F3F4F6' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#4B5563" />
              </View>
              <Text style={styles.menuItemText}>Zmień hasło</Text>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </View>
        </View>

        {/* WYLOGUJ */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Wyloguj się</Text>
        </TouchableOpacity>

        {/* Bezpieczny odstęp na dole */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6', // Jasne, nowoczesne tło
  },
  notLoggedInGradient: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  notLoggedInCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  loginButton: {
    flexDirection: 'row',
    backgroundColor: '#8B7AB8',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // Header Styles
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 80, // Duży padding na dole żeby karta mogła na niego najść
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  headerCircle1: {
    position: 'absolute',
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCircle2: {
    position: 'absolute',
    top: 50,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 10,
  },

  // Profile Card (nachodząca na header)
  profileCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -50, // To sprawia że karta wchodzi na gradient
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    marginTop: -40, // Wyciągamy awatar do góry
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#8B7AB8',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  specialistBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 4,
    marginBottom: 20,
  },
  specialistBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },

  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B7AB8',
  },

  // Empty State for Appointments
  emptyStateCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 16,
  },
  bookNowBtn: {
    backgroundColor: '#8B7AB8',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  bookNowText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // Mini Appointment Card
  miniAptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  miniAptDateBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  miniAptDay: {
    fontSize: 18,
    fontWeight: '900',
    color: '#8B7AB8',
  },
  miniAptMonth: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B7AB8',
  },
  miniAptInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  miniAptService: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  miniAptTime: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  miniAptStatus: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  miniAptStatusText: {
    fontSize: 11,
    fontWeight: '800',
  },

  // Menu Groups (Settings)
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 68, // Zostawia linię tylko pod tekstem, nie pod ikoną
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    paddingVertical: 16,
    marginHorizontal: 20,
    backgroundColor: '#FEE2E2',
    borderRadius: 16,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
  },
});