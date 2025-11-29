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
  SafeAreaView,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBusinessDetail } from '../../api/business';
import type { Business, Service, OpeningHours } from '../../types/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams(); // To może być slug lub id, więc zostawiamy nazwę
  const router = useRouter();

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
      
      // Backend oczekuje slug, więc id powinno być slugiem
      const businessData = await getBusinessDetail(String(id));
      
      console.log('[BusinessDetail] Received business data:', businessData);
      
      if (!businessData) {
        throw new Error('Nie znaleziono biznesu');
      }

      setBusiness(businessData);

      // Wyciągnij usługi i godziny
      const businessServices = (businessData as any).services || [];
      const businessHours = (businessData as any).opening_hours || [];
      
      console.log('[BusinessDetail] Services:', businessServices.length);
      console.log('[BusinessDetail] Hours:', businessHours.length);

      setServices(businessServices);
      setHours(businessHours);

    } catch (e: any) {
      console.error('[BusinessDetail] Error:', e);
      
      // Lepsze komunikaty błędów
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

  const handleBook = (service?: Service) => {
    if (!business) return;
    Alert.alert(
      'Rezerwacja',
      service ? `Rezerwacja: ${service.name}` : `Rezerwacja w ${business.name}`,
      [{ text: 'OK' }]
    );
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Ładowanie danych biznesu...</Text>
      </View>
    );
  }

  // Error state
  if (error && !business) {
    return (
      <SafeAreaView style={styles.safe}>
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

  // No data state
  if (!business) {
    return (
      <SafeAreaView style={styles.safe}>
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

  // Extract business data
  const phone = (business as any).phone_number || business.phone;
  const website = (business as any).website_url || business.website;
  const address = `${(business as any).address_line1 || business.address || ''}, ${(business as any).city || ''}`.trim().replace(/^,\s*/, '');
  const desc = business.description || '';

  return (
    <SafeAreaView style={styles.safe}>
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

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
      >
        <View style={styles.card}>
          {/* Description Section */}
          {desc ? (
            <>
              <Text style={styles.sectionTitle}>O nas</Text>
              <Text style={styles.sectionText}>{desc}</Text>
              <View style={styles.hr} />
            </>
          ) : null}

          {/* Opening Hours Section */}
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

          {/* Services Section */}
          <Text style={styles.sectionTitle}>Usługi</Text>
          {services.length === 0 ? (
            <Text style={styles.empty}>Brak zdefiniowanych usług</Text>
          ) : (
            services.map((s: Service, idx: number) => {
              const serviceId = s.id ?? idx;
              const serviceName = s.name || 'Bez nazwy';
              const serviceDesc = s.description || '';
              
              const duration = (s as any).duration_minutes || s.duration;
              const price = (s as any).price_amount || s.price;
              const currency = (s as any).price_currency || 'zł';

              const priceDisplay = price ? `${price} ${currency}` : '—';
              const durationDisplay = duration ? `${duration} min` : null;

              return (
                <View key={`service-${serviceId}`} style={styles.serviceRow}>
                  <View style={styles.serviceMetaLeft}>
                    <Text style={styles.serviceName}>{serviceName}</Text>
                    {serviceDesc ? (
                      <Text style={styles.serviceDesc} numberOfLines={2}>
                        {serviceDesc}
                      </Text>
                    ) : null}
                    <View style={styles.metaRow}>
                      {durationDisplay ? (
                        <View style={styles.pill}>
                          <Ionicons name="time-outline" size={12} color="#666" />
                          <Text style={styles.pillText}>{durationDisplay}</Text>
                        </View>
                      ) : null}
                      <View style={[styles.pill, styles.pricePill]}>
                        <Text style={[styles.pillText, { color: '#fff' }]}>{priceDisplay}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.serviceAction}>
                    <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(s)}>
                      <Text style={styles.bookBtnText}>Rezerwuj</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => handleBook()}>
          <Ionicons name="calendar-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Umów wizytę</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function getDayName(dayNumber: number): string {
  const days = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
  return days[dayNumber] ?? `Dzień ${dayNumber}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  iconButton: { 
    position: 'absolute', 
    left: 16, 
    top: Platform.OS === 'ios' ? 50 : 30, 
    zIndex: 20, 
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gradientMid },
  headerText: { marginLeft: 14, flex: 1, paddingRight: 40 },
  name: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 4 },
  small: { color: 'rgba(255,255,255,0.95)', fontSize: 13, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 10, flexWrap: 'wrap' },
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
  chipText: { marginLeft: 4, color: Colors.primary, fontWeight: '600', fontSize: 12 },
  container: { flex: 1 },
  content: { paddingBottom: 24, paddingTop: 16, paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: Colors.light.text },
  sectionText: { color: Colors.light.text, lineHeight: 22, fontSize: 14 },
  hr: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 20 },
  empty: { color: Colors.light.muted, fontStyle: 'italic' },
  hoursRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f5f5f5',
  },
  hoursDay: { color: Colors.light.text, fontWeight: '600', fontSize: 14 },
  hoursVal: { color: Colors.light.muted, fontSize: 14 },
  serviceRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f3f3' },
  serviceMetaLeft: { flex: 1, paddingRight: 12 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#222', marginBottom: 4 },
  serviceDesc: { color: Colors.light.muted, marginTop: 4, fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', marginTop: 10, alignItems: 'center', flexWrap: 'wrap' },
  pill: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 20, 
    backgroundColor: '#F3F3F3', 
    marginRight: 8,
    gap: 4,
  },
  pricePill: { backgroundColor: Colors.accent },
  pillText: { color: '#333', fontWeight: '700', fontSize: 12 },
  serviceAction: { justifyContent: 'center' },
  bookBtn: { backgroundColor: Colors.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 8,
    elevation: 8,
  },
  primaryBtn: {
    width: '100%',
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: Colors.accent,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, color: Colors.light.muted, fontSize: 14 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: '#b00020', fontSize: 16, textAlign: 'center', marginTop: 16, fontWeight: '600' },
  errorSubtext: { color: '#666', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 24 },
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
  retryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
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
  backText: { color: '#333', fontWeight: '600', fontSize: 15 },
  emptyText: { marginTop: 16, color: Colors.light.muted, fontSize: 16, marginBottom: 24 },
  infoText: { color: Colors.light.muted, marginBottom: 8, fontStyle: 'italic' },
});
