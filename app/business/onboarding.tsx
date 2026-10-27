import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import apiClient from '../../api/client';
import { useLocation } from '../../contexts/LocationContext';
import { notify } from '../../utils/notify';

type Step = {
  id: string;
  title: string;
  hint: string;
  route: string;
  done: boolean;
};

export default function BusinessOnboardingScreen() {
  const { activeLocation, refreshLocations } = useLocation();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [business, setBusiness] = useState<any>(null);
  const [hoursCount, setHoursCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);
  const [imagesCount, setImagesCount] = useState(0);

  const load = useCallback(async () => {
    if (!activeLocation?.id && !activeLocation?.slug) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const listRes = await apiClient.get('/businesses/my-business/');
      let list = listRes.data;
      if (list?.results) list = list.results;
      const biz =
        (Array.isArray(list) &&
          list.find(
            (item: any) =>
              String(item.id) === activeLocation.id || item.slug === activeLocation.slug
          )) ||
        (Array.isArray(list) ? list[0] : null);
      if (!biz) {
        setBusiness(null);
        return;
      }
      setBusiness(biz);
      const slug = biz.slug;
      const [hoursRes, servicesRes, galleryRes] = await Promise.all([
        apiClient.get(`/businesses/${slug}/opening-hours/`).catch(() => ({ data: [] })),
        apiClient.get(`/businesses/${slug}/services/`).catch(() => ({ data: [] })),
        apiClient.get(`/businesses/${slug}/gallery/`).catch(() => ({ data: [] })),
      ]);
      const hours = Array.isArray(hoursRes.data)
        ? hoursRes.data
        : hoursRes.data?.results || [];
      const services = Array.isArray(servicesRes.data)
        ? servicesRes.data
        : servicesRes.data?.results || [];
      const images = Array.isArray(galleryRes.data)
        ? galleryRes.data
        : galleryRes.data?.results || [];
      setHoursCount(hours.filter((h: any) => !h.is_closed).length);
      setServicesCount(services.filter((s: any) => s.is_active !== false).length);
      setImagesCount(images.length);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeLocation?.id, activeLocation?.slug]);

  useEffect(() => {
    void load();
  }, [load]);

  const steps: Step[] = useMemo(() => {
    const hasProfile = Boolean(
      business?.name && business?.phone_number && business?.address_line1 && business?.city
    );
    return [
      {
        id: 'profile',
        title: 'Wizytówka i adres',
        hint: 'Nazwa, telefon, adres lokalu',
        route: '/business/edit-profile',
        done: hasProfile,
      },
      {
        id: 'hours',
        title: 'Godziny otwarcia',
        hint: 'Ustaw przynajmniej jeden dzień otwarty',
        route: '/business/opening-hours',
        done: hoursCount > 0,
      },
      {
        id: 'services',
        title: 'Usługi / cennik',
        hint: 'Dodaj co najmniej jedną aktywną usługę',
        route: '/business/manage-services',
        done: servicesCount > 0,
      },
      {
        id: 'gallery',
        title: 'Galeria (opcjonalnie)',
        hint: 'Logo lub zdjęcia salonu',
        route: '/business/gallery',
        done: imagesCount > 0 || Boolean(business?.logo_url) || Boolean(business?.logo_image),
      },
    ];
  }, [business, hoursCount, servicesCount, imagesCount]);

  const requiredDone = steps.filter((s) => s.id !== 'gallery').every((s) => s.done);
  const isActive = Boolean(business?.is_active);

  const activate = async () => {
    if (!business?.id) return;
    if (!requiredDone) {
      notify('Jeszcze nie', 'Dokończ wymagane kroki przed włączeniem rezerwacji.');
      return;
    }
    try {
      setActivating(true);
      await apiClient.patch(`/businesses/my-business/${business.id}/`, { is_active: true });
      await refreshLocations();
      notify('Gotowe', 'Lokal jest widoczny dla klientów.');
      router.replace('/(tabs)' as any);
    } catch (e: any) {
      Alert.alert('Błąd', e?.response?.data?.detail || 'Nie udało się aktywować lokalu.');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.light.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Uruchom lokal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          {business?.name || 'Twój salon'} — dokończ checklistę, potem włącz rezerwacje online.
        </Text>

        {steps.map((step, index) => (
          <TouchableOpacity
            key={step.id}
            style={styles.step}
            onPress={() => router.push(step.route as any)}
          >
            <View
              style={[
                styles.stepBadge,
                step.done ? styles.stepBadgeDone : styles.stepBadgeTodo,
              ]}
            >
              {step.done ? (
                <Ionicons name="checkmark" size={18} color="#fff" />
              ) : (
                <Text style={styles.stepNum}>{index + 1}</Text>
              )}
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepHint}>{step.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[
            styles.activateBtn,
            (!requiredDone || isActive || activating) && styles.activateDisabled,
          ]}
          disabled={!requiredDone || isActive || activating}
          onPress={activate}
        >
          {activating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.activateText}>
              {isActive ? 'Lokal już aktywny' : 'Włącz rezerwacje'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  content: { padding: 20, paddingBottom: 40 },
  lead: { fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 16 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  stepBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeDone: { backgroundColor: '#059669' },
  stepBadgeTodo: { backgroundColor: Colors.light.accent },
  stepNum: { color: '#fff', fontWeight: '800' },
  stepBody: { flex: 1 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: '#111' },
  stepHint: { fontSize: 12, color: '#64748B', marginTop: 2 },
  activateBtn: {
    marginTop: 16,
    backgroundColor: '#059669',
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateDisabled: { opacity: 0.5 },
  activateText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
