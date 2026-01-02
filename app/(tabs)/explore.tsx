import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getBusinesses } from '../../api/business';
import { Input } from '../../components/ui/Input';
import { Business } from '../../types/api';

export default function ExploreScreen() {
  const router = useRouter();
  
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [filtered, setFiltered] = useState<Business[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const loadData = async () => {
    try {
      const data = await getBusinesses();
      // Upewnij się, że data jest tablicą
      const businessArray = Array.isArray(data) ? data : [];
      setBusinesses(businessArray);
      setFiltered(businessArray);
    } catch (e) {
      console.error("Błąd podczas ładowania biznesów:", e);
      setBusinesses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  useEffect(() => {
    const searchLower = search.toLowerCase();
    const res = businesses.filter((b: Business) => {
      const nameMatch = b.name?.toLowerCase().includes(searchLower) ?? false;
      const cityMatch = b.city?.toLowerCase().includes(searchLower) ?? false;
      const categoryMatch = b.category_name?.toLowerCase().includes(searchLower) ?? false;
      return nameMatch || cityMatch || categoryMatch;
    });
    setFiltered(res);
  }, [search, businesses]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Odkrywaj</Text>
      
      <View style={styles.searchBox}>
        <Input
          placeholder="Szukaj specjalisty, miasta lub usługi..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.card}
            onPress={() => router.push(`/business/${item.id}`)}
          >
            <View style={styles.avatar}>
              <Ionicons name="business" size={24} color="#3b82f6" />
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <View style={styles.row}>
                <Ionicons name="location-outline" size={14} color="#6b7280" />
                <Text style={styles.cityText}>
                  {item.city || 'Lokalizacja niepodana'}
                </Text>
              </View>
              {item.category_name && (
                <Text style={styles.categoryText}>{item.category_name}</Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nie znaleziono żadnych specjalistów.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f9fafb', 
    paddingHorizontal: 20, 
    paddingTop: 60 
  },
  center: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  header: { 
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 15 
  },
  searchBox: { 
    marginBottom: 20 
  },
  card: { 
    backgroundColor: '#fff', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: '#000', 
    shadowOpacity: 0.05, 
    shadowRadius: 8, 
    elevation: 2
  },
  avatar: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    backgroundColor: '#eff6ff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
  },
  info: { 
    flex: 1 
  },
  name: { 
    fontSize: 17, 
    fontWeight: '600',
    color: '#1f2937' 
  },
  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 4 
  },
  cityText: { 
    fontSize: 13, 
    color: '#6b7280', 
    marginLeft: 4 
  },
  categoryText: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 2,
    fontWeight: '500'
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 40, 
    color: '#9ca3af' 
  }
});