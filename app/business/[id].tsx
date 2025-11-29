import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Platform,
  SafeAreaView,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getBusinesses, getBusinessServices, getBusinessOpeningHours, getBusinessBySlug } from '../../api/business';
import type { Business, Service, OpeningHours } from '../../types/api';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');

export default function BusinessDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [business, setBusiness] = useState<Business | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [hours, setHours] = useState<OpeningHours | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const extractServices = (b: any): Service[] => {
    const candidates = [
      'services',
      'offerings',
      'catalog',
      'business_services',
      'business_offerings',
      'items',
    ];
    for (const key of candidates) {
      const val = b?.[key];
      if (Array.isArray(val)) return val;
      if (val?.results && Array.isArray(val.results)) return val.results;
    }
    // try nested data containers
    if (b?.data?.services && Array.isArray(b.data.services)) return b.data.services;
    return [];
  };

  const extractHours = (b: any): any => {
    const candidates = ['opening_hours', 'hours', 'work_schedule', 'schedules', 'timetable'];
    for (const key of candidates) {
      const val = b?.[key];
      if (val) return val;
    }
    if (b?.data?.opening_hours) return b.data.opening_hours;
    return null;
  };

  const fetchBusiness = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      if (!id) throw new Error('Missing business id');

      // fetch detail by slug/id directly (backend exposes detail by slug)
      const detail = await getBusinessBySlug(String(id));
      setBusiness(detail);

      // embedded fallbacks (list of possible shapes)
      const embeddedServices = extractServices(detail);
      const embeddedHours = extractHours(detail);

      // probe explicit endpoints as fallback (use id or slug)
      const probeKey = detail.id ?? detail.slug ?? id;
      const [svs, hrs] = await Promise.allSettled([
        getBusinessServices(probeKey),
        getBusinessOpeningHours(probeKey),
      ]);

      const svcResult = svs.status === 'fulfilled' ? svs.value ?? [] : [];
      const hrsResult = hrs.status === 'fulfilled' ? hrs.value ?? null : null;

      setServices(svcResult.length ? svcResult : embeddedServices);
      setHours(hrsResult ?? embeddedHours ?? null);

      console.debug('Business detail fetched', { id, embeddedServices, embeddedHours, svcResult, hrsResult, detail });
    } catch (e: any) {
      console.error('Fetch business error', e);
      setError(e?.message ?? 'Błąd pobierania danych');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBusiness();
    setRefreshing(false);
  };

  const handleBook = (service?: Service) => {
    if (!business) return;
    Alert.alert(
      'Rezerwacja',
      service ? `Rezerwacja: ${service.name}` : `Rezerwacja w ${business.name}`,
      [{ text: 'OK' }]
    );
  };

  const openPhone = (phone?: string) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };
  const openUrl = (url?: string) => {
    if (!url) return;
    Linking.openURL(String(url)).catch(() => {});
  };

  if (loading && !business) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error && !business) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={fetchBusiness} style={styles.retryBtn}>
          <Text style={styles.retryText}>Spróbuj ponownie</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!business) {
    return (
      <View style={styles.center}>
        <Text>Brak danych</Text>
      </View>
    );
  }

  const imageUrl = business.image ?? (business as any).photo ?? (business as any).logo;
  const phone = business.phone ?? (business as any).phone_number;
  const email = business.email ?? (business as any).email_address;
  const address = business.address ?? (business as any).location ?? (business as any).city;
  const desc = business.description ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={styles.avatarWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="business" size={32} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.headerText}>
            <Text numberOfLines={1} style={styles.name}>
              {business.name}
            </Text>
            <Text numberOfLines={1} style={styles.small}>
              {address ?? ''}
            </Text>
            <View style={styles.row}>
              {phone ? (
                <TouchableOpacity style={styles.chip} onPress={() => openPhone(phone)}>
                  <Ionicons name="call" size={14} color={Colors.primary} />
                  <Text style={styles.chipText}>{phone}</Text>
                </TouchableOpacity>
              ) : null}
              {business.website || (business as any).url ? (
                <TouchableOpacity style={[styles.chip, { marginLeft: 8 }]} onPress={() => openUrl(business.website ?? (business as any).url)}>
                  <MaterialIcons name="language" size={14} color={Colors.primary} />
                  <Text style={styles.chipText}>Strona</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.card}>
          {desc ? (
            <>
              <Text style={styles.sectionTitle}>O nas</Text>
              <Text style={styles.sectionText}>{desc}</Text>
            </>
          ) : null}

          <View style={styles.hr} />

          <Text style={styles.sectionTitle}>Godziny otwarcia</Text>
          {hours ? (
            Array.isArray(hours) ? (
              hours.map((h: any, i: number) => {
                const dayLabel =
                  h.day_name ??
                  (typeof h.day_of_week !== 'undefined' ? String(h.day_of_week) : h.day ?? h.weekday ?? `Day ${i + 1}`);

                let val = '';
                if (h.is_closed === true || h.closed === true) {
                  val = 'Zamknięte';
                } else if (h.open_time || h.close_time) {
                  val = `${h.open_time ?? h.open ?? h.from ?? ''} — ${h.close_time ?? h.close ?? h.to ?? ''}`;
                } else if (h.from || h.to) {
                  val = `${h.from ?? ''} — ${h.to ?? ''}`;
                } else {
                  val = String(h.value ?? h);
                }

                return (
                  <View key={i} style={styles.hoursRow}>
                    <Text style={styles.hoursDay}>{String(dayLabel)}</Text>
                    <Text style={styles.hoursVal}>{val}</Text>
                  </View>
                );
              })
            ) : typeof hours === 'object' ? (
              Object.entries(hours).map(([day, val]) => (
                <View key={day} style={styles.hoursRow}>
                  <Text style={styles.hoursDay}>{capitalize(day)}</Text>
                  <Text style={styles.hoursVal}>
                    {typeof val === 'object' ? `${val.open ?? val.from ?? ''} — ${val.close ?? val.to ?? ''}` : String(val)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.infoText}>{String(hours)}</Text>
            )
          ) : (
            <Text style={styles.infoText}>Godziny nie są dostępne</Text>
          )}

          <View style={styles.hr} />

          <Text style={styles.sectionTitle}>Usługi</Text>
          {services.length === 0 ? (
            <Text style={styles.empty}>Brak zdefiniowanych usług</Text>
          ) : (
            services.map((s: Service, idx: number) => {
              // backend fields: duration_minutes, price_amount
              const price = 
                // common shapes: price, price_amount, cost
                (s as any).price ??
                (s as any).price_amount ??
                (s as any).cost ??
                '—';

              const duration =
                (s as any).duration ??
                (s as any).duration_minutes ??
                (s as any).length ??
                (s as any).minutes ??
                null;

              return (
                <View key={s.id ?? idx} style={styles.serviceRow}>
                  <View style={styles.serviceMetaLeft}>
                    <Text style={styles.serviceName}>{s.name ?? s.title}</Text>
                    <Text style={styles.serviceDesc} numberOfLines={2}>
                      {s.description ?? (s as any).subtitle ?? ''}
                    </Text>
                    <View style={styles.metaRow}>
                      {duration ? <View style={styles.pill}><Text style={styles.pillText}>{duration} min</Text></View> : null}
                      <View style={[styles.pill, styles.pricePill]}><Text style={[styles.pillText, { color: '#fff' }]}>{typeof price === 'number' ? `${price} zł` : String(price)}</Text></View>
                    </View>
                  </View>

                  <View style={styles.serviceAction}>
                    <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(s)}>
                      <Text style={styles.bookBtnText}>Zarezerwuj</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => handleBook()}>
          <Text style={styles.primaryBtnText}>Zarezerwuj</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function capitalize(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.light.background },
  header: {
    height: 140,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  iconButton: { position: 'absolute', left: 12, top: Platform.OS === 'ios' ? 48 : 24, zIndex: 20, padding: 6 },
  headerContent: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  avatarWrap: {
    width: 84,
    height: 84,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  avatar: { width: '100%', height: '100%' },
  avatarPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gradientMid },
  headerText: { marginLeft: 12, flex: 1 },
  name: { color: '#fff', fontSize: 18, fontWeight: '800' },
  small: { color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    marginRight: 8,
    gap: 6,
  },
  chipText: { marginLeft: 6, color: Colors.primary, fontWeight: '600' },

  container: { flex: 1 },
  content: { paddingBottom: 24, paddingTop: 12, paddingHorizontal: 16 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8, color: Colors.light.text },
  sectionText: { color: Colors.light.text, lineHeight: 20 },
  hr: { height: 12 },
  empty: { color: Colors.light.muted },

  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  hoursDay: { color: Colors.light.text, fontWeight: '600' },
  hoursVal: { color: Colors.light.muted },

  serviceRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f3f3f3' },
  serviceMetaLeft: { flex: 1, paddingRight: 12 },
  serviceName: { fontSize: 15, fontWeight: '800', color: '#222' },
  serviceDesc: { color: Colors.light.muted, marginTop: 6 },
  metaRow: { flexDirection: 'row', marginTop: 8, alignItems: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: '#F3F3F3', marginRight: 8 },
  pricePill: { backgroundColor: Colors.accent },
  pillText: { color: '#333', fontWeight: '700' },

  serviceAction: { justifyContent: 'center' },
  bookBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  bookBtnText: { color: '#fff', fontWeight: '800' },

  footer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    alignItems: 'center',
  },
  primaryBtn: {
    width: width - 32,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#b00020' },
  retryBtn: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#eee', borderRadius: 8 },
  retryText: { color: '#333' },
  infoText: { color: Colors.light.muted, marginBottom: 6 },
});