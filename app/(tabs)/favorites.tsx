/**
 * Favorites Screen - Backend API Version
 * Pobiera ulubione z backend zamiast lokalnego AsyncStorage
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFavorites } from '../../contexts/FavoritesContext';
import { searchBusinesses } from '../../api/business';
import { Business } from '../../types/api';
import Colors from '@/constants/Colors';


/**
 * Animowane serduszko dla przycisku ulubione
 */
const AnimatedHeart = ({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) => {
  const scaleValue = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.sequence([
      Animated.timing(scaleValue, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleValue, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  }, [isFavorite]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.favoriteBtn}>
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={24}
          color={isFavorite ? '#e74c3c' : '#888'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function FavoritesScreen() {
  const router = useRouter();
  const { favoritesData, toggleFavorite, loadFavorites, loading: favoritesLoading } = useFavorites();
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Załaduj pełne dane firm z API na podstawie favoritesData z backend
   */
  const loadFavoriteBusinesses = async () => {
    if (!favoritesData || favoritesData.length === 0) {
      setBusinesses([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // favoritesData już zawiera dane firm z backend
      // Ale możemy jeszcze pobrać dodatkowe dane jeśli potrzebujemy
      const businessList: Business[] = favoritesData.map(fav => ({
        id: fav.business.id,
        name: fav.business.name,
        slug: fav.business.slug,
        category: fav.business.category || '',
        description: fav.business.description || '',
        address: fav.business.address || '',
        phone: fav.business.phone || '',
        email: fav.business.email || '',
        website: fav.business.website || '',
        latitude: fav.business.latitude || 0,
        longitude: fav.business.longitude || 0,
        // Dodatkowe pola jeśli są w API
        opening_hours: [],
        services: [],
        is_active: true,
        created_at: fav.created_at,
      }));

      setBusinesses(businessList);
      console.log('✅ Favorite businesses loaded:', businessList.length);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nie udało się załadować firm';
      setError(errorMessage);
      console.error('❌ loadFavoriteBusinesses error:', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * useEffect: załaduj dane firm przy zmianie favoritesData
   */
  useEffect(() => {
    loadFavoriteBusinesses();
  }, [favoritesData]);

  /**
   * Pull-to-refresh
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadFavorites(); // Odświeża favoritesData z backend
    setRefreshing(false);
  };

  /**
   * Obsługa toggle favorite
   */
  const handleToggleFavorite = async (businessId: number | string) => {
    await toggleFavorite(businessId);
  };

  /**
   * Nawigacja do szczegółów firmy
   */
  const handleBusinessPress = (business: Business) => {
    router.push(`/business/${business.id}` as any);
  };

  /**
   * RENDER: Loading state
   */
  if (loading || favoritesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Ładowanie ulubionych...</Text>
      </View>
    );
  }

  /**
   * RENDER: Error state
   */
  if (error) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={80} color="#999" />
        <Text style={styles.emptyTitle}>Wystąpił błąd</Text>
        <Text style={styles.emptyText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadFavorites}>
          <Text style={styles.retryButtonText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * RENDER: Empty state
   */
  if (businesses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={80} color="#999" />
        <Text style={styles.emptyTitle}>Brak ulubionych firm</Text>
        <Text style={styles.emptyText}>
          Dodaj firmy do ulubionych, aby szybko do nich wracać
        </Text>
        <TouchableOpacity
          style={styles.exploreButton}
          onPress={() => router.push('/(tabs)' as any)}
        >
          <Text style={styles.exploreButtonText}>Przeglądaj firmy</Text>
        </TouchableOpacity>
      </View>
    );
  }

  /**
   * RENDER: Lista ulubionych firm
   */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ulubione</Text>
        <Text style={styles.headerSubtitle}>
          {businesses.length} {businesses.length === 1 ? 'firma' : 'firm'}
        </Text>
      </View>

      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => handleBusinessPress(item)}
            activeOpacity={0.7}
          >
            {/* Ikona firmy */}
            <View style={styles.cardIcon}>
              <Ionicons name="business" size={32} color={Colors.accent} />
            </View>

            {/* Informacje firmy */}
            <View style={styles.cardContent}>
              <Text style={styles.businessName} numberOfLines={1}>
                {item.name}
              </Text>

              {item.category && (
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.category}</Text>
                </View>
              )}

              {item.description && (
                <Text style={styles.businessDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {item.address && (
                <View style={styles.addressRow}>
                  <Ionicons name="location-outline" size={14} color="#666" />
                  <Text style={styles.addressText} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>
              )}
            </View>

            {/* Przycisk ulubione */}
            <AnimatedHeart
              isFavorite={true}
              onPress={() => handleToggleFavorite(item.id)}
            />
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.accent]} />
        }
      />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 6,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0284c7',
    textTransform: 'uppercase',
  },
  businessDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  addressText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    flex: 1,
  },
  favoriteBtn: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  exploreButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
