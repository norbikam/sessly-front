import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { deleteService, getMyServices, getServiceCategories } from '../../api/business';
import { Service, ServiceCategory } from '../../types/api';
import Colors from '../../constants/Colors';
import { useLocale } from '../../contexts/LocaleContext';
import { useLocation } from '../../contexts/LocationContext';
import { formatServicePrice } from '../../utils/currency';
import { localizedName } from '../../utils/localized';

export default function ManageServicesScreen() {
  const { activeLocation } = useLocation();
  const { currency, language } = useLocale();
  const businessSlug = activeLocation?.slug;
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!businessSlug) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [data, categoryData] = await Promise.all([
        getMyServices(businessSlug),
        getServiceCategories(businessSlug),
      ]);
      setCategories(categoryData);
      setServices(Array.isArray(data) ? data : []);
    } catch (e: any) {
      console.error('Błąd ładowania usług:', e?.response?.data || e.message);
    } finally {
      setLoading(false);
    }
  }, [businessSlug]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const confirmDelete = (id: string | number) => {
    Alert.alert('Usuwanie', 'Czy na pewno chcesz usunąć tę usługę ze swojej oferty?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => handleRemove(id) },
    ]);
  };

  const handleRemove = async (id: string | number) => {
    if (!businessSlug) return;
    try {
      await deleteService(businessSlug, String(id));
      loadData();
    } catch {
      Alert.alert('Błąd', 'Nie udało się usunąć usługi.');
    }
  };

  const serviceGroups = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      services: services.filter((service) => service.category?.id === category.id),
    })),
    {
      id: 'uncategorized',
      name: 'Pozostałe',
      color: '#94A3B8',
      services: services.filter((service) => !service.category),
    },
  ].filter((group) => group.services.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Cennik i usługi</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/business/service-form' as any)}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.actionText}>Nowa usługa</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/business/categories' as any)}>
            <Ionicons name="pricetags-outline" size={18} color={Colors.light.accent} />
            <Text style={styles.secondaryText}>Kategorie</Text>
          </TouchableOpacity>
        </View>

        {loading && services.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.light.accent} />
            <Text style={styles.loadingText}>Ładowanie usług...</Text>
          </View>
        ) : services.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>Nie masz jeszcze żadnych usług.</Text>
            <Text style={styles.emptySubtext}>Dodaj pierwszą pozycję do cennika osobnym przyciskiem powyżej.</Text>
          </View>
        ) : (
          serviceGroups.map((group) => (
            <View key={group.id} style={styles.serviceGroup}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: group.color }]} />
                <Text style={styles.groupTitle}>{group.name}</Text>
                <Text style={styles.groupCount}>{group.services.length}</Text>
              </View>
              {group.services.map((item) => (
                <View key={String(item.id)} style={styles.serviceItem}>
                  <View style={styles.serviceIconContainer}>
                    {item.image_url ? (
                      <Image source={{ uri: item.image_url }} style={styles.serviceImage} contentFit="cover" />
                    ) : (
                      <Ionicons name="cut-outline" size={20} color={Colors.light.accent} />
                    )}
                  </View>
                  <View style={styles.serviceInfo}>
                    <Text style={styles.serviceName}>{localizedName(item, language)}</Text>
                    <View style={styles.serviceMeta}>
                      <Text style={styles.serviceMetaText}>{item.duration_minutes} min</Text>
                      <View style={styles.dot} />
                      <Text style={styles.serviceMetaTextBold}>
                        {formatServicePrice(item, currency)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push({ pathname: '/business/service-form', params: { id: String(item.id) } } as any)}
                  >
                    <Ionicons name="create-outline" size={20} color={Colors.light.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item.id)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  scrollContent: { padding: 20, paddingBottom: 100 },
  actions: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  actionBtn: {
    flexDirection: 'row', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: Colors.light.accent, alignItems: 'center',
  },
  actionText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: {
    flexDirection: 'row', gap: 6, height: 44, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: '#EDE9FE', alignItems: 'center',
  },
  secondaryText: { color: Colors.light.accent, fontWeight: '800' },
  loadingContainer: { alignItems: 'center', marginTop: 40 },
  loadingText: { marginTop: 12, color: Colors.light.textSecondary, fontWeight: '500' },
  serviceItem: {
    backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9',
  },
  serviceIconContainer: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5F3FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  serviceImage: { width: '100%', height: '100%', borderRadius: 12 },
  serviceGroup: { marginBottom: 18 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 9, paddingHorizontal: 4 },
  groupDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  groupTitle: { color: '#334155', fontSize: 15, fontWeight: '800' },
  groupCount: { color: '#94A3B8', fontSize: 12, marginLeft: 7 },
  serviceInfo: { flex: 1, paddingRight: 10 },
  serviceName: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center' },
  serviceMetaText: { color: Colors.light.textSecondary, fontSize: 13, fontWeight: '500' },
  serviceMetaTextBold: { color: Colors.light.text, fontSize: 13, fontWeight: '700' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 8 },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  editBtn: { width: 40, height: 40, marginRight: 8, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 20, padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 16, fontSize: 16, fontWeight: '800', color: Colors.light.text },
  emptySubtext: { textAlign: 'center', marginTop: 8, color: Colors.light.textSecondary, lineHeight: 20 },
});
