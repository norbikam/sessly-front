import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  RefreshControl, 
  ActivityIndicator,
  Platform,
  Pressable,
  Animated,
  Modal,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { 
  searchBusinesses, 
  getBusinessCategories,
  type BusinessCategory 
} from '../../api/business';
import { Business } from '../../types/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';
import SearchBar from '../../components/search/SearchBar';
import CategoryFilter from '../../components/categories/CategoryFilter';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SORT_KEY = '@sessly_sort_preference';

// Sort options
type SortOption = 'name-asc' | 'name-desc' | 'newest';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nazwa A-Z', icon: 'text-outline' },
  { value: 'name-desc', label: 'Nazwa Z-A', icon: 'text-outline' },
  { value: 'newest', label: 'Najnowsze', icon: 'time-outline' },
];

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// ✨ Skeleton Card Loader
function SkeletonCard() {
  const shimmerAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={[styles.card, { marginBottom: 12 }]}>
      <View style={styles.cardHeader}>
        <Animated.View style={[styles.iconContainer, { opacity, backgroundColor: '#e0e0e0' }]} />
        <View style={styles.cardInfo}>
          <Animated.View style={[styles.skeletonText, { width: 160, height: 18, opacity }]} />
          <Animated.View style={[styles.skeletonText, { width: 80, height: 14, marginTop: 8, opacity }]} />
        </View>
      </View>
      <Animated.View style={[styles.skeletonText, { width: '100%', height: 14, marginTop: 12, opacity }]} />
      <Animated.View style={[styles.skeletonText, { width: '80%', height: 14, marginTop: 6, opacity }]} />
    </View>
  );
}

// Animated Heart Component
function AnimatedHeart({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) {
  const scale = useState(new Animated.Value(1))[0];

  const handlePress = () => {
    // Animate scale
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <TouchableOpacity 
      style={styles.favoriteButton}
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons 
          name={isFavorite ? "heart" : "heart-outline"} 
          size={24} 
          color={isFavorite ? "#e74c3c" : "#666"} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// Sort Modal
function SortModal({ 
  visible, 
  onClose, 
  onSelect, 
  currentSort 
}: { 
  visible: boolean; 
  onClose: () => void; 
  onSelect: (sort: SortOption) => void; 
  currentSort: SortOption 
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sortowanie</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          {SORT_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.sortOption,
                currentSort === option.value && styles.sortOptionActive
              ]}
              onPress={() => {
                onSelect(option.value as SortOption);
                onClose();
              }}
            >
              <Ionicons 
                name={option.icon as any} 
                size={20} 
                color={currentSort === option.value ? Colors.accent : '#666'} 
              />
              <Text style={[
                styles.sortOptionText,
                currentSort === option.value && styles.sortOptionTextActive
              ]}>
                {option.label}
              </Text>
              {currentSort === option.value && (
                <Ionicons name="checkmark" size={20} color={Colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showSortModal, setShowSortModal] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Load sort preference
  useEffect(() => {
    const loadSortPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(SORT_KEY);
        if (saved) {
          setSortBy(saved as SortOption);
        }
      } catch (error) {
        console.error('Failed to load sort preference:', error);
      }
    };
    loadSortPreference();
  }, []);

  // Save sort preference
  const saveSortPreference = async (sort: SortOption) => {
    try {
      await AsyncStorage.setItem(SORT_KEY, sort);
    } catch (error) {
      console.error('Failed to save sort preference:', error);
    }
  };

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await getBusinessCategories();
        setCategories(data);
      } catch (error) {
        console.error('Failed to load categories:', error);
      }
    };
    loadCategories();
  }, []);

  // Load businesses
  useEffect(() => {
    loadBusinesses();
  }, [debouncedSearch, selectedCategory]);

  const loadBusinesses = async () => {
    setSearching(true);
    try {
      const data = await searchBusinesses(debouncedSearch, selectedCategory);
      setBusinesses(data);
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBusinesses();
    setRefreshing(false);
  };

  const handleBusinessPress = (business: Business) => {
    router.push({
      pathname: '/business/[id]',
      params: { id: business.slug || String(business.id) },
    });
  };

  // ✅ LOGIN GUARD dla favorites
  const handleFavoritePress = async (businessId: string) => {
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
    
    await toggleFavorite(String(businessId));
  };

  const handleSortSelect = (sort: SortOption) => {
    setSortBy(sort);
    saveSortPreference(sort);
  };

  // ✅ useCallback - stabilne handlery
  const handleCategorySelect = useCallback((categorySlug: string) => {
    console.log('🔵 [HomeScreen] Category selected:', categorySlug);
    setSelectedCategory(categorySlug);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Sort businesses
  const sortedBusinesses = useMemo(() => {
    console.log('🔍 [DEBUG] sortedBusinesses check:', {
      type: typeof businesses,
      isArray: Array.isArray(businesses),
      length: businesses?.length,
    });
    
    if (!Array.isArray(businesses)) {
      console.error('❌ businesses is NOT an array!', businesses);
      return [];
    }
    
    const sorted = [...businesses];
    
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        sorted.sort((a, b) => {
          const aId = String(a.id);
          const bId = String(b.id);
          return bId.localeCompare(aId);
        });
        break;
    }
    
    return sorted;
  }, [businesses, sortBy]);

  const renderBusinessCard = ({ item }: { item: Business }) => {
    const businessId = item.slug || String(item.id);
    const favorite = isFavorite(businessId);
    const categoryDisplay = item.category || 'Inne';

    return (
      <TouchableOpacity 
        style={styles.cardWrapper}
        onPress={() => handleBusinessPress(item)}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#ffffff', '#f8f9fa']}
          style={styles.card}
        >
          {/* ✨ Favorite Button - Top Right Corner */}
          <View style={styles.favoriteContainer}>
            <AnimatedHeart 
              isFavorite={favorite} 
              onPress={() => handleFavoritePress(businessId)} 
            />
          </View>

          <View style={styles.cardHeader}>
            <LinearGradient
              colors={[Colors.gradientStart, Colors.gradientEnd]}
              style={styles.iconContainer}
            >
              <Ionicons name="business" size={28} color="#fff" />
            </LinearGradient>
            <View style={styles.cardInfo}>
              <Text style={styles.businessName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.category}>{categoryDisplay}</Text>
              </View>
            </View>
          </View>
          
          {item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          
          {item.address && (
            <View style={styles.addressContainer}>
              <Ionicons name="location-outline" size={14} color="#666" />
              <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>
            Cześć{user ? `, ${user.first_name || user.username}` : ''}!
          </Text>
          <Text style={styles.subtitle}>Znajdź idealną usługę dla siebie</Text>
        </View>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar 
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder="Szukaj firmy..."
        />
      </View>

      {/* Category Filter */}
      <CategoryFilter 
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
      />

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {sortedBusinesses.length} {sortedBusinesses.length === 1 ? 'firma' : 'firm'}
        </Text>
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
        >
          <Ionicons name="funnel-outline" size={18} color={Colors.accent} />
          <Text style={styles.sortButtonText}>Sortuj</Text>
        </TouchableOpacity>
      </View>

      {/* Business List */}
      {loading ? (
        <View style={styles.listContent}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : searching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Wyszukiwanie...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedBusinesses}
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
              <Ionicons name="search-outline" size={80} color="#ccc" />
              <Text style={styles.emptyTitle}>Brak wyników</Text>
              <Text style={styles.emptyText}>
                Spróbuj zmienić kryteria wyszukiwania
              </Text>
            </View>
          )}
        />
      )}

      {/* Sort Modal */}
      <SortModal 
        visible={showSortModal}
        onClose={() => setShowSortModal(false)}
        onSelect={handleSortSelect}
        currentSort={sortBy}
      />
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
  greetingContainer: {
    marginBottom: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '500',
  },
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#f0f4ff',
    borderRadius: 10,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accent,
    marginLeft: 6,
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
  favoriteContainer: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
  },
  favoriteButton: {
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
    paddingVertical: 40,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sortOptionActive: {
    backgroundColor: '#f0f4ff',
  },
  sortOptionText: {
    flex: 1,
    fontSize: 15,
    color: '#111',
    marginLeft: 12,
    fontWeight: '500',
  },
  sortOptionTextActive: {
    fontWeight: '700',
    color: Colors.accent,
  },
  skeletonText: {
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
  },
});