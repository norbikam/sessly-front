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
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
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

const { width } = Dimensions.get('window');
const SORT_KEY = '@sessly_sort_preference';

type SortOption = 'name-asc' | 'name-desc' | 'newest';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nazwa A-Z', icon: 'arrow-up-outline' },
  { value: 'name-desc', label: 'Nazwa Z-A', icon: 'arrow-down-outline' },
  { value: 'newest', label: 'Najnowsze', icon: 'sparkles-outline' },
];

// ✅ Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// ✨ Enhanced Skeleton Loader
function SkeletonCard() {
  const shimmerAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
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
    <View style={styles.skeletonCard}>
      <Animated.View style={[styles.skeletonImage, { opacity }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        <Animated.View style={[styles.skeletonSubtitle, { opacity }]} />
        <View style={styles.skeletonRow}>
          <Animated.View style={[styles.skeletonBadge, { opacity }]} />
          <Animated.View style={[styles.skeletonBadge, { opacity }]} />
        </View>
      </View>
    </View>
  );
}

// ✨ Animated Heart Component
function AnimatedHeart({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) {
  const scale = useState(new Animated.Value(1))[0];
  const rotation = useState(new Animated.Value(0))[0];

  const handlePress = () => {
    // Animacja pulsowania i obrotu
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.4,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    onPress();
  };

  const rotate = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '15deg'],
  });

  return (
    <TouchableOpacity 
      style={styles.favoriteButton}
      onPress={handlePress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale }, { rotate }] }}>
        <Ionicons 
          name={isFavorite ? "heart" : "heart-outline"} 
          size={26} 
          color={isFavorite ? "#FF3B5C" : "#fff"} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// ✨ Sort Modal
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
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sortowanie</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color="#999" />
            </TouchableOpacity>
          </View>
          
          {SORT_OPTIONS.map((option) => {
            const isActive = currentSort === option.value;
            
            return (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortOption,
                  isActive && styles.sortOptionActive
                ]}
                onPress={() => {
                  onSelect(option.value as SortOption);
                  onClose();
                }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.sortOptionIcon,
                  isActive && styles.sortOptionIconActive
                ]}>
                  <Ionicons 
                    name={option.icon as any} 
                    size={22} 
                    color={isActive ? '#fff' : Colors.accent} 
                  />
                </View>
                
                <Text style={[
                  styles.sortOptionText,
                  isActive && styles.sortOptionTextActive
                ]}>
                  {option.label}
                </Text>
                
                {isActive && (
                  <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
                )}
              </TouchableOpacity>
            );
          })}
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
        if (saved) setSortBy(saved as SortOption);
      } catch (error) {
        console.error('Failed to load sort preference:', error);
      }
    };
    loadSortPreference();
  }, []);

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

  // ✅ POPRAWIONE: Obsługa ulubionych - przekazuje cały obiekt Business
  const handleFavoritePress = async (business: Business) => {
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
    
    try {
      await toggleFavorite(business); // ✅ Przekazuje cały obiekt Business
    } catch (error: any) {
      console.error('❌ Toggle favorite failed:', error);
      Alert.alert('Błąd', 'Nie udało się zmienić statusu ulubionej');
    }
  };

  const handleSortSelect = (sort: SortOption) => {
    setSortBy(sort);
    saveSortPreference(sort);
  };

  const handleCategorySelect = useCallback((categorySlug: string) => {
    setSelectedCategory(categorySlug);
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
  }, []);

  // Sort businesses
  const sortedBusinesses = useMemo(() => {
    if (!Array.isArray(businesses)) return [];
    
    const sorted = [...businesses];
    
    switch (sortBy) {
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'newest':
        sorted.sort((a, b) => String(b.id).localeCompare(String(a.id)));
        break;
    }
    
    return sorted;
  }, [businesses, sortBy]);

  // ✅ Format business address
  const formatBusinessAddress = (business: Business): string => {
    if (business.address) return business.address;
    const parts = [business.address_line1, business.city].filter(Boolean);
    return parts.join(', ');
  };

  // ✨ Enhanced Business Card with Image
  const renderBusinessCard = ({ item }: { item: Business }) => {
    const businessId = String(item.id);
    const favorite = isFavorite(businessId);
    const categoryDisplay = item.category || 'Inne';
    
    // Mock image URL - zamień na rzeczywisty URL z API gdy będzie dostępny
    const imageUrl = `https://picsum.photos/seed/${item.id}/600/400`;
    const address = formatBusinessAddress(item);

    return (
      <TouchableOpacity 
        style={styles.cardWrapper}
        onPress={() => handleBusinessPress(item)}
        activeOpacity={0.95}
      >
        <View style={styles.card}>
          {/* ✨ Image Section with Gradient Overlay */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.businessImage}
              contentFit="cover"
              transition={300}
            />
            
            {/* Gradient overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.imageGradient}
            />
            
            {/* ✨ Favorite Button on Image */}
            <View style={styles.favoriteContainer}>
              <AnimatedHeart 
                isFavorite={favorite} 
                onPress={() => handleFavoritePress(item)} 
              />
            </View>
            
            {/* ✨ Category Badge on Image */}
            <View style={styles.categoryBadgeOnImage}>
              <LinearGradient
                colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.7)']}
                style={styles.categoryBadgeGradient}
              >
                <Text style={styles.categoryBadgeText}>{categoryDisplay}</Text>
              </LinearGradient>
            </View>
          </View>
          
          {/* ✨ Content Section */}
          <LinearGradient
            colors={['#ffffff', '#fafbfc']}
            style={styles.cardContent}
          >
            <Text style={styles.businessName} numberOfLines={1}>
              {item.name}
            </Text>
            
            {item.description && (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            
            {/* ✨ Meta Row */}
            <View style={styles.metaRow}>
              {address && (
                <View style={styles.metaItem}>
                  <Ionicons name="location" size={14} color={Colors.accent} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {address.split(',')[0]}
                  </Text>
                </View>
              )}
              
              {item.services_count && item.services_count > 0 && (
                <View style={styles.metaItem}>
                  <Ionicons name="cut" size={14} color={Colors.accent} />
                  <Text style={styles.metaText}>
                    {item.services_count} {item.services_count === 1 ? 'usługa' : 'usług'}
                  </Text>
                </View>
              )}
            </View>
            
            {/* ✨ CTA Button */}
            <View style={styles.ctaContainer}>
              <LinearGradient
                colors={[Colors.gradientStart, Colors.gradientEnd]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaButton}
              >
                <Text style={styles.ctaText}>Zobacz szczegóły</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </LinearGradient>
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* ✨ NOWY PREMIUM HEADER */}
      <View style={styles.headerWrapper}>
        <LinearGradient 
          colors={['#8B7AB8', '#B8A3E0', '#9D8AC7']} 
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Dekoracyjne circles */}
          <View style={styles.headerCircle1} />
          <View style={styles.headerCircle2} />
          <View style={styles.headerCircle3} />
          
          <View style={styles.headerTop}>
            {/* Logo/App Name */}
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Ionicons name="sparkles" size={24} color="#fff" />
              </View>
              <Text style={styles.appName}>Sessly</Text>
            </View>
            
            {/* User Actions */}
            {isLoggedIn ? (
              <View style={styles.userBadge}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.first_name || user?.username || 'Użytkownik'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.loginPill}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.85}
              >
                <Ionicons name="log-in-outline" size={18} color="#8B7AB8" />
                <Text style={styles.loginPillText}>Zaloguj się</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Stats Row (optional - pokazuje statystyki) */}
          {isLoggedIn && (
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={18} color="#fff" />
                <Text style={styles.statText}>0 wizyt</Text>
              </View>
            </View>
          )}
        </LinearGradient>
        
        {/* Wave Separator */}
        <View style={styles.waveContainer}>
          <LinearGradient
            colors={['#9D8AC7', 'transparent']}
            style={styles.wave}
          />
        </View>
      </View>

      {/* Actual Search Bar (functional) */}
      <View style={styles.searchContainer}>
        <SearchBar 
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholder="Szukaj firmy, usługi..."
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
        <View style={styles.resultsLeft}>
          <Ionicons name="business" size={20} color={Colors.accent} />
          <Text style={styles.resultsCount}>
            {sortedBusinesses.length} {sortedBusinesses.length === 1 ? 'firma' : 'firm'}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.sortButton}
          onPress={() => setShowSortModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="swap-vertical" size={18} color="#fff" />
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
              colors={[Colors.accent]}
            />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="search-outline" size={80} color="#ddd" />
              </View>
              <Text style={styles.emptyTitle}>Brak wyników</Text>
              <Text style={styles.emptyText}>
                Spróbuj zmienić kryteria wyszukiwania
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
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
    backgroundColor: '#FAF8FF',
  },
  
  // ✨ NOWY HEADER STYLES
  headerWrapper: {
    position: 'relative',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 45,
    paddingBottom: 32,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Dekoracyjne circles
  headerCircle1: {
    position: 'absolute',
    top: -50,
    right: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerCircle2: {
    position: 'absolute',
    top: 100,
    right: 50,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerCircle3: {
    position: 'absolute',
    bottom: 20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 1,
  },
  
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.5,
  },
  
  userBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    paddingRight: 16,
    borderRadius: 20,
    gap: 8,
    maxWidth: 150,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B7AB8',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  
  loginPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  loginPillText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B7AB8',
  },
  
  greetingSection: {
    marginBottom: 20,
    zIndex: 1,
  },
  greetingTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  greetingSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  
  headerSearchContainer: {
    marginBottom: 16,
    zIndex: 1,
  },
  headerSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  headerSearchInput: {
    flex: 1,
  },
  headerSearchPlaceholder: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 16,
    zIndex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  wave: {
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  
  searchContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5DFF5',
  },
  resultsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultsCount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2D2438',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B7AB8',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
    shadowColor: '#8B7AB8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  
  // ... (reszta stylów bez zmian - listContent, cardWrapper, etc.) ...
  
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardWrapper: {
    marginBottom: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  card: {
    borderRadius: 20,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    height: 200,
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
    height: 100,
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  categoryBadgeOnImage: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  categoryBadgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryBadgeText: {
    color: '#333',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardContent: {
    padding: 16,
  },
  businessName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
    flex: 1,
  },
  ctaContainer: {
    marginTop: 4,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  ctaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#F5F3FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    gap: 14,
  },
  sortOptionActive: {
    backgroundColor: '#F5F3FF',
    borderWidth: 2,
    borderColor: '#8B7AB8',
  },
  sortOptionIcon: {
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
    elevation: 2,
  },
  sortOptionIconActive: {
    backgroundColor: '#8B7AB8',
  },
  sortOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  sortOptionTextActive: {
    fontWeight: '800',
    color: '#8B7AB8',
  },
  skeletonCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  skeletonImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#e0e0e0',
  },
  skeletonContent: {
    padding: 16,
  },
  skeletonTitle: {
    width: '70%',
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 10,
  },
  skeletonSubtitle: {
    width: '90%',
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  skeletonBadge: {
    width: 80,
    height: 28,
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
  },
});
