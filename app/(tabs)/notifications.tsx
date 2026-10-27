import React, { useCallback } from 'react';
import {
  ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { markAllNotificationsRead, markNotificationRead } from '../../api/notifications';
import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { Notification } from '../../types/api';

function iconForKind(kind: Notification['kind']): keyof typeof Ionicons.glyphMap {
  if (kind === 'promotion') return 'pricetag-outline';
  if (kind === 'appointment_new') return 'alert-circle-outline';
  if (kind === 'appointment_cancelled') return 'close-circle-outline';
  return 'calendar-outline';
}

function openNotification(item: Notification) {
  if (item.kind === 'appointment_new') {
    router.push({ pathname: '/business/schedule', params: { filter: 'pending' } } as any);
    return;
  }
  if (item.kind === 'appointment_cancelled') {
    router.push({ pathname: '/business/schedule', params: { filter: 'cancelled' } } as any);
    return;
  }
  if (item.kind === 'promotion' && (item.business_slug || item.business_id)) {
    router.push({
      pathname: '/business/[id]',
      params: { id: item.business_slug || String(item.business_id) },
    } as any);
    return;
  }
  if (item.kind.startsWith('appointment_')) {
    router.push('/(tabs)/appointments' as any);
  }
}

export default function NotificationsTabScreen() {
  const { t } = useLocale();
  const { isLoggedIn } = useAuth();
  const { items, loading, refresh, setItems } = useNotifications();
  const [refreshing, setRefreshing] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isLoggedIn) void refresh();
    }, [isLoggedIn, refresh])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const onPress = async (item: Notification) => {
    if (!item.read_at) {
      try {
        await markNotificationRead(item.id);
        setItems((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, read_at: new Date().toISOString() } : entry
          )
        );
      } catch {
        // still navigate
      }
    }
    openNotification(item);
  };

  const markAll = async () => {
    await markAllNotificationsRead();
    const now = new Date().toISOString();
    setItems((current) => current.map((entry) => ({ ...entry, read_at: entry.read_at || now })));
  };

  if (!isLoggedIn) {
    return (
      <View style={styles.center}>
        <Ionicons name="notifications-outline" size={56} color={Colors.light.accent} />
        <Text style={styles.emptyTitle}>{t('account.notifications')}</Text>
        <Text style={styles.emptySub}>Zaloguj się, aby zobaczyć powiadomienia.</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginText}>Zaloguj się</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('account.notifications')}</Text>
        {items.some((item) => !item.read_at) ? (
          <TouchableOpacity onPress={markAll}>
            <Text style={styles.markAll}>Przeczytaj wszystkie</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading && items.length === 0 ? (
        <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.light.accent} />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{t('notifications.empty')}</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read_at && styles.unread]}
              onPress={() => onPress(item)}
            >
              <View style={styles.iconBox}>
                <Ionicons name={iconForKind(item.kind)} size={22} color={Colors.light.accent} />
              </View>
              <View style={styles.content}>
                <Text style={styles.notificationTitle}>{item.title}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
              {!item.read_at ? <View style={styles.dot} /> : null}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F8FAFC', gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 18,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: { flex: 1, fontSize: 24, fontWeight: '900', color: Colors.light.text },
  markAll: { color: Colors.light.accent, fontSize: 12, fontWeight: '800' },
  loader: { marginTop: 40 },
  list: { padding: 20, flexGrow: 1 },
  empty: { textAlign: 'center', color: Colors.light.textSecondary, marginTop: 50 },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: Colors.light.text, marginTop: 8 },
  emptySub: { color: Colors.light.textSecondary, textAlign: 'center', marginBottom: 8 },
  loginBtn: {
    marginTop: 8, backgroundColor: Colors.light.accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14,
  },
  loginText: { color: '#fff', fontWeight: '800' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginBottom: 12,
    borderRadius: 18, backgroundColor: '#fff',
  },
  unread: { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE' },
  iconBox: {
    width: 42, height: 42, alignItems: 'center', justifyContent: 'center',
    borderRadius: 14, backgroundColor: '#EDE9FE',
  },
  content: { flex: 1 },
  notificationTitle: { color: Colors.light.text, fontWeight: '800', marginBottom: 4 },
  body: { color: Colors.light.textSecondary, lineHeight: 19 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.light.accent },
});
