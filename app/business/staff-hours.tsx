import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView,
  Switch, TextInput, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import apiClient from '../../api/client';
import Colors from '../../constants/Colors';
import { useLocation } from '../../contexts/LocationContext';
import { notify } from '../../utils/notify';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Poniedziałek' },
  { id: 1, label: 'Wtorek' },
  { id: 2, label: 'Środa' },
  { id: 3, label: 'Czwartek' },
  { id: 4, label: 'Piątek' },
  { id: 5, label: 'Sobota' },
  { id: 6, label: 'Niedziela' },
];

type DayHours = {
  day_of_week: number;
  is_day_off: boolean;
  start_time: string;
  end_time: string;
};

export default function StaffHoursScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { activeLocation } = useLocation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<DayHours[]>(
    DAYS_OF_WEEK.map((day) => ({
      day_of_week: day.id,
      is_day_off: day.id >= 5,
      start_time: '09:00',
      end_time: '17:00',
    }))
  );

  const load = useCallback(async () => {
    if (!activeLocation?.slug || !id) {
      setLoading(false);
      return;
    }
    try {
      const response = await apiClient.get(`/businesses/${activeLocation.slug}/staff/${id}/working-hours/`);
      const existing = Array.isArray(response.data) ? response.data : response.data?.data;
      if (Array.isArray(existing) && existing.length > 0) {
        setHours((current) => current.map((day) => {
          const found = existing.find((h: any) => h.day_of_week === day.day_of_week);
          if (!found) return day;
          return {
            day_of_week: found.day_of_week,
            is_day_off: Boolean(found.is_day_off),
            start_time: found.start_time ? String(found.start_time).slice(0, 5) : '09:00',
            end_time: found.end_time ? String(found.end_time).slice(0, 5) : '17:00',
          };
        }));
      }
    } catch {
      // first setup — keep defaults
    } finally {
      setLoading(false);
    }
  }, [activeLocation?.slug, id]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const updateDay = (dayId: number, field: keyof DayHours, value: string | boolean) => {
    setHours((prev) => prev.map((h) => (h.day_of_week === dayId ? { ...h, [field]: value } : h)));
  };

  const save = async () => {
    if (!activeLocation?.slug || !id) return;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const invalid = hours.some((h) => !h.is_day_off && (!timeRegex.test(h.start_time) || !timeRegex.test(h.end_time)));
    if (invalid) {
      Alert.alert('Błąd', 'Podaj poprawny format godzin (np. 09:00, 17:30).');
      return;
    }
    try {
      setSaving(true);
      const payload = hours.map((h) => ({
        day_of_week: h.day_of_week,
        is_day_off: h.is_day_off,
        start_time: h.is_day_off ? null : h.start_time,
        end_time: h.is_day_off ? null : h.end_time,
      }));
      await apiClient.post(`/businesses/${activeLocation.slug}/staff/${id}/working-hours/`, payload);
      notify('Zapisano', 'Godziny pracy pracownika zostały zaktualizowane.');
      router.back();
    } catch (error: any) {
      Alert.alert('Błąd', error?.response?.data ? JSON.stringify(error.response.data) : 'Nie udało się zapisać.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Godziny pracownika</Text>
          <Text style={styles.subtitle}>{name || 'Grafik indywidualny'}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>
          Ustaw, w jakich godzinach ta osoba przyjmuje. Poza tymi godzinami nie pojawi się w rezerwacjach.
          Jeśli dwóch pracowników pracuje równolegle, ta sama godzina może być wolna u drugiej osoby.
        </Text>

        <View style={styles.card}>
          {DAYS_OF_WEEK.map((day, index) => {
            const dayData = hours.find((h) => h.day_of_week === day.id)!;
            const off = dayData.is_day_off;
            return (
              <View key={day.id} style={[styles.dayRow, index === 6 && { borderBottomWidth: 0 }]}>
                <View style={styles.dayInfo}>
                  <Text style={[styles.dayLabel, off && styles.dayLabelOff]}>{day.label}</Text>
                  <Switch
                    value={!off}
                    onValueChange={(val) => updateDay(day.id, 'is_day_off', !val)}
                    trackColor={{ false: '#E2E8F0', true: Colors.light.accent }}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
                {off ? (
                  <View style={styles.offBadge}><Text style={styles.offBadgeText}>Wolne</Text></View>
                ) : (
                  <View style={styles.timeRow}>
                    <TextInput
                      style={styles.timeInput}
                      value={dayData.start_time}
                      onChangeText={(v) => updateDay(day.id, 'start_time', v)}
                      placeholder="09:00"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                    <Text style={styles.dash}>–</Text>
                    <TextInput
                      style={styles.timeInput}
                      value={dayData.end_time}
                      onChangeText={(v) => updateDay(day.id, 'end_time', v)}
                      placeholder="17:00"
                      placeholderTextColor="#94A3B8"
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.save} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Zapisz godziny</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  content: { padding: 20, paddingBottom: 40 },
  hint: { color: '#64748B', fontSize: 13, lineHeight: 20, marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  dayRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dayInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dayLabel: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  dayLabelOff: { color: '#94A3B8' },
  offBadge: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  offBadgeText: { color: '#64748B', fontWeight: '700', fontSize: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeInput: {
    flex: 1, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', borderWidth: 1,
    borderColor: '#E2E8F0', paddingHorizontal: 12, fontSize: 15, fontWeight: '700', color: '#0F172A', textAlign: 'center',
  },
  dash: { color: '#94A3B8', fontWeight: '800' },
  save: {
    marginTop: 18, height: 54, borderRadius: 16, backgroundColor: Colors.light.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
