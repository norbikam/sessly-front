import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { getFollowing, toggleFollowing } from '../../api/following';
import Colors from '../../constants/Colors';
import { Business } from '../../types/api';
import { notify } from '../../utils/notify';

export default function FollowingScreen() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setBusinesses(await getFollowing());
    } catch {
      notify('Błąd', 'Nie udało się pobrać obserwowanych lokali.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const unfollow = async (business: Business) => {
    await toggleFollowing(String(business.id));
    setBusinesses((current) => current.filter((item) => item.id !== business.id));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Obserwowane lokale</Text>
      </View>
      {loading ? <ActivityIndicator style={styles.loader} color={Colors.light.accent} /> : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Nie obserwujesz jeszcze żadnego lokalu.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: '/business/[id]', params: { id: item.slug } })}
            >
              {item.cover_image || item.logo_url ? (
                <Image source={{ uri: item.cover_image || item.logo_url }} style={styles.image} contentFit="cover" />
              ) : (
                <View style={[styles.image, styles.placeholder]}>
                  <Ionicons name="storefront-outline" size={26} color={Colors.light.accent} />
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.address}>{item.city || item.address_line1}</Text>
              </View>
              <TouchableOpacity style={styles.remove} onPress={() => unfollow(item)}>
                <Ionicons name="notifications-off-outline" size={20} color="#DC2626" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 18, backgroundColor: '#fff' },
  title: { color: Colors.light.text, fontSize: 21, fontWeight: '900' },
  loader: { marginTop: 40 },
  list: { padding: 20, flexGrow: 1 },
  empty: { marginTop: 50, color: Colors.light.textSecondary, textAlign: 'center' },
  card: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 12, marginBottom: 12, borderRadius: 18, backgroundColor: '#fff' },
  image: { width: 58, height: 58, borderRadius: 14 },
  placeholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF' },
  info: { flex: 1 },
  name: { color: Colors.light.text, fontSize: 16, fontWeight: '800' },
  address: { color: Colors.light.textSecondary, fontSize: 12, marginTop: 4 },
  remove: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#FEF2F2' },
});
