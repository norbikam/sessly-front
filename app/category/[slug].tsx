import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getBusinessCategories, searchBusinesses } from '../../api/business';
import Colors from '../../constants/Colors';
import { Business } from '../../types/api';

type SortMode = 'rating' | 'name';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [categoryName, setCategoryName] = useState('Firmy');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('rating');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [items, categories] = await Promise.all([
          searchBusinesses('', slug || ''),
          getBusinessCategories(),
        ]);
        setBusinesses(items);
        const category = categories.find((item) => item.value === slug || item.slug === slug);
        if (category) setCategoryName(category.label || category.name);
      } finally {
        setLoading(false);
      }
    };
    void Promise.resolve().then(load);
  }, [slug]);

  const visibleBusinesses = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pl');
    return businesses
      .filter((business) => !normalized || `${business.name} ${business.city}`.toLocaleLowerCase('pl').includes(normalized))
      .sort((left, right) => sort === 'name'
        ? left.name.localeCompare(right.name, 'pl')
        : Number(right.rating_avg || 0) - Number(left.rating_avg || 0));
  }, [businesses, query, sort]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => goBackToApp(router, '/(tabs)')}>
          <Ionicons name="arrow-back" size={23} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.title}>{categoryName}</Text>
          <Text style={styles.count}>{visibleBusinesses.length} {visibleBusinesses.length === 1 ? 'miejsce' : 'miejsca'}</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Szukaj nazwy lub miasta"
            placeholderTextColor="#64748B"
          />
        </View>
        <TouchableOpacity style={styles.sortButton} onPress={() => setSort((value) => value === 'rating' ? 'name' : 'rating')}>
          <Ionicons name={sort === 'rating' ? 'star' : 'text'} size={19} color={Colors.light.accent} />
          <Text style={styles.sortText}>{sort === 'rating' ? 'Ocena' : 'Nazwa'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
      ) : (
        <FlatList
          data={visibleBusinesses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={52} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Brak wyników</Text>
              <Text style={styles.emptyText}>Zmień wyszukiwaną frazę lub wybierz inną kategorię.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/business/${item.slug}`)}>
              <View style={[styles.imageWrap, { backgroundColor: item.brand_color || '#DDD6FE' }]}>
                {item.cover_image || item.logo_url ? (
                  <Image source={{ uri: item.cover_image || item.logo_url }} style={styles.image} contentFit="cover" />
                ) : (
                  <Ionicons name="storefront" size={34} color="rgba(255,255,255,0.8)" />
                )}
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.businessName} numberOfLines={1}>{item.name}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={15} color="#64748B" />
                  <Text style={styles.metaText} numberOfLines={1}>{item.city || item.address_line1}</Text>
                </View>
                <View style={styles.metaRow}>
                  <Ionicons name="star" size={15} color="#F59E0B" />
                  <Text style={styles.rating}>{Number(item.rating_avg || 0).toFixed(1)}</Text>
                  <Text style={styles.reviews}>({item.rating_count || 0})</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 18, backgroundColor: Colors.light.accent },
  backButton: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.16)' },
  headerText: { marginLeft: 14 },
  title: { color: '#fff', fontSize: 23, fontWeight: '900' },
  count: { color: 'rgba(255,255,255,0.8)', marginTop: 2, fontSize: 13 },
  controls: { flexDirection: 'row', gap: 10, padding: 16 },
  searchBox: { flex: 1, height: 50, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14, borderRadius: 15, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, color: '#0F172A', fontSize: 15, height: '100%' },
  sortButton: { minWidth: 92, height: 50, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: '#EDE9FE' },
  sortText: { color: Colors.light.accent, fontSize: 13, fontWeight: '800' },
  loader: { marginTop: 60 },
  list: { paddingHorizontal: 16 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 12, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F1F5F9' },
  imageWrap: { width: 76, height: 76, borderRadius: 15, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  cardContent: { flex: 1, marginHorizontal: 13 },
  businessName: { color: '#0F172A', fontSize: 17, fontWeight: '800', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { flex: 1, color: '#64748B', fontSize: 13 },
  rating: { color: '#334155', fontSize: 13, fontWeight: '800' },
  reviews: { color: '#94A3B8', fontSize: 12 },
  empty: { alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { color: '#1E293B', fontSize: 18, fontWeight: '800', marginTop: 14 },
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
