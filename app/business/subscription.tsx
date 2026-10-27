import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import {
  getMyLocationSubscriptions,
  getSubscriptionCatalog,
  LocationSubscription,
  SubscriptionCatalog,
} from '../../api/payments';
import apiClient from '../../api/client';
import {
  hasRevenueCatKey,
  isStoreBillingAvailable,
  purchaseLocationSubscription,
  restoreLocationPurchases,
} from '../../utils/purchases';

const STATUS_PL: Record<string, string> = {
  trialing: 'Okres próbny',
  active: 'Aktywna',
  past_due: 'Zaległość',
  cancelled: 'Anulowana',
  expired: 'Wygasła',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('pl-PL');
  } catch {
    return value;
  }
}

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function BusinessSubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [subs, setSubs] = useState<LocationSubscription[]>([]);
  const [catalog, setCatalog] = useState<SubscriptionCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<string | null>(null);
  const [requestingVerify, setRequestingVerify] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const storeReady = isStoreBillingAvailable() && hasRevenueCatKey();

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [locations, cat, verifyRes] = await Promise.all([
        getMyLocationSubscriptions(),
        getSubscriptionCatalog().catch(() => null),
        apiClient.get('/businesses/organization/verification/').catch(() => null),
      ]);
      setSubs(locations);
      setCatalog(cat);
      const status =
        verifyRes?.data?.data?.verification_status ||
        verifyRes?.data?.verification_status ||
        null;
      setVerification(status);
    } catch {
      setError('Nie udało się pobrać subskrypcji lokalizacji.');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestVerification = async () => {
    try {
      setRequestingVerify(true);
      setError(null);
      const res = await apiClient.post('/businesses/organization/verification/', {});
      const nextStatus =
        res.data?.data?.verification_status ||
        res.data?.verification_status ||
        'pending';
      setVerification(nextStatus);
      notify(
        'Wniosek wysłany',
        'Firma trafiła do kolejki weryfikacji Sessly. Status zobaczysz tutaj — po zatwierdzeniu zmieni się na „zatwierdzona”.',
      );
    } catch (e: any) {
      const message =
        e?.response?.data?.message ||
        e?.response?.data?.detail ||
        e?.response?.data?.error?.message ||
        'Nie udało się wysłać wniosku.';
      setError(message);
      notify('Weryfikacja', message);
    } finally {
      setRequestingVerify(false);
    }
  };

  const onPurchase = async (sub: LocationSubscription) => {
    try {
      setBusyId(sub.business_id);
      const result = await purchaseLocationSubscription(sub.business_id);
      notify(result.ok ? 'Gotowe' : 'Płatność', result.message);
      await load();
    } catch (e: any) {
      notify('Błąd', e?.message || 'Zakup nieudany');
    } finally {
      setBusyId(null);
    }
  };

  const onRestore = async (sub: LocationSubscription) => {
    try {
      setBusyId(sub.business_id);
      const result = await restoreLocationPurchases(sub.business_id);
      notify(result.ok ? 'Przywrócono' : 'Restore', result.message);
      await load();
    } catch (e: any) {
      notify('Błąd', e?.message || 'Restore nieudany');
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.light.accent} size="large" />
      </View>
    );
  }

  const price = catalog
    ? `${catalog.monthly_price_amount} ${catalog.currency} / mc`
    : '99 PLN / mc';
  const trialDays = catalog?.trial_days ?? 90;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Subskrypcja lokalizacji</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>Model rozliczeń</Text>
          <Text style={styles.currentPlan}>{price}</Text>
          <Text style={styles.currentStatus}>za każde miejsce (lokalizację)</Text>
          <Text style={styles.note}>
            Start: {trialDays} dni (3 miesiące) bez opłat. Potem płatność przez App
            Store / Google Play. Na webie status tylko podgląd — zakup w aplikacji
            mobilnej.
          </Text>
          {!storeReady && Platform.OS !== 'web' ? (
            <Text style={styles.warn}>
              Brak kluczy RevenueCat w tym buildzie — dodaj EXPO_PUBLIC_REVENUECAT_IOS_KEY /
              ANDROID_KEY w EAS.
            </Text>
          ) : null}
        </View>

        <View style={styles.verifyCard}>
          <Text style={styles.verifyTitle}>Weryfikacja firmy</Text>
          <Text style={styles.verifyStatus}>
            Status:{' '}
            {verification === 'approved'
              ? 'zatwierdzona'
              : verification === 'rejected'
                ? 'odrzucona'
                : verification === 'pending'
                  ? 'oczekuje na przegląd'
                  : 'brak danych'}
          </Text>
          <Text style={styles.note}>
            Po wysłaniu zespół Sessly sprawdza dane firmy (m.in. NIP) w panelu admina.
            Status zmienia się tutaj po decyzji — nic więcej nie musisz robić.
          </Text>
          {verification !== 'approved' ? (
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={requestVerification}
              disabled={requestingVerify}
            >
              <Text style={styles.verifyBtnText}>
                {requestingVerify
                  ? 'Wysyłanie…'
                  : verification === 'pending'
                    ? 'Wyślij ponownie do weryfikacji'
                    : 'Wyślij do weryfikacji'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <Text style={styles.section}>Twoje lokalizacje</Text>
        {subs.length === 0 ? (
          <Text style={styles.empty}>Brak lokalizacji — dodaj miejsce w panelu salonu.</Text>
        ) : (
          subs.map((sub) => {
            const needsPay =
              !sub.access_allowed ||
              sub.status === 'expired' ||
              sub.status === 'past_due' ||
              sub.status === 'cancelled';
            const busy = busyId === sub.business_id;
            return (
              <View
                key={sub.id}
                style={[
                  styles.planCard,
                  sub.access_allowed ? styles.planCardOk : styles.planCardWarn,
                ]}
              >
                <View style={styles.planHeader}>
                  <Text style={styles.planTitle}>{sub.business_name}</Text>
                  <View
                    style={[styles.badge, !sub.access_allowed && styles.badgeWarn]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        !sub.access_allowed && styles.badgeTextWarn,
                      ]}
                    >
                      {STATUS_PL[sub.status] || sub.status}
                    </Text>
                  </View>
                </View>
                {sub.business_city ? (
                  <Text style={styles.city}>{sub.business_city}</Text>
                ) : null}
                <Text style={styles.planPrice}>
                  {sub.plan === 'complimentary'
                    ? 'Complimentary (bez opłat)'
                    : `${sub.monthly_price_amount} ${sub.currency} / mc`}
                </Text>
                <Text style={styles.meta}>Trial do: {formatDate(sub.trial_ends_at)}</Text>
                <Text style={styles.meta}>
                  Okres do: {formatDate(sub.current_period_end)}
                </Text>

                {Platform.OS !== 'web' && sub.plan !== 'complimentary' ? (
                  <View style={styles.actions}>
                    {needsPay || sub.status === 'trialing' ? (
                      <TouchableOpacity
                        style={[styles.buyBtn, (!storeReady || busy) && styles.btnDisabled]}
                        disabled={!storeReady || busy}
                        onPress={() => void onPurchase(sub)}
                      >
                        {busy ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.buyBtnText}>
                            {sub.status === 'trialing'
                              ? 'Przedłuż / wykup w sklepie'
                              : 'Wykup subskrypcję'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity
                      style={[styles.restoreBtn, (!storeReady || busy) && styles.btnDisabled]}
                      disabled={!storeReady || busy}
                      onPress={() => void onRestore(sub)}
                    >
                      <Text style={styles.restoreBtnText}>Przywróć zakup</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            );
          })
        )}
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
  error: { color: '#b91c1c', marginBottom: 12 },
  currentCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  currentLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  currentPlan: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 6 },
  currentStatus: { color: '#D1D5DB', marginTop: 6 },
  note: { color: '#9CA3AF', fontSize: 12, marginTop: 12, lineHeight: 18 },
  warn: { color: '#FBBF24', fontSize: 12, marginTop: 10, lineHeight: 18 },
  verifyCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  verifyTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  verifyStatus: { marginTop: 6, color: '#4B5563', fontSize: 14 },
  verifyBtn: {
    marginTop: 12,
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  verifyBtnText: { color: '#fff', fontWeight: '800' },
  section: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  empty: { color: '#64748B', marginBottom: 12 },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planCardOk: { borderColor: '#A7F3D0' },
  planCardWarn: { borderColor: '#FECACA' },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  planTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: '#111' },
  city: { color: '#6B7280', marginTop: 4 },
  planPrice: { fontSize: 15, fontWeight: '600', color: '#4B5563', marginVertical: 8 },
  meta: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeWarn: { backgroundColor: '#FEE2E2' },
  badgeText: { color: Colors.light.accent, fontWeight: '700', fontSize: 12 },
  badgeTextWarn: { color: '#B91C1C' },
  actions: { marginTop: 14, gap: 8 },
  buyBtn: {
    backgroundColor: Colors.light.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyBtnText: { color: '#fff', fontWeight: '800' },
  restoreBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  restoreBtnText: { color: '#334155', fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
