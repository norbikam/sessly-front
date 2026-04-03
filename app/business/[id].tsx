import React, { useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, ActivityIndicator, 
  TouchableOpacity, Platform, Dimensions, Linking, Alert, Share,
  Animated, Pressable
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';
import { getBusinessDetail } from '../../api/business';
// ✅ IMPORTUJEMY FUNKCJĘ TWORZENIA WIZYTY
import { createAppointment } from '../../api/appointments'; 
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import BookingModal from '../../components/booking/BookingModal';
import OpeningHoursCard from '../../components/business/OpeningHoursCard';
import { Business, Service } from '../../types/api';

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web' && width > 768;

// ✨ Animowane Serduszko (Ulubione)
function AnimatedHeart({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) {
  const scale = useState(new Animated.Value(1))[0];
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 100, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Pressable onPress={handlePress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name={isFavorite ? "heart" : "heart-outline"} size={26} color={isFavorite ? "#EF4444" : Colors.light.text} />
      </Animated.View>
    </Pressable>
  );
}

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Booking State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const loadBusiness = async () => {
      try {
        const data = await getBusinessDetail(String(id));
        setBusiness(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    if (id) loadBusiness();
  }, [id]);

  const handleBook = (service: Service) => {
    if (!isLoggedIn) {
      Alert.alert('Wymagane logowanie', 'Musisz być zalogowany, aby zarezerwować termin.', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Zaloguj się', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    setSelectedService(service);
    setShowBookingModal(true);
  };

  // ✅ PODPIĘTE PRAWDZIWE API REZERWACJI
  const handleBookingConfirm = async (date: string, time: string) => {
    if (!business || !selectedService) return;

    try {
      const businessSlug = business.slug || String(business.id);
      
      // Wysyłamy prośbę o rezerwację do Django
      await createAppointment(businessSlug, {
        service_id: String(selectedService.id),
        date: date,
        start_time: time,
      });

      // Zamykamy modal przed wyskoczeniem alertu, żeby się nie zablokował
      setShowBookingModal(false);

      // Dodajemy małe opóźnienie na Alert, by Modal zdążył zniknąć (głównie dla iOS)
      setTimeout(() => {
        Alert.alert(
          'Rezerwacja Potwierdzona! 🎉', 
          `Twoja wizyta na "${selectedService?.name}" została pomyślnie zapisana na ${date} o ${time}.`
        );
      }, 300);

    } catch (error: any) {
      setShowBookingModal(false);
      setTimeout(() => {
        Alert.alert('Błąd', error.message || 'Nie udało się zarezerwować wizyty. Spróbuj ponownie.');
      }, 300);
    }
  };

  const handleShare = async () => {
    if (!business) return;
    try {
      await Share.share({
        message: `Sprawdź ${business.name} na Sessly! Najlepsze usługi w okolicy.`,
        title: `${business.name} - Sessly`
      });
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.center}>
        <Ionicons name="storefront-outline" size={64} color="#CBD5E1" />
        <Text style={styles.errorText}>Nie znaleziono biznesu.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Powrót do strony głównej</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const services = (business as any).services || [];
  const hours = (business as any).opening_hours || [];
  const address = `${business.address_line1 || ''}, ${(business as any).city || ''}`.replace(/^,\s*/, '').replace(/,\s*$/, '');
  const businessId = business.slug || String(business.id);
  const favorite = isFavorite(businessId);

  return (
    <View style={styles.container}>
      {/* Nawigacja Górna */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.topNavRight}>
          <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <View style={styles.navBtn}>
            <AnimatedHeart 
              isFavorite={favorite} 
              onPress={() => toggleFavorite(business as any)} 
            />
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, isWeb && styles.webScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        {/* Zdjęcie w tle */}
        <View style={styles.coverImage}>
          <Ionicons name="storefront" size={80} color="rgba(255,255,255,0.4)" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.imageGradient}
          />
        </View>

        {/* Główne informacje */}
        <View style={[styles.mainInfoCard, isWeb && styles.webCard]}>
          <Text style={styles.title}>{business.name}</Text>
          {address ? (
            <View style={styles.infoRow}>
              <Ionicons name="location" size={16} color={Colors.light.accent} />
              <Text style={styles.infoText}>{address}</Text>
            </View>
          ) : null}

          <View style={styles.actionRow}>
            {business.phone_number && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${business.phone_number}`)}>
                <Ionicons name="call-outline" size={20} color="#fff" />
                <Text style={styles.actionBtnText}>Zadzwoń</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity 
              style={[styles.actionBtn, { backgroundColor: '#F5F3FF' }]} 
              onPress={() => Linking.openURL(`http://maps.apple.com/?q=${encodeURIComponent(address || business.name)}`)}
            >
              <Ionicons name="map-outline" size={20} color={Colors.light.accent} />
              <Text style={[styles.actionBtnText, { color: Colors.light.accent }]}>Trasa</Text>
            </TouchableOpacity>

            {(business as any).website_url && (
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: '#F5F3FF' }]} 
                onPress={() => Linking.openURL((business as any).website_url)}
              >
                <Ionicons name="globe-outline" size={20} color={Colors.light.accent} />
                <Text style={[styles.actionBtnText, { color: Colors.light.accent }]}>WWW</Text>
              </TouchableOpacity>
            )}
          </View>

          {business.description && (
            <View style={styles.descSection}>
              <Text style={styles.sectionTitle}>O firmie</Text>
              <Text style={styles.descText}>{business.description}</Text>
            </View>
          )}
        </View>

        {hours.length > 0 && (
          <View style={[styles.hoursSection, isWeb && styles.webCard]}>
            <OpeningHoursCard hours={hours} />
          </View>
        )}

        {/* Sekcja Usług */}
        <View style={[styles.servicesSection, isWeb && styles.webCard]}>
          <Text style={styles.sectionTitle}>Wybierz usługę</Text>
          
          {services.length === 0 ? (
            <View style={styles.emptyServices}>
              <Ionicons name="cut-outline" size={40} color="#CBD5E1" />
              <Text style={styles.descText}>Brak dodanych usług.</Text>
            </View>
          ) : (
            services.map((service: Service) => (
              <TouchableOpacity 
                key={service.id} 
                style={styles.serviceItem}
                onPress={() => handleBook(service)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceDetails}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  {service.description && (
                    <Text style={styles.serviceDesc} numberOfLines={2}>{service.description}</Text>
                  )}
                  <View style={styles.serviceMeta}>
                    <Text style={styles.servicePrice}>{(service as any).price_amount || '0.00'} zł</Text>
                    <View style={styles.dot} />
                    <Text style={styles.serviceDuration}>{(service as any).duration_minutes || 60} min</Text>
                  </View>
                </View>
                
                <View style={styles.bookBtn}>
                  <Text style={styles.bookBtnText}>Rezerwuj</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {showBookingModal && selectedService && (
        <BookingModal
          visible={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          service={selectedService as any}
          business={business as any}
          onConfirm={handleBookingConfirm}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topNav: {
    flexDirection: 'row', justifyContent: 'space-between',
    position: 'absolute', top: Platform.OS === 'ios' ? 50 : 30, left: 16, right: 16, zIndex: 10
  },
  topNavRight: { flexDirection: 'row', gap: 10 },
  navBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center', ...Colors.shadows.sm
  },
  scrollContent: { paddingBottom: 80 },
  webScrollContent: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  coverImage: { height: 280, backgroundColor: '#B8A3E0', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  imageGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  mainInfoCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    marginTop: -32, padding: 24, ...Colors.shadows.sm
  },
  webCard: { borderRadius: 24, marginTop: 24, marginHorizontal: 20 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.light.text, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 6 },
  infoText: { fontSize: 15, color: Colors.light.textSecondary, flex: 1, fontWeight: '500' },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 14, borderRadius: 16, backgroundColor: Colors.light.accent, gap: 8
  },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  descSection: { paddingTop: 24, borderTopWidth: 1, borderTopColor: Colors.light.border },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: Colors.light.text, marginBottom: 16 },
  descText: { fontSize: 15, lineHeight: 24, color: Colors.light.textSecondary },
  hoursSection: { backgroundColor: '#fff', marginTop: 12, padding: 24, ...Colors.shadows.sm },
  servicesSection: { backgroundColor: '#fff', marginTop: 12, padding: 24, ...Colors.shadows.sm },
  emptyServices: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  serviceItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB'
  },
  serviceDetails: { flex: 1, paddingRight: 16 },
  serviceName: { fontSize: 17, fontWeight: '800', color: Colors.light.text, marginBottom: 6 },
  serviceDesc: { fontSize: 13, color: Colors.light.textSecondary, marginBottom: 10, lineHeight: 18 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center' },
  servicePrice: { fontSize: 15, fontWeight: '800', color: Colors.light.accent },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#D1D5DB', marginHorizontal: 8 },
  serviceDuration: { fontSize: 14, color: Colors.light.textSecondary, fontWeight: '500' },
  bookBtn: {
    backgroundColor: '#F5F3FF', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20,
    borderWidth: 1, borderColor: '#EDE9FE'
  },
  bookBtnText: { color: Colors.light.accent, fontWeight: '800', fontSize: 14 },
  backBtn: { marginTop: 20, backgroundColor: Colors.light.accent, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  backBtnText: { color: '#fff', fontWeight: '700' },
  errorText: { fontSize: 18, color: Colors.light.textSecondary, marginTop: 16, fontWeight: '600' }
});