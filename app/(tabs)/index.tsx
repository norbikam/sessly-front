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
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { searchBusinesses, getBusinessCategories, type BusinessCategory } from '../../api/business';
import { getUserAppointments } from '../../api/appointments';
import { Business } from '../../types/api';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';
import SearchBar from '../../components/search/SearchBar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const SORT_KEY = '@sessly_sort_preference';

type SortOption = 'name-asc' | 'name-desc' | 'newest';

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nazwa A-Z', icon: 'arrow-up-outline' },
  { value: 'name-desc', label: 'Nazwa Z-A', icon: 'arrow-down-outline' },
  { value: 'newest', label: 'Najnowsze', icon: 'sparkles-outline' },
];

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

const getAppointmentsLabel = (count: number) => {
  if (count === 1) return 'wizyta';
  if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) return 'wizyty';
  return 'wizyt';
};

// ANIMACJA LADOWANIA (SKELETON)
function SkeletonCard() {
  const shimmerAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 1000, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.8],
  });

  return (
    <View style={styles.skeletonCard}>
      <Animated.View style={[styles.skeletonImage, { opacity }]} />
      <View style={styles.skeletonContent}>
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        <Animated.View style={[styles.skeletonSubtitle, { opacity }]} />
        <View style={styles.skeletonRow}>
          <Animated.View style={[styles.skeletonBadge, { opacity }]} />
        </View>
      </View>
    </View>
  );
}

// ANIMOWANE SERDUSZKO ULUBIONYCH
function AnimatedHeart({ isFavorite, onPress }: { isFavorite: boolean; onPress: () => void }) {
  const scale = useState(new Animated.Value(1))[0];

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.3, duration: 120, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity 
      style={styles.favoriteButton}
      onPress={handlePress}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      activeOpacity={0.8}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons 
          name={isFavorite ? "heart" : "heart-outline"} 
          size={24} 
          color={isFavorite ? "#EF4444" : "#6B7280"} 
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

// MODAL SORTOWANIA
function SortModal({ visible, onClose, onSelect, currentSort }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Sortowanie</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close-circle" size={28} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
          
          {SORT_OPTIONS.map((option) => {
            const isActive = currentSort === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.sortOption, isActive && styles.sortOptionActive]}
                onPress={() => { onSelect(option.value); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={[styles.sortOptionIcon, isActive && styles.sortOptionIconActive]}>
                  <Ionicons name={option.icon as any} size={22} color={isActive ? '#fff' : Colors.light.accent} />
                </View>
                <Text style={[styles.sortOptionText, isActive && styles.sortOptionTextActive]}>{option.label}</Text>
                {isActive && <Ionicons name="checkmark-circle" size={24} color={Colors.light.accent} />}
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
  
  // ✅ POBIERAMY favoriteIds, aby FlatList wiedział, kiedy ma się odświeżyć
  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites();
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<number>(0);
  
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');
  const [showSortModal, setShowSortModal] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 500);

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

  const handleSortSelect = (sort: SortOption) => {
    setSortBy(sort);
    saveSortPreference(sort);
  };

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

  const loadBusinesses = useCallback(async () => {
    setSearching(true);
    try {
      const data = await searchBusinesses(debouncedSearch, selectedCategory === 'all' ? '' : selectedCategory);
      setBusinesses(data);
    } catch (error) {
      console.error('Failed to load businesses:', error);
    } finally {
      setSearching(false);
      setLoading(false);
    }
  }, [debouncedSearch, selectedCategory]);

  useEffect(() => {
    loadBusinesses();
  }, [loadBusinesses]);

  const loadUpcomingAppointments = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const data = await getUserAppointments();
      const now = new Date();
      const upcoming = data.filter((apt) => {
        if (!apt.start || !apt.status) return false;
        const startDate = new Date(apt.start);
        return startDate > now && apt.status !== 'cancelled';
      });
      setUpcomingAppointments(upcoming.length);
    } catch (error) {
      console.error('Failed to load upcoming appointments:', error);
    }
  }, [isLoggedIn]);

  useFocusEffect(
    useCallback(() => {
      loadUpcomingAppointments();
    }, [loadUpcomingAppointments])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBusinesses(), loadUpcomingAppointments()]);
    setRefreshing(false);
  };

  const handleFavoritePress = async (business: Business) => {
    if (!isLoggedIn) {
      Alert.alert('Wymagane logowanie', 'Zaloguj się, aby dodać do ulubionych.', [
        { text: 'Anuluj', style: 'cancel' },
        { text: 'Zaloguj się', onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }
    try {
      await toggleFavorite(business);
    } catch (error) {
      Alert.alert('Błąd', 'Nie udało się zmienić statusu ulubionej');
    }
  };

  const sortedBusinesses = useMemo(() => {
    if (!Array.isArray(businesses)) return [];
    const sorted = [...businesses];
    switch (sortBy) {
      case 'name-asc': sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': sorted.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'newest': sorted.sort((a, b) => String(b.id).localeCompare(String(a.id))); break;
    }
    return sorted;
  }, [businesses, sortBy]);

  const formatBusinessAddress = (business: Business): string => {
    if (business.address) return business.address;
    const parts = [business.address_line1, business.city].filter(Boolean);
    return parts.join(', ');
  };

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <LinearGradient 
        colors={['#8B5CF6', '#7C3AED']} 
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerCircle1} />
        <View style={styles.headerCircle2} />
        
        <View style={styles.headerTop}>
          <View style={styles.logoContainer}>
            <Ionicons name="sparkles" size={24} color="#fff" />
            <Text style={styles.appName}>Sessly</Text>
          </View>
          
          {isLoggedIn ? (
            <TouchableOpacity style={styles.userBadge} onPress={() => router.push('/(tabs)/account')}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.first_name || user?.username || 'Profil'}
              </Text>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.loginPill} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginPillText}>Zaloguj się</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.greeting}>Cześć{user?.first_name ? `, ${user.first_name}` : ''}!</Text>
        <Text style={styles.subtitle}>Zarezerwuj wizytę w okolicy</Text>

        <View style={styles.searchContainer}>
          <SearchBar 
            value={searchQuery} 
            onChangeText={setSearchQuery} 
            onClear={() => setSearchQuery('')} 
            placeholder="Szukaj salonu lub usługi..." 
          />
        </View>

        {isLoggedIn && upcomingAppointments > 0 && (
          <TouchableOpacity style={styles.upcomingPill} onPress={() => router.push('/(tabs)/appointments')}>
            <Ionicons name="calendar" size={18} color="#fff" />
            <Text style={styles.upcomingText}>Masz {upcomingAppointments} {getAppointmentsLabel(upcomingAppointments)}</Text>
            <Ionicons name="chevron-forward" size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </LinearGradient>

      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
          data={[{ value: 'all', label: 'Wszystkie', slug: 'all', name: 'Wszystkie' }, ...categories]}
          keyExtractor={(item, index) => item.value || item.slug || String(index)}
          renderItem={({ item }) => {
            const itemValue = item.value || item.slug;
            const itemLabel = item.label || item.name;
            const isActive = selectedCategory === itemValue;
            
            return (
              <TouchableOpacity 
                style={[styles.categoryChip, isActive && styles.categoryChipActive]} 
                onPress={() => setSelectedCategory(itemValue)}
              >
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{itemLabel}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {!loading && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>{sortedBusinesses.length} {sortedBusinesses.length === 1 ? 'firma' : 'firm'}</Text>
          <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
            <Ionicons name="swap-vertical" size={16} color={Colors.light.accent} />
            <Text style={styles.sortButtonText}>Sortuj</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderBusinessCard = ({ item }: { item: Business }) => {
    // ✅ POPRAWKA: Zawsze sprawdzamy tylko numeryczne ID (zgodnie z FavoritesContext)
    const favorite = isFavorite(String(item.id));
    
    const imageUrl = `https://picsum.photos/seed/${item.id}/600/400`;
    const address = formatBusinessAddress(item);

    const categoryMatch = categories.find(c => (c.value === item.category) || (c.slug === item.category));
    const categoryDisplay = categoryMatch ? (categoryMatch.label || categoryMatch.name) : item.category || 'Usługa';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => router.push({ pathname: '/business/[id]', params: { id: item.slug || String(item.id) } })}
        activeOpacity={0.9}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUrl }} style={styles.businessImage} contentFit="cover" transition={200} />
          <View style={styles.favoriteContainer}>
            <AnimatedHeart isFavorite={favorite} onPress={() => handleFavoritePress(item)} />
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.businessName} numberOfLines={1}>{item.name}</Text>
          </View>

          <Text style={styles.categoryLabel}>{categoryDisplay}</Text>

          {address ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={16} color={Colors.light.textSecondary} />
              <Text style={styles.addressText} numberOfLines={1}>{address}</Text>
            </View>
          ) : null}
          
          <View style={styles.cardFooter}>
            <View style={styles.servicesCountBadge}>
              <Text style={styles.servicesCountText}>
                {item.services_count || 0} {item.services_count === 1 ? 'usługa' : 'usług'}
              </Text>
            </View>
            <View style={styles.bookBtn}>
              <Text style={styles.bookBtnText}>Umów</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading && !refreshing ? (
        <View>
          {renderHeader()}
          <View style={styles.listContent}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      ) : (
        <FlatList
          data={sortedBusinesses}
          // ✅ POPRAWKA: Przekazujemy favoriteIds, by wymusić odświeżenie karty po kliknięciu!
          extraData={favoriteIds}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderBusinessCard}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.accent} />}
          ListEmptyComponent={
            !searching ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={80} color="#E2E8F0" />
                <Text style={styles.emptyTitle}>Brak wyników</Text>
                <Text style={styles.emptyText}>Nie znaleźliśmy salonów pasujących do Twoich kryteriów.</Text>
              </View>
            ) : (
              <ActivityIndicator size="large" color={Colors.light.accent} style={{ marginTop: 40 }} />
            )
          }
          showsVerticalScrollIndicator={false}
        />
      )}

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
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  
  headerWrapper: { backgroundColor: '#F8FAFC' },
  headerGradient: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 30, paddingHorizontal: 20, overflow: 'hidden' },
  headerCircle1: { position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.1)' },
  headerCircle2: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, zIndex: 10 },
  logoContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appName: { fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  
  userBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 6, paddingLeft: 14, paddingRight: 6, borderRadius: 24, gap: 8 },
  avatarPlaceholder: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#8B5CF6' },
  userName: { fontSize: 14, fontWeight: '700', color: '#fff', maxWidth: 100 },
  
  loginPill: { backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  loginPillText: { fontSize: 14, fontWeight: '800', color: '#8B5CF6' },
  
  greeting: { fontSize: 26, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 15, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 20 },
  
  searchContainer: { 
    zIndex: 10,
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden'
  },
  
  upcomingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, marginTop: 12, gap: 6 },
  upcomingText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  categoriesWrapper: { backgroundColor: '#F8FAFC', paddingVertical: 14 },
  categoriesScroll: { paddingHorizontal: 20, gap: 10 },
  categoryChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  categoryChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  categoryText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  categoryTextActive: { color: '#fff' },

  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  resultsCount: { fontSize: 15, fontWeight: '700', color: '#334155' },
  sortButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  sortButtonText: { fontSize: 14, color: '#8B5CF6', fontWeight: '700' },

  list: { paddingBottom: 100 },
  listContent: { padding: 20 },
  
  card: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: 'hidden', shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 4 },
  imageContainer: { width: '100%', height: 160, backgroundColor: '#F1F5F9', position: 'relative' },
  businessImage: { width: '100%', height: '100%' },
  
  favoriteButton: { padding: 6, backgroundColor: '#fff', borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  favoriteContainer: { position: 'absolute', top: 12, right: 12 },
  
  cardContent: { padding: 16 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  businessName: { fontSize: 18, fontWeight: '800', color: '#1E293B', flex: 1 },
  categoryLabel: { fontSize: 13, color: '#8B5CF6', fontWeight: '600', marginBottom: 8 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  addressText: { fontSize: 14, color: '#64748B', flex: 1 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 14 },
  servicesCountBadge: { backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  servicesCountText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  bookBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  bookBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#64748B', textAlign: 'center' },
  
  skeletonCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#F1F5F9' },
  skeletonImage: { width: '100%', height: 160, backgroundColor: '#E2E8F0' },
  skeletonContent: { padding: 16 },
  skeletonTitle: { width: '60%', height: 20, backgroundColor: '#E2E8F0', borderRadius: 6, marginBottom: 12 },
  skeletonSubtitle: { width: '40%', height: 14, backgroundColor: '#E2E8F0', borderRadius: 6, marginBottom: 16 },
  skeletonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  skeletonBadge: { width: 80, height: 30, backgroundColor: '#E2E8F0', borderRadius: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 5, backgroundColor: '#E2E8F0', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1E293B' },
  closeButton: { padding: 4 },
  sortOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#F8FAFC', marginBottom: 8, gap: 12 },
  sortOptionActive: { backgroundColor: '#F5F3FF', borderWidth: 2, borderColor: '#8B5CF6' },
  sortOptionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  sortOptionIconActive: { backgroundColor: '#8B5CF6' },
  sortOptionText: { fontSize: 16, flex: 1, color: '#334155', fontWeight: '600' },
  sortOptionTextActive: { color: '#8B5CF6', fontWeight: '800' }
});