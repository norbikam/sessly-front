import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
  Alert, Image, Platform, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { getUserAppointments, cancelAppointment } from '../../api/appointments';
import { searchBusinesses } from '../../api/business';
import { Appointment, Business } from '../../types/api';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';

export default function AccountScreen() {
  const { user, isLoggedIn, logout } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [favoriteBusinesses, setFavoriteBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = async () => {
    if (!isLoggedIn) return;
    try {
      setLoading(true);
      const data = await getUserAppointments();
      setAppointments(data);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFavoriteBusinesses = async () => {
    if (favorites.length === 0) { setFavoriteBusinesses([]); return; }
    try {
      setFavoritesLoading(true);
      const allBusinesses = await searchBusinesses();
      const favs = allBusinesses.filter((b) => favorites.includes(b.slug || String(b.id)));
      setFavoriteBusinesses(favs);
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setFavoritesLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    loadFavoriteBusinesses();
  }, [isLoggedIn, favorites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAppointments(), loadFavoriteBusinesses()]);
    setRefreshing(false);
  }, [favorites]);

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

      {/* ✅ PANEL SPECJALISTY - ZAKTUALIZOWANY */}
      {user?.is_specialist && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="briefcase" size={22} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Zarządzanie Biznesem</Text>
          </View>
          
          <View style={{ gap: 10 }}>
            <TouchableOpacity 
              style={styles.specialistMenuBtn}
              onPress={() => router.push('/business/manage-services' as any)}
            >
              <View style={styles.specialistBtnIcon}>
                <Ionicons name="list" size={20} color="#fff" />
              </View>
              <Text style={styles.specialistMenuBtnText}>Moje Usługi i Cennik</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" style={{ opacity: 0.7 }} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.specialistMenuBtn, { backgroundColor: '#34d399' }]}
              onPress={() => router.push('/business/schedule' as any)}
            >
              <View style={[styles.specialistBtnIcon, { backgroundColor: '#059669' }]}>
                <Ionicons name="calendar-number" size={20} color="#fff" />
              </View>
              <Text style={styles.specialistMenuBtnText}>Twój Grafik Wizyt</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" style={{ opacity: 0.7 }} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* REZERWACJE KLIENTA */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar" size={22} color={Colors.accent} />
          <Text style={styles.sectionTitle}>Twoje wizyty ({appointments.length})</Text>
        </View>
        {appointments.length === 0 ? (
          <Text style={styles.emptyText}>Brak nadchodzących wizyt.</Text>
        ) : (
          appointments.slice(0, 3).map((app) => (
            <View key={String(app.id)} style={styles.appointmentSmallCard}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', color: '#333' }}>{app.service?.name}</Text>
                <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
                  {app.start 
                    ? new Date(app.start).toLocaleString('pl-PL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) 
                    : 'Termin nieustalony'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#ccc" />
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ustawienia</Text>
        <TouchableOpacity style={styles.menuItem} onPress={logout}>
          <Ionicons name="log-out-outline" size={24} color="#e74c3c" />
          <Text style={[styles.menuItemText, { color: '#e74c3c' }]}>Wyloguj się</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  notLoggedInContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 100 },
  profileSection: { backgroundColor: '#fff', padding: 24, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  userName: { fontSize: 22, fontWeight: '700', color: '#333' },
  userEmail: { fontSize: 14, color: '#666', marginTop: 4 },
  specialistBadge: { marginTop: 10, backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#3b82f6' },
  specialistBadgeText: { color: '#3b82f6', fontSize: 10, fontWeight: '800' },
  section: { backgroundColor: '#fff', marginTop: 12, padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', flex: 1 },
  specialistMenuBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  specialistBtnIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  specialistMenuBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    flex: 1,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#f8f8f8' },
  menuItemText: { fontSize: 16, marginLeft: 12, color: '#333', flex: 1 },
  appointmentSmallCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  emptyText: { color: '#999', fontStyle: 'italic' },
  loginButton: { backgroundColor: Colors.accent, padding: 15, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 20 },
  loginButtonText: { color: '#fff', fontWeight: 'bold' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 20 }
});