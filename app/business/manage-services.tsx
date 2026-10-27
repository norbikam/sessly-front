import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import {
  deleteService,
  getMyServices,
  getServiceCategories,
  reorderServices,
  updateService,
} from '../../api/business';
import { Service, ServiceCategory } from '../../types/api';
import Colors from '../../constants/Colors';
import AppSwitch from '../../components/ui/AppSwitch';
import { useLocale } from '../../contexts/LocaleContext';
import { useLocation } from '../../contexts/LocationContext';
import { formatServicePrice } from '../../utils/currency';
import { goBackToApp } from '../../utils/navigation';
import { formatApiError, notify } from '../../utils/notify';
import { localizedName } from '../../utils/localized';
import { buildServiceGroups } from '../../utils/serviceGroups';

export default function ManageServicesScreen() {
  const { activeLocation } = useLocation();
  const { currency, language, t } = useLocale();
  const businessSlug = activeLocation?.slug;
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

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
      notify('Błąd', 'Nie udało się wczytać cennika.');
    } finally {
      setLoading(false);
    }
  }, [businessSlug]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const serviceGroups = useMemo(
    () => buildServiceGroups(services, categories, t('booking.uncategorized')),
    [services, categories, t],
  );

  const confirmDelete = (id: string | number) => {
    const run = async () => {
      if (!businessSlug) return;
      try {
        await deleteService(businessSlug, String(id));
        setServices((current) => current.filter((item) => String(item.id) !== String(id)));
        notify('Usunięto', 'Usługa została usunięta z oferty.');
      } catch (e: any) {
        notify('Błąd', formatApiError(e, 'Nie udało się usunąć usługi.'));
      }
    };

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Usunąć tę usługę z oferty?')) {
        void run();
      }
      return;
    }
    Alert.alert('Usuwanie', 'Czy na pewno chcesz usunąć tę usługę ze swojej oferty?', [
      { text: 'Anuluj', style: 'cancel' },
      { text: 'Usuń', style: 'destructive', onPress: () => void run() },
    ]);
  };

  const toggleActive = async (service: Service, nextActive: boolean) => {
    if (!businessSlug) return;
    const id = String(service.id);
    setTogglingId(id);
    setServices((current) =>
      current.map((item) =>
        String(item.id) === id ? { ...item, is_active: nextActive } : item,
      ),
    );
    try {
      await updateService(businessSlug, id, { is_active: nextActive });
    } catch (e: any) {
      setServices((current) =>
        current.map((item) =>
          String(item.id) === id ? { ...item, is_active: !nextActive } : item,
        ),
      );
      notify('Błąd', formatApiError(e, 'Nie udało się zmienić statusu usługi.'));
    } finally {
      setTogglingId(null);
    }
  };

  const persistOrder = async (nextServices: Service[]) => {
    if (!businessSlug) return;
    const previous = services;
    setServices(nextServices);
    setSavingOrder(true);
    try {
      await reorderServices(
        businessSlug,
        nextServices.map((item) => String(item.id)),
      );
    } catch (e: any) {
      setServices(previous);
      notify('Błąd', formatApiError(e, 'Nie udało się zapisać kolejności.'));
    } finally {
      setSavingOrder(false);
    }
  };

  const reorderGroup = (groupId: string, nextGroupServices: Service[]) => {
    const nextFlat: Service[] = [];
    for (const group of serviceGroups) {
      if (group.id === groupId) {
        nextFlat.push(...nextGroupServices);
      } else {
        nextFlat.push(...group.services);
      }
    }
    void persistOrder(nextFlat.map((item, index) => ({ ...item, sort_order: index })));
  };

  const renderService = ({ item, drag, isActive }: RenderItemParams<Service>) => {
    const inactive = item.is_active === false;
    return (
      <ScaleDecorator>
        <View style={[styles.serviceItem, inactive && styles.serviceItemInactive, isActive && styles.serviceItemDragging]}>
          <TouchableOpacity onLongPress={drag} delayLongPress={100} style={styles.dragHandle} hitSlop={8}>
            <Ionicons name="menu" size={20} color="#94A3B8" />
          </TouchableOpacity>
          <View style={styles.serviceIconContainer}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.serviceImage} contentFit="cover" />
            ) : (
              <Ionicons name="cut-outline" size={20} color={Colors.light.accent} />
            )}
          </View>
          <View style={styles.serviceInfo}>
            <Text style={[styles.serviceName, inactive && styles.inactiveText]}>
              {localizedName(item, language)}
            </Text>
            <View style={styles.serviceMeta}>
              <Text style={styles.serviceMetaText}>{item.duration_minutes} min</Text>
              <View style={styles.dot} />
              <Text style={styles.serviceMetaTextBold}>
                {formatServicePrice(item, currency, {
                  individuallyPricedLabel: t('booking.individuallyPriced'),
                })}
              </Text>
            </View>
            <View style={styles.activeRow}>
              <Text style={styles.activeLabel}>
                {inactive ? t('services.inactive') : t('services.active')}
              </Text>
              <AppSwitch
                value={!inactive}
                disabled={togglingId === String(item.id)}
                onValueChange={(value) => void toggleActive(item, value)}
                trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                thumbColor={!inactive ? Colors.light.accent : '#f4f3f4'}
              />
            </View>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              router.push({ pathname: '/business/service-form', params: { id: String(item.id) } } as any)
            }
          >
            <Ionicons name="create-outline" size={20} color={Colors.light.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackToApp(router)} style={styles.backBtn}>
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
          <>
            <Text style={styles.dragHint}>
              {savingOrder ? 'Zapisywanie kolejności…' : t('services.dragHint')}
            </Text>
            {serviceGroups.map((group) => {
              const collapsed = Boolean(collapsedCategories[group.id]);
              return (
                <View key={group.id} style={styles.serviceGroup}>
                  <TouchableOpacity
                    style={styles.groupHeader}
                    onPress={() =>
                      setCollapsedCategories((current) => ({
                        ...current,
                        [group.id]: !current[group.id],
                      }))
                    }
                    activeOpacity={0.75}
                  >
                    <View style={[styles.groupDot, { backgroundColor: group.color }]} />
                    <Text style={styles.groupTitle}>{group.name}</Text>
                    <Text style={styles.groupCount}>{group.services.length}</Text>
                    <Ionicons
                      name={collapsed ? 'chevron-down' : 'chevron-up'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                  {!collapsed ? (
                    <DraggableFlatList
                      data={group.services}
                      keyExtractor={(item) => String(item.id)}
                      onDragEnd={({ data }) => reorderGroup(group.id, data)}
                      activationDistance={6}
                      scrollEnabled={false}
                      renderItem={renderService}
                    />
                  ) : null}
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </GestureHandlerRootView>
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
  actions: { flexDirection: 'row', gap: 10, marginBottom: 12 },
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
  dragHint: { color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 14 },
  loadingContainer: { alignItems: 'center', marginTop: 40 },
  loadingText: { marginTop: 12, color: Colors.light.textSecondary, fontWeight: '500' },
  serviceGroup: { marginBottom: 12 },
  serviceItem: {
    backgroundColor: '#fff', padding: 14, borderRadius: 16, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#F1F5F9',
  },
  serviceItemInactive: { opacity: 0.72, backgroundColor: '#F8FAFC' },
  serviceItemDragging: { borderColor: Colors.light.accent, backgroundColor: '#FAF8FF' },
  dragHandle: {
    width: 32, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 4,
  },
  serviceIconContainer: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#F5F3FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  serviceImage: { width: '100%', height: '100%', borderRadius: 12 },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 9, paddingHorizontal: 4, paddingVertical: 4,
  },
  groupDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  groupTitle: { flex: 1, color: '#334155', fontSize: 15, fontWeight: '800' },
  groupCount: { color: '#94A3B8', fontSize: 12, marginLeft: 7, marginRight: 6 },
  serviceInfo: { flex: 1, paddingRight: 10 },
  serviceName: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  inactiveText: { color: '#64748B' },
  serviceMeta: { flexDirection: 'row', alignItems: 'center' },
  serviceMetaText: { color: Colors.light.textSecondary, fontSize: 13, fontWeight: '500' },
  serviceMetaTextBold: { color: Colors.light.text, fontSize: 13, fontWeight: '700' },
  activeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  activeLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 8 },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  editBtn: { width: 40, height: 40, marginRight: 8, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 20, padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 16, fontSize: 16, fontWeight: '800', color: Colors.light.text },
  emptySubtext: { textAlign: 'center', marginTop: 8, color: Colors.light.textSecondary, lineHeight: 20 },
});
