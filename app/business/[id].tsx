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
  Share,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBusinessDetail } from '../../api/business';
import type { Business, Service } from '../../types/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { createAppointment } from '@/api/appointments';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import OpeningHoursCard from '../../components/business/OpeningHoursCard';
import BookingModal from '../../components/booking/BookingModal';

const { width } = Dimensions.get('window');

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Favorite animation
  const favoriteScale = useState(new Animated.Value(1))[0];

  const businessId = business?.slug || String(id);
  const favorite = isFavorite(businessId);

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

  const handleBookClick = (service: Service) => {
    if (!isLoggedIn) {
      Alert.alert(
        'Wymagane logowanie',
        'Musisz być zalogowany, aby dokonać rezerwacji.',
        [
          { text: 'Anuluj', style: 'cancel' },
          { 
            text: 'Zaloguj się', 
            onPress: () => router.push('/(auth)/login')
          }
        ]
      );
      return;
    }

    setSelectedService(service);
    setShowBookingModal(true);
  };

  const handleBookingConfirm = async (date: string, time: string) => {
    if (!business?.slug || !selectedService) {
      return;
    }

    try {
      const appointmentData = {
        service_id: String(selectedService.id),
        date: date,
        start_time: time,
        notes: '',
      };

      console.log('📤 [BusinessDetail] Creating appointment:', appointmentData);

      await createAppointment(business.slug, appointmentData);

      const successMessage = `Rezerwacja potwierdzona!\n\nUsługa: ${selectedService.name}\nData: ${date}\nGodzina: ${time}`;
      
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert('Sukces!', successMessage);
      }

      console.log('✅ [BusinessDetail] Appointment created successfully');

    } catch (e: any) {
      console.error('❌ [BusinessDetail] Booking error:', e);
      
      let errorMessage = 'Nie udało się utworzyć rezerwacji';
      
      if (e?.response?.data?.detail) {
        errorMessage = e.response.data.detail;
      } else if (e?.response?.data?.error) {
        errorMessage = e.response.data.error;
      } else if (e?.message) {
        errorMessage = e.message;
      }

      if (Platform.OS === 'web') {
        window.alert(`Błąd: ${errorMessage}`);
      } else {
        Alert.alert('Błąd rezerwacji', errorMessage);
      }
    }
  };

  const openPhone = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const openWebsite = (url: string) => {
    Linking.openURL(url);
  };

  // ✅ Handle Share
  const handleShare = async () => {
    if (!business) return;

    try {
      const address = `${(business as any).address_line1 || business.address || ''}, ${(business as any).city || ''}`.trim().replace(/^,\s*/, '');
      const phone = (business as any).phone_number || business.phone || '';
      
      let message = `🏢 Sprawdź: ${business.name}\n`;
      
      if (address) {
        message += `📍 ${address}\n`;
      }
      
      if (phone) {
        message += `📞 ${phone}\n`;
      }
      
      if (services.length > 0) {
        message += `✂️ ${services.length} ${services.length === 1 ? 'usługa' : 'usług'}\n`;
      }
      
      message += `\n🔗 Zarezerwuj teraz w Sessly!`;

      const result = await Share.share({
        message: message,
        title: `${business.name} - Sessly`,
      });

      if (result.action === Share.sharedAction) {
        console.log('✅ [BusinessDetail] Business shared successfully');
      }
    } catch (error: any) {
      console.error('❌ [BusinessDetail] Share error:', error);
      Alert.alert('Błąd', 'Nie udało się udostępnić');
    }
  };

  // ✅ Handle Favorite Toggle
  const handleFavoriteToggle = () => {
  if (!business) return;
  
  // ✅ Check if user is logged in
  if (!isLoggedIn) {
    Alert.alert(
      'Wymagane logowanie',
      'Aby dodać firmę do ulubionych, musisz się zalogować.',
      [
        { text: 'Anuluj', style: 'cancel' },
        { 
          text: 'Zaloguj się', 
          onPress: () => router.push('/(auth)/login')
        }
      ]
    );
    return;
  }
  
  // Animate
  Animated.sequence([
    Animated.timing(favoriteScale, {
      toValue: 1.3,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.timing(favoriteScale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }),
  ]).start();

  toggleFavorite(businessId);
};

  // Loading state
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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.scrollWrapper}>
        <ScrollView
          style={Platform.select({
            web: { maxHeight: '100vh' } as any,
            default: undefined,
          })}
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
          {/* Header */}
          <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
            {/* Top buttons row */}
            <View style={styles.topButtons}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              
              <View style={styles.rightButtons}>
                {/* ✨ Favorite Button */}
                <TouchableOpacity 
                  onPress={handleFavoriteToggle} 
                  style={styles.iconButton}
                >
                  <Animated.View style={{ transform: [{ scale: favoriteScale }] }}>
                    <Ionicons 
                      name={favorite ? "heart" : "heart-outline"} 
                      size={24} 
                      color={favorite ? "#e74c3c" : "#fff"} 
                    />
                  </Animated.View>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                  <Ionicons name="share-outline" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

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
                    <TouchableOpacity style={styles.chip} onPress={() => openWebsite(website)}>
                      <Ionicons name="globe" size={14} color={Colors.primary} />
                      <Text style={styles.chipText} numberOfLines={1}>Strona WWW</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            </View>
          </LinearGradient>

          {/* Description */}
          {desc ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="information-circle-outline" size={24} color={Colors.accent} />
                <Text style={styles.sectionTitle}>O firmie</Text>
              </View>
              <Text style={styles.description}>{desc}</Text>
            </View>
          ) : null}

          {/* Opening Hours */}
          {hours.length > 0 && (
            <View style={styles.section}>
              <OpeningHoursCard hours={hours} />
            </View>
          )}

          {/* Services */}
          {services.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="cut-outline" size={24} color={Colors.accent} />
                <Text style={styles.sectionTitle}>Usługi</Text>
              </View>
              {services.map((service, index) => (
                <View key={service.id} style={styles.serviceCard}>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{service.name}</Text>
                    <View style={styles.serviceMeta}>
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.metaText}>
                          {(service as any).duration_minutes || service.duration} min
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Ionicons name="cash-outline" size={16} color="#666" />
                        <Text style={styles.metaText}>
                          {(service as any).price_amount || service.price} PLN
                        </Text>
                      </View>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.bookButton}
                    onPress={() => handleBookClick(service)}
                  >
                    <Text style={styles.bookButtonText}>Zarezerwuj</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </View>

      {/* Booking Modal */}
      {business && selectedService && (
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
  safe: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollWrapper: {
    flexGrow: 1,
    flexBasis: 0,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#b00020',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 12,
  },
  backText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  small: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  bookButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});