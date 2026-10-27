import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  RenderItemParams,
  ScaleDecorator,
} from 'react-native-draggable-flatlist';
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
import { formatServicePrice, type AppCurrency } from '../../utils/currency';
import { goBackToApp } from '../../utils/navigation';
import { formatApiError, notify } from '../../utils/notify';
import { localizedName } from '../../utils/localized';
import { buildServiceGroups } from '../../utils/serviceGroups';

type ServiceRowProps = {
  item: Service;
  drag: () => void;
  isActive: boolean;
  inactive: boolean;
  toggling: boolean;
  currency: AppCurrency;
  language: string;
  individuallyPricedLabel: string;
  activeLabel: string;
  inactiveLabel: string;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggle: (value: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
};

function ServiceRow({
  item,
  drag,
  isActive,
  inactive,
  toggling,
  currency,
  language,
  individuallyPricedLabel,
  activeLabel,
  inactiveLabel,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onToggle,
  onEdit,
  onDelete,
}: ServiceRowProps) {
  const [imageBroken, setImageBroken] = useState(false);
  const showImage = Boolean(item.image_url) && !imageBroken;

  return (
    <ScaleDecorator>
      <View style={[styles.serviceItem, inactive && styles.serviceItemInactive, isActive && styles.serviceItemDragging]}>
        <View style={styles.orderControls}>
          <TouchableOpacity
            onLongPress={drag}
            delayLongPress={120}
            style={styles.dragHandle}
            hitSlop={8}
            accessibilityLabel="Przeciągnij, żeby zmienić kolejność"
          >
            <Ionicons name="menu" size={20} color={isActive ? Colors.light.accent : '#64748B'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orderBtn, !canMoveUp && styles.orderBtnDisabled]}
            disabled={!canMoveUp}
            onPress={onMoveUp}
            accessibilityLabel="Wyżej"
          >
            <Ionicons name="chevron-up" size={16} color={canMoveUp ? '#475569' : '#CBD5E1'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.orderBtn, !canMoveDown && styles.orderBtnDisabled]}
            disabled={!canMoveDown}
            onPress={onMoveDown}
            accessibilityLabel="Niżej"
          >
            <Ionicons name="chevron-down" size={16} color={canMoveDown ? '#475569' : '#CBD5E1'} />
          </TouchableOpacity>
        </View>
        <View style={styles.serviceIconContainer}>
          {showImage ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.serviceImage}
              contentFit="cover"
              onError={() => setImageBroken(true)}
            />
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
              {formatServicePrice(item, currency, { individuallyPricedLabel })}
            </Text>
          </View>
          <View style={styles.activeRow}>
            <Text style={styles.activeLabel}>{inactive ? inactiveLabel : activeLabel}</Text>
            <AppSwitch
              value={!inactive}
              disabled={toggling}
              onValueChange={onToggle}
              trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
              thumbColor={!inactive ? Colors.light.accent : '#f4f3f4'}
            />
          </View>
        </View>
        <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
          <Ionicons name="create-outline" size={20} color={Colors.light.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </ScaleDecorator>
  );
}

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

  const moveWithinGroup = (groupId: string, serviceId: string, direction: -1 | 1) => {
    const group = serviceGroups.find((item) => item.id === groupId);
    if (!group) return;
    const index = group.services.findIndex((item) => String(item.id) === String(serviceId));
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= group.services.length) return;
    const next = [...group.services];
    const [row] = next.splice(index, 1);
    next.splice(nextIndex, 0, row);
    reorderGroup(groupId, next);
  };

  const renderService = (groupId: string, groupServices: Service[]) =>
    ({ item, drag, isActive }: RenderItemParams<Service>) => {
      const index = groupServices.findIndex((row) => String(row.id) === String(item.id));
      return (
        <ServiceRow
          item={item}
          drag={drag}
          isActive={isActive}
          inactive={item.is_active === false}
          toggling={togglingId === String(item.id)}
          currency={currency}
          language={language}
          individuallyPricedLabel={t('booking.individuallyPriced')}
          activeLabel={t('services.active')}
          inactiveLabel={t('services.inactive')}
          canMoveUp={index > 0}
          canMoveDown={index >= 0 && index < groupServices.length - 1}
          onMoveUp={() => moveWithinGroup(groupId, String(item.id), -1)}
          onMoveDown={() => moveWithinGroup(groupId, String(item.id), 1)}
          onToggle={(value) => void toggleActive(item, value)}
          onEdit={() =>
            router.push({ pathname: '/business/service-form', params: { id: String(item.id) } } as any)
          }
          onDelete={() => confirmDelete(item.id)}
        />
      );
    };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackToApp(router)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Cennik i usługi</Text>
          {!loading && services.length > 0 ? (
            <Text style={styles.titleCount}>{services.length}</Text>
          ) : null}
        </View>
      </View>

      <NestableScrollContainer contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              {savingOrder
                ? 'Zapisywanie kolejności…'
                : Platform.OS === 'web'
                  ? 'Chwyć ≡ i przeciągnij w górę/dół (w obrębie kategorii).'
                  : t('services.dragHint')}
            </Text>
            {serviceGroups.map((group) => {
              const collapsed = Boolean(collapsedCategories[group.id]);
              return (
                <View key={group.id} style={styles.serviceGroup}>
                  <View style={[styles.groupAccent, { backgroundColor: group.color }]} />
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
                    <View style={styles.groupCountPill}>
                      <Text style={styles.groupCount}>{group.services.length}</Text>
                    </View>
                    <Ionicons
                      name={collapsed ? 'chevron-down' : 'chevron-up'}
                      size={18}
                      color="#64748B"
                    />
                  </TouchableOpacity>
                  {!collapsed ? (
                    <View style={styles.groupBody}>
                      <NestableDraggableFlatList
                        data={group.services}
                        keyExtractor={(item) => String(item.id)}
                        onDragEnd={({ data }) => reorderGroup(group.id, data)}
                        activationDistance={Platform.OS === 'web' ? 4 : 10}
                        renderItem={renderService(group.id, group.services)}
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </>
        )}
      </NestableScrollContainer>
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
  titleBlock: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  titleCount: {
    minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 999,
    backgroundColor: '#EDE9FE', color: Colors.light.accent, overflow: 'hidden',
    fontSize: 13, fontWeight: '800', textAlign: 'center', lineHeight: 28,
  },
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
  dragHint: { color: '#64748B', fontSize: 12, fontWeight: '600', marginBottom: 16 },
  loadingContainer: { alignItems: 'center', marginTop: 40 },
  loadingText: { marginTop: 12, color: Colors.light.textSecondary, fontWeight: '500' },
  serviceGroup: {
    marginBottom: 18, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E2E8F0', position: 'relative',
  },
  groupAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  groupBody: { paddingHorizontal: 10, paddingBottom: 8 },
  serviceItem: {
    backgroundColor: '#F8FAFC', padding: 14, borderRadius: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#EEF2F7',
  },
  serviceItemInactive: { opacity: 0.72, backgroundColor: '#F1F5F9' },
  serviceItemDragging: { borderColor: Colors.light.accent, backgroundColor: '#FAF8FF' },
  orderControls: { alignItems: 'center', marginRight: 6, gap: 2 },
  dragHandle: {
    width: 34, height: 28, alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, backgroundColor: '#EEF2FF',
  },
  orderBtn: {
    width: 34, height: 22, alignItems: 'center', justifyContent: 'center',
    borderRadius: 7, backgroundColor: '#F1F5F9',
  },
  orderBtnDisabled: { opacity: 0.45 },
  serviceIconContainer: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: '#F5F3FF',
    justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden',
  },
  serviceImage: { width: '100%', height: '100%' },
  groupHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingLeft: 16, paddingRight: 14, paddingVertical: 14,
    backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0',
  },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupTitle: {
    flex: 1, color: '#0F172A', fontSize: 13, fontWeight: '800',
    letterSpacing: 0.5, textTransform: 'uppercase',
  },
  groupCountPill: {
    minWidth: 26, height: 26, paddingHorizontal: 8, borderRadius: 999,
    backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center',
  },
  groupCount: { color: '#475569', fontSize: 12, fontWeight: '800' },
  serviceInfo: { flex: 1, paddingRight: 10 },
  serviceName: { fontSize: 16, fontWeight: '700', color: Colors.light.text, marginBottom: 4 },
  inactiveText: { color: '#64748B' },
  serviceMeta: { flexDirection: 'row', alignItems: 'center' },
  serviceMetaText: { color: Colors.light.textSecondary, fontSize: 13, fontWeight: '500' },
  serviceMetaTextBold: { color: Colors.light.text, fontSize: 13, fontWeight: '700' },
  activeRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, minHeight: 28,
  },
  activeLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', textTransform: 'uppercase' },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 8 },
  deleteBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#FEF2F2', justifyContent: 'center', alignItems: 'center' },
  editBtn: { width: 40, height: 40, marginRight: 8, borderRadius: 12, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 20, padding: 20 },
  emptyText: { textAlign: 'center', marginTop: 16, fontSize: 16, fontWeight: '800', color: Colors.light.text },
  emptySubtext: { textAlign: 'center', marginTop: 8, color: Colors.light.textSecondary, lineHeight: 20 },
});
