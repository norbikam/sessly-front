import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Platform, ActivityIndicator } from 'react-native';
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
  const { favoritesData, refreshFavorites } = useFavorites();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAppointments = async () => {
    if (!isLoggedIn) return;
    try {
      setLoading(true);
      const data = await getUserAppointments();
      setAppointments(Array.isArray(data) ? data : (data as any)?.results || []);
    } catch (err) {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchAppointments(); }, [isLoggedIn]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAppointments(), refreshFavorites()]);
    setRefreshing(false);
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.notLoggedInGradient}>
          <View style={styles.notLoggedInCard}>
            <View style={styles.iconCircle}><Ionicons name="person" size={50} color="#8B5CF6" /></View>
            <Text style={styles.title}>Witaj w Sessly!</Text>
            <Text style={styles.subtitle}>Zaloguj się, aby zarządzać wizytami i ulubionymi miejscami.</Text>
            <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginButtonText}>Zaloguj się</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const upcomingCount = appointments.filter(apt => apt.start && apt.status !== 'cancelled' && new Date(apt.start) > new Date()).length;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.accent} />}>
        
        {/* Header */}
        <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.headerGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.headerContent}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.userName} numberOfLines={1}>{user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.username}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              {user?.role === 'business_owner' && (
                <View style={styles.specialistBadge}><Text style={styles.specialistBadgeText}>WŁAŚCICIEL SALONU</Text></View>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentBody}>
          
          {/* Szybkie Statystyki */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(tabs)/appointments')}>
              <Text style={styles.statNumber}>{upcomingCount}</Text>
              <Text style={styles.statLabel}>Twoje Wizyty</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(tabs)/favorites')}>
              <Text style={styles.statNumber}>{favoritesData.length}</Text>
              <Text style={styles.statLabel}>Ulubione</Text>
            </TouchableOpacity>
          </View>

          {/* Panel Właściciela Biznesu */}
          {user?.role === 'business_owner' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Zarządzanie Biznesem</Text>
              <View style={styles.businessGrid}>
                <TouchableOpacity style={styles.bCard} onPress={() => router.push('/business/edit-profile')}>
                  <View style={[styles.bIcon, {backgroundColor: '#DBEAFE'}]}><Ionicons name="storefront" size={24} color="#2563EB" /></View>
                  <Text style={styles.bText}>Wizytówka</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bCard} onPress={() => router.push('/business/opening-hours')}>
                  <View style={[styles.bIcon, {backgroundColor: '#FEF3C7'}]}><Ionicons name="time" size={24} color="#D97706" /></View>
                  <Text style={styles.bText}>Godziny</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bCard} onPress={() => router.push('/business/manage-services')}>
                  <View style={[styles.bIcon, {backgroundColor: '#F3E8FF'}]}><Ionicons name="cut" size={24} color="#9333EA" /></View>
                  <Text style={styles.bText}>Cennik</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bCard} onPress={() => router.push('/business/schedule')}>
                  <View style={[styles.bIcon, {backgroundColor: '#D1FAE5'}]}><Ionicons name="calendar" size={24} color="#059669" /></View>
                  <Text style={styles.bText}>Grafik</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Ustawienia Konta */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Konto</Text>
            <View style={styles.menuGroup}>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/edit-profile')}>
                <View style={styles.menuIconBox}><Ionicons name="person-outline" size={20} color="#4B5563" /></View>
                <Text style={styles.menuItemText}>Edytuj profil klienta</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/change-password')}>
                <View style={styles.menuIconBox}><Ionicons name="lock-closed-outline" size={20} color="#4B5563" /></View>
                <Text style={styles.menuItemText}>Zmień hasło</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Wyloguj */}
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>Wyloguj się</Text>
          </TouchableOpacity>

        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  notLoggedInGradient: { flex: 1, justifyContent: 'center', padding: 20 },
  notLoggedInCard: { backgroundColor: '#fff', borderRadius: 28, padding: 32, alignItems: 'center', shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 26, fontWeight: '900', color: '#1E293B', marginBottom: 12 },
  subtitle: { fontSize: 15, color: '#64748B', textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  loginButton: { flexDirection: 'row', backgroundColor: Colors.light.accent, paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, alignItems: 'center', justifyContent: 'center', width: '100%', gap: 8 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8 },
  avatarText: { fontSize: 28, fontWeight: '900', color: Colors.light.accent },
  headerTextContainer: { flex: 1 },
  userName: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  userEmail: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: 8 },
  specialistBadge: { alignSelf: 'flex-start', backgroundColor: '#FEF3C7', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8 },
  specialistBadgeText: { fontSize: 11, fontWeight: '800', color: '#B45309' },

  contentBody: { paddingHorizontal: 20, marginTop: 24 },
  statsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, paddingVertical: 20, marginBottom: 30, shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
  statLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', marginTop: 4 },
  statDivider: { width: 1, height: '100%', backgroundColor: '#E2E8F0' },

  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 16, marginLeft: 4 },
  
  businessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  bCard: { width: '48%', backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center', shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  bIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  bText: { fontSize: 14, fontWeight: '700', color: '#334155' },

  menuGroup: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#334155' },
  menuDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 66 },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#FEF2F2', borderRadius: 16, gap: 8 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});