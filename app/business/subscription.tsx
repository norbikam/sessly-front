import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import { getMySubscription, BusinessSubscription } from '../../api/payments';
import apiClient from '../../api/client';

const PLAN_COPY: Record<
  string,
  { title: string; price: string; features: string[] }
> = {
  free: {
    title: 'Free',
    price: '0 zł / mc',
    features: ['1 lokal', 'Podstawowy grafik', 'Powiadomienia e-mail'],
  },
  starter: {
    title: 'Starter',
    price: '79 zł / mc',
    features: ['Do 3 lokalizacji', 'Zaliczki Stripe', 'Przypomnienia push'],
  },
  pro: {
    title: 'Pro',
    price: '149 zł / mc',
    features: ['Bez limitu lokalizacji', 'Priorytetowe wsparcie', 'Google Calendar'],
  },
};

export default function BusinessSubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<BusinessSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<string | null>(null);
  const [requestingVerify, setRequestingVerify] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [subscription, verifyRes] = await Promise.all([
        getMySubscription(),
        apiClient.get('/businesses/organization/verification/').catch(() => null),
      ]);
      setSub(subscription);
      const status =
        verifyRes?.data?.data?.verification_status ||
        verifyRes?.data?.verification_status ||
        null;
      setVerification(status);
    } catch {
      setError('Nie udało się pobrać subskrypcji.');
    } finally {
      setLoading(false);
    }
  }, []);

  const requestVerification = async () => {
    try {
      setRequestingVerify(true);
      const res = await apiClient.post('/businesses/organization/verification/', {});
      setVerification(
        res.data?.data?.verification_status ||
          res.data?.verification_status ||
          'pending'
      );
    } catch (e: any) {
      setError(
        e?.response?.data?.message ||
          e?.response?.data?.detail ||
          'Nie udało się wysłać wniosku.'
      );
    } finally {
      setRequestingVerify(false);
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

  const current = sub?.plan || 'free';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Subskrypcja Sessly</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>Twój plan</Text>
          <Text style={styles.currentPlan}>
            {(PLAN_COPY[current] || PLAN_COPY.free).title}
          </Text>
          <Text style={styles.currentStatus}>
            Status: {sub?.status || 'trialing'}
          </Text>
          <Text style={styles.note}>
            Checkout Stripe Billing podłączymy przy wdrożeniu płatności produkcyjnych.
            Lokalnie startujesz na planie Free / trialing.
          </Text>
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
          {verification !== 'approved' ? (
            <TouchableOpacity
              style={styles.verifyBtn}
              onPress={requestVerification}
              disabled={requestingVerify}
            >
              <Text style={styles.verifyBtnText}>
                {requestingVerify ? 'Wysyłanie…' : 'Wyślij do weryfikacji'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {Object.entries(PLAN_COPY).map(([key, plan]) => {
          const active = key === current;
          return (
            <View
              key={key}
              style={[styles.planCard, active && styles.planCardActive]}
            >
              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                {active ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Aktualny</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.planPrice}>{plan.price}</Text>
              {plan.features.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          );
        })}
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
  currentLabel: { color: '#9CA3AF', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  currentPlan: { color: '#fff', fontSize: 28, fontWeight: '800', marginTop: 6 },
  currentStatus: { color: '#D1D5DB', marginTop: 6 },
  note: { color: '#9CA3AF', fontSize: 12, marginTop: 12, lineHeight: 18 },
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
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planCardActive: {
    borderColor: Colors.light.accent,
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  planPrice: { fontSize: 15, fontWeight: '600', color: '#4B5563', marginVertical: 8 },
  badge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { color: Colors.light.accent, fontWeight: '700', fontSize: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  featureText: { color: '#374151', fontSize: 14 },
});
