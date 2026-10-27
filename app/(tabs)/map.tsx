import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

import { getBusinesses } from '../../api/business';
import { OsmMapView } from '../../components/OsmMapView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Business } from '../../types/api';
import { notify } from '../../utils/notify';
import Colors from '../../constants/Colors';

type Coordinates = { latitude: number; longitude: number };

function distanceKm(origin: Coordinates, business: Business): number | null {
  if (business.latitude == null || business.longitude == null) return null;
  const radians = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371;
  const latitudeDelta = radians(Number(business.latitude) - origin.latitude);
  const longitudeDelta = radians(Number(business.longitude) - origin.longitude);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(Number(business.latitude))) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function openFreeDirections(business: Business) {
  const hasCoords = business.latitude != null && business.longitude != null;
  const lat = hasCoords ? Number(business.latitude) : null;
  const lng = hasCoords ? Number(business.longitude) : null;
  const label = encodeURIComponent(
    `${business.name}, ${business.address_line1 || ''}, ${business.city || ''}`.trim()
  );

  if (Platform.OS === 'ios' && lat != null && lng != null) {
    void Linking.openURL(`http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`);
    return;
  }
  if (Platform.OS === 'android' && lat != null && lng != null) {
    void Linking.openURL(`geo:${lat},${lng}?q=${lat},${lng}(${label})`);
    return;
  }
  if (lat != null && lng != null) {
    void Linking.openURL(
      `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`
    );
    return;
  }
  void Linking.openURL(
    `https://www.openstreetmap.org/search?query=${encodeURIComponent(
      `${business.address_line1}, ${business.city}`
    )}`
  );
}

export default function MapScreen() {
  const router = useRouter();
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardColor = useThemeColor({}, 'card');
  const muted = useThemeColor({}, 'textSecondary');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);

  const loadBusinesses = useCallback(async (coords?: Coordinates | null, radius?: number) => {
    try {
      const params: Record<string, string | number> = {};
      if (coords) {
        params.lat = coords.latitude;
        params.lng = coords.longitude;
        params.radius_km = radius ?? 25;
      }
      setBusinesses(await getBusinesses(params as any));
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się pobrać firm.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => loadBusinesses());
  }, [loadBusinesses]);

  const locate = async () => {
    try {
      setLocating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        notify('Brak dostępu', 'Włącz lokalizację, aby zobaczyć firmy w okolicy.');
        return;
      }
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
      setPosition(coords);
      setLoading(true);
      await loadBusinesses(coords, radiusKm);
    } catch (error: any) {
      notify('Lokalizacja niedostępna', error?.message || 'Nie udało się ustalić pozycji.');
    } finally {
      setLocating(false);
    }
  };

  const nearby = useMemo(() => {
    const rows = businesses.map((business) => ({
      business,
      distance: position ? distanceKm(position, business) : null,
    }));
    return rows.sort(
      (left, right) =>
        (left.distance ?? Number.MAX_VALUE) - (right.distance ?? Number.MAX_VALUE)
    );
  }, [businesses, position]);

  const mappable = useMemo(
    () =>
      nearby.filter(
        ({ business }) => business.latitude != null && business.longitude != null
      ),
    [nearby]
  );

  const openBusiness = (business: Business) => {
    router.push({ pathname: '/business/[id]', params: { id: business.slug || business.id } });
  };

  const mapCenter = position
    ? position
    : mappable[0]
      ? {
          latitude: Number(mappable[0].business.latitude),
          longitude: Number(mappable[0].business.longitude),
        }
      : { latitude: 52.2297, longitude: 21.0122 };

  const markers = mappable.map(({ business }) => ({
    id: business.id,
    latitude: Number(business.latitude),
    longitude: Number(business.longitude),
    title: business.name,
    selected: selectedId === business.id,
  }));

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: textColor }]}>Mapa</Text>
          <Text style={[styles.subtitle, { color: muted }]}>
            {position
              ? `W okolicy do ${radiusKm} km · OpenStreetMap`
              : 'OpenStreetMap · włącz lokalizację lub przeglądaj listę'}
          </Text>
        </View>
        <TouchableOpacity style={styles.locationButton} onPress={locate} disabled={locating}>
          {locating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="locate" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {position ? (
        <View style={styles.radiusRow}>
          {[10, 25, 50].map((km) => (
            <TouchableOpacity
              key={km}
              style={[styles.radiusChip, radiusKm === km && styles.radiusChipActive]}
              onPress={() => {
                setRadiusKm(km);
                if (position) {
                  setLoading(true);
                  void loadBusinesses(position, km);
                }
              }}
            >
              <Text
                style={[
                  styles.radiusChipText,
                  radiusKm === km && styles.radiusChipTextActive,
                ]}
              >
                {km} km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.mapWrap}>
        {loading ? (
          <ActivityIndicator style={styles.mapLoader} color={Colors.accent} />
        ) : (
          <OsmMapView
            style={styles.map}
            center={mapCenter}
            zoom={position ? 12 : 11}
            markers={markers}
            userLocation={position}
            onMarkerPress={(id) => setSelectedId(id)}
          />
        )}
      </View>

      <FlatList
        data={nearby}
        keyExtractor={({ business }) => business.id}
        contentContainerStyle={styles.list}
        style={styles.listOverlay}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: muted }]}>
            Brak firm w tym obszarze.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.card,
              { backgroundColor: cardColor },
              selectedId === item.business.id && styles.cardSelected,
            ]}
            onPress={() => openBusiness(item.business)}
            onLongPress={() => openFreeDirections(item.business)}
          >
            <View style={styles.pin}>
              <Ionicons name="location" size={24} color={Colors.accent} />
            </View>
            <View style={styles.content}>
              <Text style={[styles.businessName, { color: textColor }]}>
                {item.business.name}
              </Text>
              <Text style={[styles.address, { color: muted }]}>
                {item.business.address_line1}, {item.business.city}
              </Text>
            </View>
            {item.distance != null ? (
              <Text style={styles.distance}>{item.distance.toFixed(1)} km</Text>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={Colors.accent} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 12,
  },
  title: { fontSize: 25, fontWeight: '900', marginBottom: 4 },
  subtitle: { fontSize: 13, lineHeight: 18, maxWidth: 280 },
  locationButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  radiusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  radiusChipActive: { backgroundColor: Colors.accent },
  radiusChipText: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  radiusChipTextActive: { color: '#fff' },
  mapWrap: { height: 280, marginHorizontal: 16, borderRadius: 18, overflow: 'hidden' },
  map: { flex: 1 },
  mapLoader: { marginTop: 100 },
  list: { padding: 20, paddingTop: 12, paddingBottom: 40 },
  listOverlay: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardSelected: { borderWidth: 1.5, borderColor: Colors.accent },
  pin: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EDE9FE',
  },
  content: { flex: 1 },
  businessName: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  address: { fontSize: 13 },
  distance: { color: Colors.accent, fontSize: 12, fontWeight: '800' },
});
