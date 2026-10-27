import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

/** Owner tool routes under /business/* (not public /business/[slug]). */
const OWNER_SEGMENTS = new Set([
  'edit-profile',
  'manage-services',
  'service-form',
  'categories',
  'opening-hours',
  'gallery',
  'schedule',
  'staff',
  'staff-hours',
  'staff-stats',
  'staff-home',
  'locations',
  'add-location',
  'subscription',
  'onboarding',
]);

export default function BusinessLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const showEscape = useMemo(() => {
    if (Platform.OS !== 'web') return false;
    const parts = pathname.split('/').filter(Boolean);
    if (parts[0] !== 'business') return false;
    if (parts.length === 1) return true;
    return OWNER_SEGMENTS.has(parts[1]);
  }, [pathname]);

  return (
    <View style={styles.root}>
      <Stack screenOptions={{ headerShown: false }} />
      {showEscape ? (
        <View style={styles.escapeBar}>
          <TouchableOpacity
            style={styles.escapeBtn}
            onPress={() => router.replace('/(tabs)' as any)}
            accessibilityLabel="Wróć do panelu"
          >
            <Ionicons name="grid-outline" size={18} color={Colors.light.accent} />
            <Text style={styles.escapeText}>Panel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.escapeBtn}
            onPress={() => router.replace('/(tabs)/account' as any)}
            accessibilityLabel="Konto"
          >
            <Ionicons name="person-outline" size={18} color={Colors.light.accent} />
            <Text style={styles.escapeText}>Konto</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  escapeBar: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  escapeBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  escapeText: { color: Colors.light.accent, fontWeight: '800', fontSize: 14 },
});
