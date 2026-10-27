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
import { PHONE_VERIFY_ENABLED } from '../../constants/config';
import { useLocale } from '../../contexts/LocaleContext';
import { useLocation } from '../../contexts/LocationContext';

function LocationSwitcher() {
  const { locations, activeLocation, selectLocation } = useLocation();
  const { t } = useLocale();
  if (locations.length < 1) return null;
  return (
    <View style={styles.locationBox}>
      <Text style={styles.locationLabel}>{t('account.activeLocation')}</Text>
      {locations.map((loc) => {
        const selected = activeLocation?.id === loc.id;
        return (
          <TouchableOpacity
            key={loc.id}
            style={[styles.locationRow, selected && styles.locationRowActive]}
            onPress={() => selectLocation(loc.id)}
          >
            <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={18} color="#7C3AED" />
            <View>
              <Text style={styles.locationName}>{loc.name}</Text>
              {!!loc.city && <Text style={styles.locationCity}>{loc.city}</Text>}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function AccountScreen() {
  const router = useRouter();
  const { user, isLoggedIn, logout, savedAccounts, switchAccount, removeSavedAccount } = useAuth();
  const { favoritesData, refreshFavorites } = useFavorites();
  const { t, language, currency } = useLocale();
  
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getUserAppointments();
      setAppointments(Array.isArray(data) ? data : (data as any)?.results || []);
    } catch {
      setAppointments([]);
    }
  }, [isLoggedIn]);

  useFocusEffect(useCallback(() => { void fetchAppointments(); }, [fetchAppointments]));

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAppointments(), refreshFavorites()]);
    setRefreshing(false);
  }, [fetchAppointments, refreshFavorites]);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.notLoggedInGradient}>
          <View style={styles.notLoggedInCard}>
            <View style={styles.iconCircle}><Ionicons name="person" size={50} color="#8B5CF6" /></View>
            <Text style={styles.title}>{t('account.welcome')}</Text>
            <Text style={styles.subtitle}>{t('account.loginPrompt')}</Text>
            <TouchableOpacity style={styles.loginButton} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginButtonText}>{t('account.login')}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  const upcomingCount = appointments.filter(apt => apt.start && apt.status !== 'cancelled' && new Date(apt.start) > new Date()).length;
  const otherAccounts = savedAccounts.filter((account) => account.id !== String(user?.id));

  const handleSwitchAccount = async (accountId: string) => {
    try {
      setSwitchingAccount(accountId);
      await switchAccount(accountId);
      router.replace('/(tabs)');
    } catch {
      await removeSavedAccount(accountId);
    } finally {
      setSwitchingAccount(null);
    }
  };

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
              <Text style={styles.userEmail}>{user?.email || `@${user?.username}`}</Text>
              {user?.role === 'business_owner' && (
                <View style={styles.specialistBadge}><Text style={styles.specialistBadgeText}>WŁAŚCICIEL SALONU</Text></View>
              )}
              {user?.role === 'staff' && (
                <View style={styles.specialistBadge}><Text style={styles.specialistBadgeText}>PRACOWNIK</Text></View>
              )}
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentBody}>
          
          {user?.role !== 'business_owner' && user?.role !== 'staff' ? (
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(tabs)/appointments')}>
              <Text style={styles.statNumber}>{upcomingCount}</Text>
              <Text style={styles.statLabel}>{t('account.yourVisits')}</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(tabs)/favorites')}>
              <Text style={styles.statNumber}>{favoritesData.length}</Text>
              <Text style={styles.statLabel}>{t('account.favorites')}</Text>
            </TouchableOpacity>
          </View>
          ) : user?.role === 'business_owner' ? (
            <TouchableOpacity style={styles.locationAdd} onPress={() => router.push('/business/locations' as any)}>
              <Ionicons name="add-circle-outline" size={20} color="#7C3AED" />
              <Text style={styles.locationAddText}>Zarządzaj miejscami działalności</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.locationAdd} onPress={() => router.push('/business/schedule' as any)}>
              <Ionicons name="calendar-outline" size={20} color="#7C3AED" />
              <Text style={styles.locationAddText}>Mój grafik i umówieni klienci</Text>
            </TouchableOpacity>
          )}

          {/* Panel Właściciela Biznesu */}
          {user?.role === 'business_owner' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('account.manageBusiness')}</Text>
              <LocationSwitcher />
              <View style={styles.businessGrid}>
                <TouchableOpacity style={styles.bCard} onPress={() => router.push('/(tabs)' as any)}>
                  <View style={[styles.bIcon, {backgroundColor: '#EDE9FE'}]}><Ionicons name="grid" size={24} color="#7C3AED" /></View>
                  <Text style={styles.bText}>Pulpit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bCard} onPress={() => router.push('/business/edit-profile')}>
                  <View style={[styles.bIcon, {backgroundColor: '#DBEAFE'}]}><Ionicons name="storefront" size={24} color="#2563EB" /></View>
                  <Text style={styles.bText}>Wizytówka</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bCard} onPress={() => router.push('/business/gallery')}>
                  <View style={[styles.bIcon, {backgroundColor: '#FCE7F3'}]}><Ionicons name="images" size={24} color="#DB2777" /></View>
                  <Text style={styles.bText}>Galeria</Text>
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
                <TouchableOpacity style={styles.bCard} onPress={() => router.push('/business/locations' as any)}>
                  <View style={[styles.bIcon, {backgroundColor: '#CCFBF1'}]}><Ionicons name="business" size={24} color="#0F766E" /></View>
                  <Text style={styles.bText}>Miejsca</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bCard} onPress={() => router.push('/business/subscription' as any)}>
                  <View style={[styles.bIcon, {backgroundColor: '#FEF3C7'}]}><Ionicons name="diamond" size={24} color="#B45309" /></View>
                  <Text style={styles.bText}>Plan</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Ustawienia Konta */}
          {otherAccounts.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('account.switchAccount')}</Text>
              <View style={styles.menuGroup}>
                {otherAccounts.map((account, index) => (
                  <View key={account.id}>
                    <TouchableOpacity style={styles.accountSwitchRow} onPress={() => handleSwitchAccount(account.id)}>
                      <View style={styles.accountAvatar}>
                        <Text style={styles.accountAvatarText}>{(account.user.first_name || account.user.username).slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View style={styles.accountInfo}>
                        <Text style={styles.accountName}>{account.user.first_name || account.user.username}</Text>
                        <Text style={styles.accountRole}>{account.user.role === 'business_owner' ? 'Konto firmowe' : account.user.email}</Text>
                      </View>
                      {switchingAccount === account.id ? <ActivityIndicator color={Colors.light.accent} /> : <Ionicons name="swap-horizontal" size={20} color={Colors.light.accent} />}
                    </TouchableOpacity>
                    {index < otherAccounts.length - 1 ? <View style={styles.menuDivider} /> : null}
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('account.title')}</Text>
            <View style={styles.menuGroup}>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/preferences')}>
                <View style={styles.menuIconBox}><Ionicons name="globe-outline" size={20} color="#4B5563" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.menuItemText}>{t('account.preferences')}</Text>
                  <Text style={styles.menuItemHint}>{t(`account.language.${language}`)} · {currency}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(auth)/login')}>
                <View style={styles.menuIconBox}><Ionicons name="people-outline" size={20} color="#4B5563" /></View>
                <Text style={styles.menuItemText}>{t('account.addAccount')}</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              {user?.role === 'customer' ? (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/following')}>
                    <View style={styles.menuIconBox}><Ionicons name="notifications-outline" size={20} color="#4B5563" /></View>
                    <Text style={styles.menuItemText}>{t('account.following')}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                  </TouchableOpacity>
                  <View style={styles.menuDivider} />
                </>
              ) : null}
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/notifications')}>
                <View style={styles.menuIconBox}><Ionicons name="notifications-outline" size={20} color="#4B5563" /></View>
                <Text style={styles.menuItemText}>{t('account.notifications')}</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/edit-profile')}>
                <View style={styles.menuIconBox}><Ionicons name="person-outline" size={20} color="#4B5563" /></View>
                <Text style={styles.menuItemText}>{user?.role === 'staff' ? t('account.editProfileStaff') : t('account.editProfile')}</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              {PHONE_VERIFY_ENABLED ? (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/verify-phone')}>
                    <View style={styles.menuIconBox}><Ionicons name="call-outline" size={20} color="#4B5563" /></View>
                    <Text style={styles.menuItemText}>
                      {user?.phone_verified ? 'Telefon potwierdzony' : 'Potwierdź numer telefonu'}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
                  </TouchableOpacity>
                  <View style={styles.menuDivider} />
                </>
              ) : null}
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/change-password')}>
                <View style={styles.menuIconBox}><Ionicons name="lock-closed-outline" size={20} color="#4B5563" /></View>
                <Text style={styles.menuItemText}>{t('account.changePassword')}</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/support')}>
                <View style={styles.menuIconBox}><Ionicons name="help-buoy-outline" size={20} color="#4B5563" /></View>
                <Text style={styles.menuItemText}>Pomoc i kontakt</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push({ pathname: '/account/legal', params: { doc: 'terms' } })}>
                <View style={styles.menuIconBox}><Ionicons name="document-text-outline" size={20} color="#4B5563" /></View>
                <Text style={styles.menuItemText}>Regulamin</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push({ pathname: '/account/legal', params: { doc: 'privacy' } })}>
                <View style={styles.menuIconBox}><Ionicons name="shield-checkmark-outline" size={20} color="#4B5563" /></View>
                <Text style={styles.menuItemText}>Polityka prywatności</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/account/delete-account')}>
                <View style={styles.menuIconBox}><Ionicons name="trash-outline" size={20} color="#DC2626" /></View>
                <Text style={[styles.menuItemText, { color: '#DC2626' }]}>Usuń konto</Text>
                <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Wyloguj */}
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="#EF4444" />
            <Text style={styles.logoutText}>{t('account.logout')}</Text>
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
  locationAdd: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 24 },
  locationAddText: { color: '#7C3AED', fontWeight: '800' },
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
  locationBox: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16 },
  locationLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 10 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  locationRowActive: { backgroundColor: '#F5F3FF', borderRadius: 12, paddingHorizontal: 8 },
  locationName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  locationCity: { fontSize: 12, color: '#64748B', marginTop: 2 },

  menuGroup: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  menuIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#334155' },
  menuItemHint: { fontSize: 12, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
  menuDivider: { height: 1, backgroundColor: '#F1F5F9', marginLeft: 66 },
  accountSwitchRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  accountAvatar: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE9FE' },
  accountAvatarText: { color: Colors.light.accent, fontWeight: '900', fontSize: 17 },
  accountInfo: { flex: 1, marginLeft: 12 },
  accountName: { color: '#1E293B', fontSize: 15, fontWeight: '800' },
  accountRole: { color: '#64748B', fontSize: 12, marginTop: 3 },

  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#FEF2F2', borderRadius: 16, gap: 8 },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
});