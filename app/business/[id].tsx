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
  Linking,
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBusinessDetail } from '../../api/business';
import type { Business, Service, BusinessOpeningHour } from '../../types/api';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { createAppointment } from '@/api/appointments';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import OpeningHoursCard from '../../components/business/OpeningHoursCard';
import BookingModal from '../../components/booking/BookingModal';
import BusinessHeader from '../../components/business/BusinessHeader';
import ServiceCard from '../../components/business/ServiceCard';

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<BusinessOpeningHour[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const favoriteScale = useState(new Animated.Value(1))[0];

  // Pobierz ID biznesu poprawnie (slug lub id z urla jako fallback)
  const businessId = business?.id || String(id);
  const favorite = isFavorite(businessId);

  const fetchBusiness = useCallback(async () => {
    if (!id) return;
    setError(null);
    setLoading(true);
    
    try {
      const businessData = await getBusinessDetail(String(id));
      if (!businessData) throw new Error('Nie znaleziono biznesu');

      setBusiness(businessData);
      setServices(businessData.services || []);
      setHours(businessData.opening_hours || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e.message || 'Błąd pobierania danych');
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

  const handleBookClick = (service: Service) => {
    if (!isLoggedIn) {
      Alert.alert('Wymagane logowanie', 'Musisz być zalogowany, aby dokonać rezerwacji.', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Zaloguj się', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    setSelectedService(service);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = async (date: string, time: string) => {
    if (!business?.slug || !selectedService) return;

    try {
      await createAppointment(business.slug, {
        service_id: String(selectedService.id),
        date: date,
        start_time: time,
        notes: '',
      });

      const msg = `Rezerwacja potwierdzona!\n\nUsługa: ${selectedService.name}\nData: ${date}\nGodzina: ${time}`;
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Sukces!', msg);
    } catch (e: any) {
      const errorMsg = e?.response?.data?.detail || 'Nie udało się utworzyć rezerwacji';
      Platform.OS === 'web' ? window.alert(`Błąd: ${errorMsg}`) : Alert.alert('Błąd rezerwacji', errorMsg);
    }
  };

  const handleShare = async () => {
    if (!business) return;
    try {
      // Optymalizuj adres aby nie mieć leading commas itp.
      const address = `${business.address_line1 || ''}, ${business.city || ''}`.trim().replace(/^,\s*/, '');
      const phone = business.phone_number || '';
      const msg = `🏢 Sprawdź: ${business.name}\n${address ? `📍 ${address}\n` : ''}${phone ? `📞 ${phone}\n` : ''}\n🔗 Zarezerwuj teraz w Sessly!`;
      await Share.share({ message: msg, title: `${business.name} - Sessly` });
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się udostępnić');
    }
  };

  const handleFavoriteToggle = async () => {
    if (!isLoggedIn) {
      Alert.alert('Wymagane logowanie', 'Zaloguj się aby dodać do ulubionych.', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Zaloguj się', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    
    if (!business) return;

    Animated.sequence([
      Animated.timing(favoriteScale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(favoriteScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    try {
      // context oczekuje całego obiektu business
      await toggleFavorite(business);
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zmienić ulubionych.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Ładowanie danych biznesu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !business) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#b00020" />
          <Text style={styles.errorText}>{error || 'Nie znaleziono biznesu'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#333" />
            <Text style={styles.backText}>Powrót</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Używaj poprawnych nazw z interfejsu Business
  const phone = business.phone_number;
  const website = business.website_url;
  const address = `${business.address_line1 || ''}, ${business.city || ''}`.trim().replace(/^,\s*/, '');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.scrollWrapper}>
        <ScrollView
          style={Platform.select({ web: { maxHeight: '100vh' } as any, default: undefined })}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />
          }
        >
          {/* Wykorzystanie nowego komponentu Headera */}
          <BusinessHeader 
            business={business}
            address={address}
            phone={phone}
            website={website}
            favorite={favorite}
            favoriteScale={favoriteScale}
            onBack={() => router.back()}
            onToggleFavorite={handleFavoriteToggle}
            onShare={handleShare}
            openPhone={(p) => Linking.openURL(`tel:${p}`)}
            openWebsite={(u) => Linking.openURL(u)}
          />

          {business.description && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle-outline" size={24} color={Colors.accent} />
                <Text style={styles.sectionTitle}>O firmie</Text>
              </View>
              <Text style={styles.description}>{business.description}</Text>
            </View>
          )}

          {hours.length > 0 && (
            <View style={styles.section}>
              <OpeningHoursCard hours={hours} />
            </View>
          )}

          {services.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cut-outline" size={24} color={Colors.accent} />
                <Text style={styles.sectionTitle}>Usługi</Text>
              </View>
              {/* Wykorzystanie nowego komponentu ServiceCard */}
              {services.map((service) => (
                <ServiceCard 
                  key={service.id} 
                  service={service} 
                  onBookClick={handleBookClick} 
                />
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {selectedService && (
        <BookingModal
          visible={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          service={selectedService}
          business={business}
          onConfirm={handleBookingConfirm}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  scrollWrapper: { flexGrow: 1, flexBasis: 0 },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#666' },
  errorText: { fontSize: 18, fontWeight: '600', color: '#b00020', marginTop: 16, textAlign: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, marginTop: 12 },
  backText: { color: '#333', fontSize: 16, fontWeight: '600', marginLeft: 8 },
  section: { padding: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginLeft: 8 },
  description: { fontSize: 14, color: '#666', lineHeight: 20 },
});