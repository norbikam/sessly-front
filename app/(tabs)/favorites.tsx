import React, { useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useAuth } from '../../contexts/AuthContext';
import Colors from '../../constants/Colors';
import type { Business } from '../../types/api';

export default function FavoritesScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { favoritesData, isFavorite, toggleFavorite, refreshFavorites, loading } = useFavorites();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFavorites();
    setRefreshing(false);
  }, [refreshFavorites]);

  const handleBusinessPress = (business: Business) => {
    router.push({
      pathname: '/business/[id]',
      params: { id: business.slug || String(business.id) },
    });
  };

const handleRemoveFavorite = async (business: Business) => {
  try {
    await toggleFavorite(business); // ✅ Przekazujemy cały obiekt
    await refreshFavorites(); // Odśwież listę
  } catch (error) {
    console.error('Failed to remove favorite:', error);
  }
};

  const formatBusinessAddress = (business: Business): string => {
    if (business.address) return business.address;
    const parts = [business.address_line1, business.city].filter(Boolean);
    return parts.join(', ');
  };

  const renderBusinessCard = ({ item }: { item: Business }) => {
    const businessId = item.slug || String(item.id);
    const favorite = isFavorite(businessId);

    return (
      <TouchableOpacity
        style={styles.cardWrapper}
        onPress={() => handleBusinessPress(item)}
        activeOpacity={0.8}
      >
        <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.card}>
          {/* Remove Button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveFavorite(item)} // ✅ Przekazujemy item (Business)
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="heart" size={24} color="#e74c3c" />
          </TouchableOpacity>

          <View style={styles.cardHeader}>
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.iconContainer}
            >
              <Ionicons name="business" size={28} color="#fff" />
            </LinearGradient>
            <View style={styles.cardInfo}>
              <Text style={styles.businessName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.category}>{item.category || 'Inne'}</Text>
              </View>
            </View>
          </View>

          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}

          {(item.address || item.city) && (
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.address} numberOfLines={1}>
                {formatBusinessAddress(item)}
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
          <Text style={styles.headerTitle}>Ulubione</Text>
        </LinearGradient>
        <View style={styles.notLoggedInContainer}>
          <Ionicons name="heart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Nie jesteś zalogowany</Text>
          <Text style={styles.emptyText}>Zaloguj się, aby zobaczyć ulubione firmy</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.loginButtonText}>Zaloguj się</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
        <Text style={styles.headerTitle}>Ulubione</Text>
        <Text style={styles.headerSubtitle}>
          {favoritesData.length} {favoritesData.length === 1 ? 'firma' : 'firm'}
        </Text>
      </LinearGradient>

      {loading && favoritesData.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Ładowanie ulubionych...</Text>
        </View>
      ) : (
        <FlatList
          data={favoritesData}
          keyExtractor={(item) => item.slug || String(item.id)}
          renderItem={renderBusinessCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.accent}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="heart-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>Brak ulubionych</Text>
              <Text style={styles.emptyText}>
                Dodaj firmy do ulubionych, aby szybko do nich wracać
              </Text>
              <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => router.push('/(tabs)')}
              >
                <Text style={styles.exploreButtonText}>Przeglądaj firmy</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f9',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardWrapper: {
    marginBottom: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  card: {
    borderRadius: 16,
    padding: 18,
    position: 'relative',
    paddingRight: 50,
  },
  removeButton: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 13,
    color: '#555',
    marginBottom: 10,
    lineHeight: 19,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  address: {
    fontSize: 12,
    color: '#666',
    marginLeft: 6,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
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
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loginButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
