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
  Linking,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
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
import { BusinessListSkeleton } from '@/components/skeletons/SkeletonLoader';

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

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  
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

  // ✅ Quick Actions
  const handleCallPress = (phone: string, e: any) => {
    e.stopPropagation();
    Linking.openURL(`tel:${phone}`);
  };

  const handleWebsitePress = (url: string, e: any) => {
    e.stopPropagation();
    Linking.openURL(url);
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

  // ✅ ENHANCED Business Card Renderer
  const renderBusiness = useCallback(({ item }: { item: Business }) => {
    // Get category name for display
    const categoryDisplay = categories.find(cat => cat.slug === item.category)?.name || item.category || 'Usługa';
    
    // Get contact info from item
    const phone = (item as any).phone_number || item.phone || '';
    const email = (item as any).email || '';
    const website = (item as any).website_url || (item as any).website || '';
    const city = (item as any).city || '';
    const address = (item as any).address_line1 || item.address || '';
    
    const fullAddress = city ? `${address}, ${city}` : address;
    
    // Check if business has services
    const services = (item as any).services || [];
    const servicesCount = services.length;
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => handleBusinessPress(item)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={24} color={Colors.accent} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.businessName}>{item.name}</Text>
            <Text style={styles.category}>{categoryDisplay}</Text>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        {/* Address */}
        {fullAddress ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.infoText} numberOfLines={1}>
              {fullAddress}
            </Text>
          </View>
        ) : null}
        
        {/* Services count */}
        {servicesCount > 0 && (
          <View style={styles.infoRow}>
            <Ionicons name="cut-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {servicesCount} {servicesCount === 1 ? 'usługa' : 'usług'}
            </Text>
          </View>
        )}
        
        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          {phone ? (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => handleCallPress(phone, e)}
            >
              <Ionicons name="call-outline" size={18} color={Colors.accent} />
              <Text style={styles.actionText}>Zadzwoń</Text>
            </TouchableOpacity>
          ) : null}
          
          {website ? (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => handleWebsitePress(website, e)}
            >
              <Ionicons name="globe-outline" size={18} color={Colors.accent} />
              <Text style={styles.actionText}>Strona</Text>
            </TouchableOpacity>
          ) : null}
          
          <View style={styles.actionSpacer} />
          
          <View style={styles.chevronContainer}>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [categories]);

  // ✅ Memoized empty state
  const renderEmpty = useMemo(() => {
    if (searching || loading) {
      return null;
    }

    const hasFilters = searchQuery.length > 0 || selectedCategory !== 'all';

    return (
      <View style={styles.emptyContainer}>
        <Ionicons 
          name={hasFilters ? "search-outline" : "business-outline"} 
          size={64} 
          color="#ccc" 
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
  }, [searching, loading, searchQuery, selectedCategory, handleClearAllFilters]);

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

  // ✅ NEW: Skeleton loading state
  if (loading) {
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

        <ScrollView style={styles.skeletonContainer} contentContainerStyle={styles.list}>
          {renderHeader}
          <BusinessListSkeleton count={5} />
        </ScrollView>
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
  skeletonContainer: {
    flex: 1,
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
  // ✅ ENHANCED CARD STYLES
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  category: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  // ✅ NEW: Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  // ✅ NEW: Actions row
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },
  actionSpacer: {
    flex: 1,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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