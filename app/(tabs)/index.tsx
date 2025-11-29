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
  Animated
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
import Colors from '../../constants/Colors';
import SearchBar from '../../components/search/SearchBar';
import CategoryFilter from '../../components/categories/CategoryFilter';

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

// ✨ Animated Heart Component
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
    <Pressable
      onPress={handlePress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={styles.favoriteButton}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons 
          name={isFavorite ? "heart" : "heart-outline"} 
          size={26} 
          color={isFavorite ? "#e74c3c" : "#ccc"} 
        />
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  
  // State
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Debounced search query (wait 500ms after user stops typing)
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Load categories
  const loadCategories = async () => {
    try {
      console.log('📤 [HomeScreen] Loading categories...');
      const data = await getBusinessCategories();
      console.log('✅ [HomeScreen] Categories loaded:', data);
      setCategories(data);
    } catch (error) {
      console.error('❌ [HomeScreen] Error loading categories:', error);
    }
  };

  // Load businesses with filters
  const loadBusinesses = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setSearching(true);
      }
      
      console.log('📤 [HomeScreen] Searching businesses:', {
        search: debouncedSearch,
        category: selectedCategory,
      });
      
      const data = await searchBusinesses(
        debouncedSearch || undefined,
        selectedCategory !== 'all' ? selectedCategory : undefined
      );
      
      console.log('✅ [HomeScreen] Businesses loaded:', {
        count: data.length,
      });
      
      setBusinesses(data);
    } catch (error) {
      console.error('❌ [HomeScreen] Error loading businesses:', error);
    } finally {
      setLoading(false);
      setSearching(false);
      setRefreshing(false);
    }
  }, [debouncedSearch, selectedCategory]);

  // Initial load
  useEffect(() => {
    loadCategories();
    loadBusinesses();
  }, []);

  // Reload when filters change
  useEffect(() => {
    if (!loading) {
      loadBusinesses(false);
    }
  }, [debouncedSearch, selectedCategory]);

  const onRefresh = () => {
    setRefreshing(true);
    loadCategories();
    loadBusinesses();
  };

  const handleBusinessPress = (business: Business) => {
    router.push({
      pathname: '/business/[id]',
      params: { id: business.slug || String(business.id) },
    });
  };

  const handleFavoritePress = (businessId: string) => {
    toggleFavorite(businessId);
  };

  // ✅ useCallback - stabilne handlery
  const handleCategorySelect = useCallback((categorySlug: string) => {
    console.log('🔵 [HomeScreen] Category selected:', categorySlug);
    setSelectedCategory(categorySlug);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  const handleSearchClear = useCallback(() => {
    console.log('🔵 [HomeScreen] Search cleared');
  }, []);

  const handleClearAllFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
  }, []);

  // ✅ Enhanced business card with favorite button
  const renderBusiness = useCallback(({ item }: { item: Business }) => {
    const categoryDisplay = categories.find(cat => cat.slug === item.category)?.name || item.category || 'Usługa';
    const businessId = item.slug || String(item.id);
    const favorite = isFavorite(businessId);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleBusinessPress(item)}
        activeOpacity={0.8}
      >
        {/* ✨ Favorite Button - Top Right Corner */}
        <View style={styles.favoriteContainer}>
          <AnimatedHeart 
            isFavorite={favorite} 
            onPress={() => handleFavoritePress(businessId)} 
          />
        </View>

        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={28} color={Colors.accent} />
          </View>
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
        
        <View style={styles.footer}>
          <View style={styles.addressContainer}>
            <Ionicons name="location" size={16} color={Colors.accent} />
            <Text style={styles.address} numberOfLines={1}>
              {(item as any).city || (item as any).address_line1 || item.address || 'Brak adresu'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#ddd" />
        </View>
      </TouchableOpacity>
    );
  }, [categories, isFavorite]);

  // ✅ Memoized empty state
  const renderEmpty = useMemo(() => {
    if (searching) {
      return null;
    }

    const hasFilters = searchQuery.length > 0 || selectedCategory !== 'all';

    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name={hasFilters ? "search-outline" : "business-outline"} 
          size={64} 
          color="#ddd" 
        />
        <Text style={styles.emptyText}>
          {hasFilters ? 'Brak wyników' : 'Brak dostępnych firm'}
        </Text>
        <Text style={styles.emptySubtext}>
          {hasFilters 
            ? 'Spróbuj zmienić filtry lub wyszukiwanie' 
            : 'Wróć później'}
        </Text>
        {hasFilters && (
          <TouchableOpacity
            style={styles.clearFiltersButton}
            onPress={handleClearAllFilters}
          >
            <Text style={styles.clearFiltersText}>Wyczyść filtry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [searching, searchQuery, selectedCategory, handleClearAllFilters]);

  // ✅ Memoized header
  const renderHeader = useMemo(() => (
    <>
      {/* Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={handleSearchChange}
        onClear={handleSearchClear}
        loading={searching}
        placeholder="Szukaj po nazwie lub mieście..."
      />

      {/* Category Filter */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        loading={searching}
      />

      {/* Results Count */}
      {!loading && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {businesses.length} {businesses.length === 1 ? 'wynik' : 'wyników'}
          </Text>
          {(searchQuery || selectedCategory !== 'all') && (
            <TouchableOpacity onPress={handleClearAllFilters}>
              <Text style={styles.clearAllText}>Wyczyść wszystko</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  ), [
    searchQuery,
    selectedCategory,
    categories,
    searching,
    loading,
    businesses.length,
    handleSearchChange,
    handleSearchClear,
    handleCategorySelect,
    handleClearAllFilters,
  ]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.accent} />
        <Text style={styles.loadingText}>Ładowanie...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with greeting */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Cześć{user?.first_name ? `, ${user.first_name}` : ''}! 👋
          </Text>
          <Text style={styles.subtitle}>Znajdź swoją usługę</Text>
        </View>
      </View>

      <FlatList
        data={businesses}
        renderItem={renderBusiness}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={Colors.accent}
            colors={[Colors.accent]}
          />
        }
        showsVerticalScrollIndicator={true}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        windowSize={21}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#999',
    fontSize: 14,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  resultsCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  clearAllText: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
    position: 'relative',
  },
  favoriteContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
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
    paddingRight: 44, // Make space for heart
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF5F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  category: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 14,
    lineHeight: 21,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  address: {
    fontSize: 13,
    color: '#888',
    flex: 1,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  clearFiltersButton: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.accent,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});