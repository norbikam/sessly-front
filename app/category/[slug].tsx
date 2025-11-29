import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Types
interface Specialist {
  id: number;
  name: string;
  specialty: string;
  rating: number;
  reviews: number;
  image: string;
  nextAvailable: string;
  isAvailable: boolean;
  price: string;
  experience: string;
  location: string;
  distance: string;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  specialists: number;
  description: string;
}

// Mock data dla kategorii
const categories: Record<string, Category> = {
  fryzjer: {
    id: 1,
    name: 'Fryzjer',
    icon: '✂️',
    color: '#EF4444',
    specialists: 156,
    description: 'Profesjonalne usługi fryzjerskie - strzyżenie, modelowanie, koloryzacja'
  },
  kosmetyczka: {
    id: 2,
    name: 'Kosmetyczka',
    icon: '💄',
    color: '#14B8A6',
    specialists: 89,
    description: 'Zabiegi kosmetyczne, pielęgnacja twarzy, makijaż'
  },
  masaz: {
    id: 3,
    name: 'Masaż',
    icon: '💆‍♀️',
    color: '#3B82F6',
    specialists: 67,
    description: 'Masaże relaksacyjne, lecznicze i rehabilitacyjne'
  },
  manicure: {
    id: 4,
    name: 'Manicure',
    icon: '💅',
    color: '#10B981',
    specialists: 124,
    description: 'Manicure klasyczny, hybrydowy, żelowy'
  },
  barber: {
    id: 5,
    name: 'Barber',
    icon: '🪒',
    color: '#F59E0B',
    specialists: 78,
    description: 'Męskie strzyżenie, stylizacja brody, golenie'
  },
  makijaz: {
    id: 6,
    name: 'Makijaż',
    icon: '🎨',
    color: '#8B5CF6',
    specialists: 45,
    description: 'Makijaż dzienny, wieczorowy, ślubny'
  },
};

// Mock data dla specjalistów w kategorii
const getSpecialistsByCategory = (categorySlug: string): Specialist[] => {
  const baseSpecialists = [
    {
      id: 1,
      name: 'Anna Kowalska',
      rating: 4.9,
      reviews: 234,
      image: 'https://images.unsplash.com/photo-1594736797933-d0401ba4bce5?w=200&h=200&fit=crop&crop=face',
      nextAvailable: 'Dziś 16:00',
      isAvailable: true,
      price: 'od 80 zł',
      experience: '8 lat',
      location: 'Salon Beauty Center',
      distance: '1.2 km'
    },
    {
      id: 2,
      name: 'Magdalena Nowak',
      rating: 4.8,
      reviews: 189,
      image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop&crop=face',
      nextAvailable: 'Jutro 10:30',
      isAvailable: false,
      price: 'od 120 zł',
      experience: '12 lat',
      location: 'Studio Piękna',
      distance: '2.1 km'
    },
    {
      id: 3,
      name: 'Tomasz Wiśniewski',
      rating: 4.9,
      reviews: 156,
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
      nextAvailable: 'Dziś 18:00',
      isAvailable: true,
      price: 'od 60 zł',
      experience: '15 lat',
      location: 'Barber Shop Classic',
      distance: '0.8 km'
    },
    {
      id: 4,
      name: 'Karolina Zielińska',
      rating: 4.7,
      reviews: 98,
      image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
      nextAvailable: 'Pojutrze 14:00',
      isAvailable: false,
      price: 'od 90 zł',
      experience: '6 lat',
      location: 'Salon Exclusive',
      distance: '3.2 km'
    },
    {
      id: 5,
      name: 'Michał Kowalczyk',
      rating: 4.8,
      reviews: 143,
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
      nextAvailable: 'Dziś 15:30',
      isAvailable: true,
      price: 'od 70 zł',
      experience: '10 lat',
      location: 'Męski Salon',
      distance: '1.8 km'
    },
  ];

  // Przypisz kategorię do każdego specjalisty
  return baseSpecialists.map(specialist => ({
    ...specialist,
    specialty: categories[categorySlug]?.name || 'Specjalista',
  }));
};

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('rating');
  const [filterDistance, setFilterDistance] = useState<string>('all');
  
  const category = categories[slug as string];
  const specialists = getSpecialistsByCategory(slug as string);

  useEffect(() => {
    if (!category) {
      Alert.alert('Błąd', 'Nie znaleziono kategorii');
      router.back();
    }
  }, [category, router]);

  if (!category) {
    return null;
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Text key={i} style={[styles.star, { color: i < Math.floor(rating) ? '#FCD34D' : '#E5E7EB' }]}>
        ★
      </Text>
    ));
  };

  const filteredSpecialists = specialists.filter(specialist =>
    specialist.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    specialist.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={category.color} />
      
      {/* Header */}
      <LinearGradient
        colors={[category.color, `${category.color}CC`]}
        style={[styles.header, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerIcon}>{category.icon}</Text>
            <View>
              <Text style={styles.headerTitle}>{category.name}</Text>
              <Text style={styles.headerSubtitle}>{category.specialists} specjalistów</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.categoryDescription}>{category.description}</Text>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj specjalisty..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </LinearGradient>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
          <TouchableOpacity 
            style={[styles.filterChip, sortBy === 'rating' && styles.filterChipActive]}
            onPress={() => setSortBy('rating')}
          >
            <Text style={[styles.filterChipText, sortBy === 'rating' && styles.filterChipTextActive]}>
              Najlepiej oceniani
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, sortBy === 'price' && styles.filterChipActive]}
            onPress={() => setSortBy('price')}
          >
            <Text style={[styles.filterChipText, sortBy === 'price' && styles.filterChipTextActive]}>
              Cena
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, sortBy === 'distance' && styles.filterChipActive]}
            onPress={() => setSortBy('distance')}
          >
            <Text style={[styles.filterChipText, sortBy === 'distance' && styles.filterChipTextActive]}>
              Odległość
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.filterChip, sortBy === 'available' && styles.filterChipActive]}
            onPress={() => setSortBy('available')}
          >
            <Text style={[styles.filterChipText, sortBy === 'available' && styles.filterChipTextActive]}>
              Dostępni dziś
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          Znaleziono {filteredSpecialists.length} specjalistów
        </Text>
        <TouchableOpacity style={styles.mapButton} activeOpacity={0.7}>
          <Ionicons name="map-outline" size={16} color="#6366F1" />
          <Text style={styles.mapButtonText}>Mapa</Text>
        </TouchableOpacity>
      </View>

      {/* Specialists List */}
      <ScrollView style={styles.specialistsList} showsVerticalScrollIndicator={false}>
        {filteredSpecialists.map((specialist) => (
          <TouchableOpacity 
            key={specialist.id} 
            style={styles.specialistCard}
            activeOpacity={0.95}
          >
            <View style={styles.specialistImageContainer}>
              <Image source={{ uri: specialist.image }} style={styles.specialistImage} />
              <View style={[
                styles.availabilityDot,
                { backgroundColor: specialist.isAvailable ? '#10B981' : '#6B7280' }
              ]} />
            </View>
            
            <View style={styles.specialistContent}>
              <View style={styles.specialistHeader}>
                <Text style={styles.specialistName}>{specialist.name}</Text>
                <Text style={styles.specialistPrice}>{specialist.price}</Text>
              </View>
              
              <View style={styles.specialistMeta}>
                <View style={styles.ratingContainer}>
                  <View style={styles.starsContainer}>
                    {renderStars(specialist.rating)}
                  </View>
                  <Text style={styles.ratingText}>
                    {specialist.rating} ({specialist.reviews})
                  </Text>
                </View>
                <Text style={styles.specialistExperience}>
                  Doświadczenie: {specialist.experience}
                </Text>
              </View>
              
              <View style={styles.specialistLocation}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={styles.locationText}>{specialist.location}</Text>
                <Text style={styles.distanceText}>• {specialist.distance}</Text>
              </View>
              
              <View style={styles.specialistFooter}>
                <Text style={[
                  styles.availabilityText,
                  { color: specialist.isAvailable ? '#059669' : '#D97706' }
                ]}>
                  {specialist.nextAvailable}
                </Text>
                <TouchableOpacity 
                  style={[styles.bookButton, { backgroundColor: category.color }]}
                  activeOpacity={0.8}
                >
                  <Text style={styles.bookButtonText}>Umów wizytę</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  headerIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerTitle: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDescription: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  filtersContainer: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filtersContent: {
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  filterChipActive: {
    backgroundColor: '#6366F1',
  },
  filterChipText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: 'white',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
  },
  resultsCount: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  mapButtonText: {
    fontSize: 14,
    color: '#6366F1',
    fontWeight: '500',
    marginLeft: 4,
  },
  specialistsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  specialistCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  specialistImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  specialistImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  availabilityDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'white',
  },
  specialistContent: {
    flex: 1,
  },
  specialistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  specialistName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  specialistPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  specialistMeta: {
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 8,
  },
  star: {
    fontSize: 14,
    marginRight: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#6B7280',
  },
  specialistExperience: {
    fontSize: 12,
    color: '#6B7280',
  },
  specialistLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  distanceText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  specialistFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacing: {
    height: 40,
  },
});
