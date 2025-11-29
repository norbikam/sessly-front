import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBusinessDetail } from '../../api/business';
import type { Business, Service } from '../../types/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { getAvailability, createAppointment } from '@/api/appointments';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBusiness = useCallback(async () => {
    if (!id) {
      setError('Brak ID biznesu');
      setLoading(false);
      return;
    }

    setError(null);
    setLoading(true);
    
    try {
      console.log('[BusinessDetail] Fetching business detail for:', id);
      const businessData = await getBusinessDetail(String(id));
      
      if (!businessData) {
        throw new Error('Nie znaleziono biznesu');
      }

      setBusiness(businessData);
      const businessServices = (businessData as any).services || [];
      const businessHours = (businessData as any).opening_hours || [];

      setServices(businessServices);
      setHours(businessHours);

    } catch (e: any) {
      console.error('[BusinessDetail] Error:', e);
      
      let errorMessage = 'Błąd pobierania danych biznesu';
      
      if (e?.response?.status === 404) {
        errorMessage = 'Nie znaleziono biznesu o podanym identyfikatorze';
      } else if (e?.response?.data?.detail) {
        errorMessage = e.response.data.detail;
      } else if (e?.message) {
        errorMessage = e.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBusiness();
    setRefreshing(false);
  };

  const handleBook = async (service: Service) => {
  console.log('🔵 [handleBook] START', { 
    service: service.name, 
    serviceId: service.id,
    isLoggedIn,
    businessSlug: business?.slug 
  });

  if (!isLoggedIn) {
    console.log('⚠️ [handleBook] User not logged in');
    
    // ✅ ROZWIĄZANIE: Użyj window.confirm na web, Alert na mobile
    if (Platform.OS === 'web') {
      const shouldLogin = window.confirm('Musisz być zalogowany, aby dokonać rezerwacji.\n\nPrzejść do logowania?');
      if (shouldLogin) {
        router.push('/(auth)/login');
      }
    } else {
      Alert.alert(
        'Wymagane logowanie',
        'Musisz być zalogowany, aby dokonać rezerwacji.',
        [
          { text: 'Anuluj', style: 'cancel' },
          { 
            text: 'Zaloguj się', 
            onPress: () => router.push('/(auth)/login')
          },
        ]
      );
    }
    return;
  }

  if (!business?.slug) {
    console.log('❌ [handleBook] No business slug');
    if (Platform.OS === 'web') {
      window.alert('Nie można zarezerwować - brak danych biznesu');
    } else {
      Alert.alert('Błąd', 'Nie można zarezerwować - brak danych biznesu');
    }
    return;
  }

  try {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    console.log('📅 [handleBook] Fetching availability', {
      businessSlug: business.slug,
      serviceId: service.id,
      date: dateStr
    });

    const availability = await getAvailability(
      business.slug,
      String(service.id),
      dateStr
    );

    console.log('✅ [handleBook] Availability response:', availability);

    if (!availability.slots || availability.slots.length === 0) {
      console.log('⚠️ [handleBook] No slots available');
      if (Platform.OS === 'web') {
        window.alert('Brak dostępności: Nie ma wolnych terminów na dzisiaj');
      } else {
        Alert.alert('Brak dostępności', 'Nie ma wolnych terminów na dzisiaj');
      }
      return;
    }

    console.log('📋 [handleBook] Showing slot selection', {
      slotsCount: availability.slots.length
    });

    // ✅ NA WEB: Użyj prostego prompt/confirm zamiast Alert.alert
    if (Platform.OS === 'web') {
      const slotsList = availability.slots.map((s, i) => `${i + 1}. ${s.time}`).join('\n');
      const selection = window.prompt(
        `Wybierz godzinę dla: ${service.name}\nDostępne terminy na ${dateStr}:\n\n${slotsList}\n\nWpisz numer (1-${availability.slots.length}):`,
        '1'
      );

      if (selection === null) {
        console.log('🚫 [handleBook] User cancelled slot selection');
        return; // User clicked Cancel
      }

      const slotIndex = parseInt(selection) - 1;
      if (isNaN(slotIndex) || slotIndex < 0 || slotIndex >= availability.slots.length) {
        window.alert('Nieprawidłowy wybór. Wybierz liczbę od 1 do ' + availability.slots.length);
        return;
      }

      const selectedSlot = availability.slots[slotIndex];
      console.log('🎯 [handleBook] Slot selected', { slot: selectedSlot.time });

      try {
        console.log('📤 [handleBook] Creating appointment', {
          businessSlug: business.slug,
          serviceId: service.id,
          date: dateStr,
          startTime: selectedSlot.time
        });

        const appointment = await createAppointment(business.slug!, {
          service_id: String(service.id),
          date: dateStr,
          start_time: selectedSlot.time,
          notes: '',
        });

        console.log('✅ [handleBook] Appointment created', appointment);

        const goToAccount = window.confirm(
          `Sukces! 🎉\n\nRezerwacja ${service.name} została utworzona na ${dateStr} o ${selectedSlot.time}\n\nPrzejść do listy rezerwacji?`
        );
        
        if (goToAccount) {
          router.push('/(tabs)/account');
        }

      } catch (error: any) {
        console.error('❌ [handleBook] Booking error:', error);
        console.error('❌ [handleBook] Error details:', {
          message: error?.message,
          response: error?.response?.data,
          status: error?.response?.status,
        });

        window.alert(
          'Błąd rezerwacji:\n\n' +
          (error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'Nie udało się utworzyć rezerwacji')
        );
      }

    } else {
      // ✅ NA MOBILE: Użyj Alert.alert (działa)
      const slotOptions = availability.slots.map((slot) => ({
        text: slot.time,
        onPress: async () => {
          console.log('🎯 [handleBook] Slot selected (mobile)', { slot: slot.time });
          try {
            console.log('📤 [handleBook] Creating appointment (mobile)', {
              businessSlug: business.slug,
              serviceId: service.id,
              date: dateStr,
              startTime: slot.time
            });

            await createAppointment(business.slug!, {
              service_id: String(service.id),
              date: dateStr,
              start_time: slot.time,
              notes: '',
            });

            console.log('✅ [handleBook] Appointment created (mobile)');

            Alert.alert(
              'Sukces! 🎉',
              `Rezerwacja ${service.name} została utworzona na ${dateStr} o ${slot.time}`,
              [
                { text: 'Zobacz rezerwacje', onPress: () => router.push('/(tabs)/account') },
                { text: 'OK', style: 'cancel' },
              ]
            );
          } catch (error: any) {
            console.error('❌ [handleBook] Booking error (mobile):', error);
            console.error('❌ [handleBook] Error details (mobile):', {
              message: error?.message,
              response: error?.response?.data,
              status: error?.response?.status,
            });

            Alert.alert(
              'Błąd rezerwacji',
              error?.response?.data?.detail ||
              error?.response?.data?.message ||
              'Nie udało się utworzyć rezerwacji'
            );
          }
        },
      }));

      Alert.alert(
        `Wybierz godzinę - ${service.name}`,
        `Dostępne terminy na ${dateStr}:`,
        [
          ...slotOptions.slice(0, 10),
          { text: 'Anuluj', style: 'cancel' },
        ]
      );
    }

  } catch (error: any) {
    console.error('❌ [handleBook] Availability error:', error);
    console.error('❌ [handleBook] Error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      config: error?.config,
    });

    if (Platform.OS === 'web') {
      window.alert(
        'Błąd pobierania dostępności:\n\n' +
        (error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'Nie udało się pobrać dostępnych terminów')
      );
    } else {
      Alert.alert(
        'Błąd',
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        'Nie udało się pobrać dostępnych terminów'
      );
    }
  }
};

  const openPhone = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Błąd', 'Nie można otworzyć aplikacji telefonu');
    });
  };

  const openUrl = (url?: string) => {
    if (!url) return;
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(formattedUrl).catch(() => {
      Alert.alert('Błąd', 'Nie można otworzyć strony internetowej');
    });
  };

  // Loading state
  if (loading && !business) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Ładowanie danych biznesu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error && !business) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#b00020" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>
            Nie udało się znaleźć biznesu: {id}
          </Text>
          <TouchableOpacity onPress={fetchBusiness} style={styles.retryBtn}>
            <Ionicons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryText}>Spróbuj ponownie</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#333" />
            <Text style={styles.backText}>Powrót</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!business) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Ionicons name="business-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Brak danych o biznesie</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#333" />
            <Text style={styles.backText}>Powrót</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const phone = (business as any).phone_number || business.phone;
  const website = (business as any).website_url || business.website;
  const address = `${(business as any).address_line1 || business.address || ''}, ${(business as any).city || ''}`.trim().replace(/^,\s*/, '');
  const desc = business.description || '';

  // ✅ NAJPROSTSZE ROZWIĄZANIE - wszystko w ScrollView, BEZ flex: 1 na ScrollView
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.scrollWrapper}>
      <ScrollView
      style={Platform.select({ web: {maxHeight: '100vh'} as any, default: undefined})}
        showsVerticalScrollIndicator={true}
        bounces={true}
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
        {/* Header WEWNĄTRZ ScrollView */}
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="business" size={32} color="#fff" />
              </View>
            </View>

            <View style={styles.headerText}>
              <Text numberOfLines={2} style={styles.name}>
                {business.name}
              </Text>
              {address ? (
                <Text numberOfLines={2} style={styles.small}>
                  {address}
                </Text>
              ) : null}
              <View style={styles.row}>
                {phone ? (
                  <TouchableOpacity style={styles.chip} onPress={() => openPhone(phone)}>
                    <Ionicons name="call" size={14} color={Colors.primary} />
                    <Text style={styles.chipText} numberOfLines={1}>{phone}</Text>
                  </TouchableOpacity>
                ) : null}
                {website ? (
                  <TouchableOpacity 
                    style={[styles.chip, phone ? { marginLeft: 8 } : {}]} 
                    onPress={() => openUrl(website)}
                  >
                    <MaterialIcons name="language" size={14} color={Colors.primary} />
                    <Text style={styles.chipText}>Strona</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.card}>
            {desc ? (
              <>
                <Text style={styles.sectionTitle}>O nas</Text>
                <Text style={styles.sectionText}>{desc}</Text>
                <View style={styles.hr} />
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Godziny otwarcia</Text>
            {hours && hours.length > 0 ? (
              hours.map((h: any, i: number) => {
                const dayLabel = h.day_name || getDayName(h.day_of_week);
                
                let timeValue = '';
                if (h.is_closed) {
                  timeValue = 'Zamknięte';
                } else if (h.open_time && h.close_time) {
                  timeValue = `${h.open_time.substring(0, 5)} — ${h.close_time.substring(0, 5)}`;
                } else {
                  timeValue = 'Brak danych';
                }

                return (
                  <View key={`hour-${i}`} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{dayLabel}</Text>
                    <Text style={styles.hoursVal}>{timeValue}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.infoText}>Godziny nie są dostępne</Text>
            )}

            <View style={styles.hr} />

            <Text style={styles.sectionTitle}>Usługi</Text>
            {services.length > 0 ? (
              services.map((service, index) => (
                <View key={index} style={styles.serviceCard}>
                  <View style={styles.serviceHeader}>
                    <Ionicons name="cut-outline" size={24} color="#8B5CF6" />
                    <View style={styles.serviceInfo}>
                      <Text style={styles.serviceName}>{service.name}</Text>
                      {service.description && (
                        <Text style={styles.serviceDescription}>{service.description}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.serviceDetails}>
                    <View style={styles.serviceDetailRow}>
                      <Ionicons name="time-outline" size={16} color="#666" />
                      <Text style={styles.serviceDetailText}>
                        {(service as any).duration_minutes || service.duration || 'N/A'} min
                      </Text>
                    </View>
                    <View style={styles.serviceDetailRow}>
                      <Ionicons name="cash-outline" size={16} color="#666" />
                      <Text style={styles.serviceDetailText}>
                        {(service as any).price_amount || service.price || 'N/A'} {(service as any).price_currency || 'PLN'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.primaryBtn} 
                    onPress={() => handleBook(service)}
                  >
                    <Text style={styles.primaryBtnText}>Zarezerwuj</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="briefcase-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>Brak zdefiniowanych usług</Text>
              </View>
            )}
          </View>

          {/* Footer info WEWNĄTRZ ScrollView */}
          {services.length > 0 && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={24} color={Colors.accent} />
              <Text style={styles.infoBoxText}>
                Wybierz usługę powyżej i kliknij "Zarezerwuj" aby umówić wizytę
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function getDayName(dayNumber: number): string {
  const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  return days[dayNumber] ?? `Dzień ${dayNumber}`;
}

const styles = StyleSheet.create({
  safe: { 
    flex: 1,
    backgroundColor: Colors.light.background 
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  iconButton: { 
    position: 'absolute', 
    left: 16, 
    top: Platform.OS === 'ios' ? 10 : 20,
    zIndex: 20, 
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
  },
  headerContent: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 12 
  },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  avatarPlaceholder: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: Colors.gradientMid 
  },
  headerText: { 
    marginLeft: 14, 
    flex: 1, 
    paddingRight: 40 
  },
  name: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: '800', 
    marginBottom: 4 
  },
  small: { 
    color: 'rgba(255,255,255,0.95)', 
    fontSize: 13, 
    marginTop: 2 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 10, 
    flexWrap: 'wrap' 
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
    maxWidth: 140,
  },
  chipText: { 
    marginLeft: 4, 
    color: Colors.primary, 
    fontWeight: '600', 
    fontSize: 12 
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    marginBottom: 12, 
    color: Colors.light.text 
  },
  sectionText: { 
    color: Colors.light.text, 
    lineHeight: 22, 
    fontSize: 14 
  },
  hr: { 
    height: 1, 
    backgroundColor: '#f0f0f0', 
    marginVertical: 20 
  },
  hoursRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f5f5f5',
  },
  hoursDay: { 
    color: Colors.light.text, 
    fontWeight: '600', 
    fontSize: 14 
  },
  hoursVal: { 
    color: Colors.light.muted, 
    fontSize: 14 
  },
  serviceCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  serviceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  serviceName: { 
    fontSize: 16, 
    fontWeight: '700', 
    color: '#222', 
    marginBottom: 4 
  },
  serviceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  serviceDetails: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  serviceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 16 
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F0',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent,
    gap: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  loadingText: { 
    marginTop: 16, 
    color: Colors.light.muted, 
    fontSize: 14 
  },
  errorContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 24 
  },
  errorText: { 
    color: '#b00020', 
    fontSize: 16, 
    textAlign: 'center', 
    marginTop: 16, 
    fontWeight: '600' 
  },
  errorSubtext: { 
    color: '#666', 
    fontSize: 13, 
    textAlign: 'center', 
    marginTop: 8, 
    marginBottom: 24 
  },
  retryBtn: { 
    marginTop: 12, 
    paddingHorizontal: 24, 
    paddingVertical: 12, 
    backgroundColor: Colors.accent, 
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryText: { 
    color: '#fff', 
    fontWeight: '700', 
    fontSize: 15 
  },
  backBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#eee',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backText: { 
    color: '#333', 
    fontWeight: '600', 
    fontSize: 15 
  },
  emptyText: { 
    marginTop: 16, 
    color: Colors.light.muted, 
    fontSize: 16, 
    marginBottom: 24 
  },
  infoText: { 
    color: Colors.light.muted, 
    marginBottom: 8, 
    fontStyle: 'italic' 
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  scrollWrapper: {
  flexGrow: 1,
  flexBasis: 0, 
},

});