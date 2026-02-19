import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Platform,
  Animated
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import Colors from '../../constants/Colors';
import type { Business } from '../../types/api';

// ✨ Animowane serce (do usuwania z ulubionych z poziomu listy)
function AnimatedHeart({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) {
  const scale = useState(new Animated.Value(1))[0];

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 150, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity 
      style={styles.favoriteButton}
      onPress={handlePress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons 
          name={isFavorite ? "heart" : "heart-outline"} 
          size={24} 
          color={isFavorite ? "#FF3B5C" : "#fff"} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function FavoritesScreen() {
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { favoritesData, toggleFavorite } = useFavorites();

  const handleBusinessPress = (business: Business) => {
    router.push({
      pathname: '/business/[id]',
      params: { id: business.slug || String(business.id) },
    });
  };

  const handleRemoveFavorite = async (business: Business) => {
    try {
      await toggleFavorite(business);
    } catch (error) {
      console.error('Failed to remove favorite:', error);
    }
  };

  const formatAddress = (business: Business) => {
    if (business.address) return business.address;
    const parts = [business.address_line1, business.city].filter(Boolean);
    return parts.join(', ');
  };

  const renderFavoriteCard = ({ item }: { item: Business }) => {
    const imageUrl = `https://picsum.photos/seed/${item.id}/600/400`; // Placeholder
    const address = formatAddress(item);

    return (
      <TouchableOpacity 
        style={styles.cardWrapper}
        onPress={() => handleBusinessPress(item)}
        activeOpacity={0.9}
      >
        <View style={styles.card}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.businessImage}
              contentFit="cover"
              transition={300}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              style={styles.imageGradient}
            />
            
            <View style={styles.favoriteContainer}>
              <AnimatedHeart 
                isFavorite={true} 
                onPress={() => handleRemoveFavorite(item)} 
              />
            </View>

            <View style={styles.categoryBadge}>
              <LinearGradient
                colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.8)']}
                style={styles.categoryGradient}
              >
                <Text style={styles.categoryText}>{item.category || 'Usługi'}</Text>
              </LinearGradient>
            </View>
          </View>
          
          <View style={styles.cardContent}>
            <Text style={styles.businessName} numberOfLines={1}>{item.name}</Text>
            
            <View style={styles.metaRow}>
              {address ? (
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={14} color={Colors.accent} />
                  <Text style={styles.metaText} numberOfLines={1}>{address}</Text>
                </View>
              ) : null}
              
              {item.services_count ? (
                <View style={styles.metaItem}>
                  <Ionicons name="cut" size={14} color={Colors.accent} />
                  <Text style={styles.metaText}>{item.services_count} usług</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <View style={styles.notLoggedInContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={50} color="#8B7AB8" />
          </View>
          <Text style={styles.emptyTitle}>Ulubione miejsca</Text>
          <Text style={styles.emptySubtitle}>
            Zaloguj się, aby zapisywać swoje ulubione salony i mieć do nich szybki dostęp.
          </Text>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.actionButtonText}>Zaloguj się</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ulubione</Text>
        <Text style={styles.headerSubtitle}>
          {favoritesData.length} {favoritesData.length === 1 ? 'zapisane miejsce' : 'zapisanych miejsc'}
        </Text>
      </View>

      <FlatList
        data={favoritesData}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderFavoriteCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="heart-dislike-outline" size={60} color="#ccc" />
            </View>
            <Text style={styles.emptyTitle}>Brak ulubionych</Text>
            <Text style={styles.emptySubtitle}>
              Nie dodałeś jeszcze żadnego miejsca do ulubionych. Odkryj najlepsze salony w okolicy!
            </Text>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={() => router.push('/(tabs)')}
            >
              <Ionicons name="search" size={18} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.actionButtonText}>Przeglądaj firmy</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DFF5',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },
  cardWrapper: {
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  businessImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  favoriteContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
  },
  favoriteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#333',
    textTransform: 'uppercase',
  },
  cardContent: {
    padding: 16,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
  },
  notLoggedInContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: '#8B7AB8',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#8B7AB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});