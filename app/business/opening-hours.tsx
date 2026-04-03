import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, 
  ActivityIndicator, ScrollView, Switch, TextInput, Alert, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import apiClient from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import Colors from '../../constants/Colors';

const DAYS_OF_WEEK = [
  { id: 0, label: 'Poniedziałek' },
  { id: 1, label: 'Wtorek' },
  { id: 2, label: 'Środa' },
  { id: 3, label: 'Czwartek' },
  { id: 4, label: 'Piątek' },
  { id: 5, label: 'Sobota' },
  { id: 6, label: 'Niedziela' },
];

export default function OpeningHoursScreen() {
  const { user } = useAuth();
  const businessSlug = (user as any)?.business?.slug;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [hours, setHours] = useState(
    DAYS_OF_WEEK.map(day => ({
      day_of_week: day.id,
      is_closed: day.id === 6, // Domyślnie niedziela zamknięta
      open_time: '09:00',
      close_time: '17:00'
    }))
  );

  useEffect(() => {
    if (businessSlug) {
      fetchHours();
    } else {
      setLoading(false);
    }
  }, [businessSlug]);

  const fetchHours = async () => {
    try {
      const response = await apiClient.get(`/businesses/${businessSlug}/opening-hours/`);
      const existingHours = response.data;
      
      // Jeśli backend ma już zapisane godziny, nakładamy je na nasz domyślny stan
      if (Array.isArray(existingHours) && existingHours.length > 0) {
        const mergedHours = hours.map(defaultDay => {
          const found = existingHours.find(h => h.day_of_week === defaultDay.day_of_week);
          if (found) {
            return {
              day_of_week: found.day_of_week,
              is_closed: found.is_closed,
              open_time: found.open_time ? found.open_time.substring(0, 5) : '09:00',
              close_time: found.close_time ? found.close_time.substring(0, 5) : '17:00'
            };
          }
          return defaultDay;
        });
        setHours(mergedHours);
      }
    } catch (e) {
      console.log('Nie udało się pobrać godzin (może to pierwszy raz)', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateDay = (dayId: number, field: string, value: any) => {
    setHours(prev => prev.map(h => h.day_of_week === dayId ? { ...h, [field]: value } : h));
  };

  const handleSave = async () => {
    if (!businessSlug) return;
    
    // Walidacja formatu godzin
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    const hasError = hours.some(h => !h.is_closed && (!timeRegex.test(h.open_time) || !timeRegex.test(h.close_time)));
    
    if (hasError) {
      Alert.alert('Błąd', 'Podaj poprawny format godzin (np. 09:00, 17:30).');
      return;
    }

    try {
      setSaving(true);
      await apiClient.post(`/businesses/${businessSlug}/opening-hours/bulk_update/`, hours);
      Alert.alert('Sukces', 'Twój harmonogram pracy został zaktualizowany!');
      router.back();
    } catch (e: any) {
      Alert.alert('Błąd', e?.response?.data ? JSON.stringify(e.response.data) : 'Nie udało się zapisać.');
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
        <Text style={styles.title}>Godziny Pracy</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text style={styles.infoText}>
          Ustaw w jakich godzinach Twój salon jest czynny. Klienci będą mogli rezerwować wizyty tylko w podanych przez Ciebie przedziałach czasowych.
        </Text>

        <View style={styles.card}>
          {DAYS_OF_WEEK.map((day, index) => {
            const dayData = hours.find(h => h.day_of_week === day.id)!;
            const isClosed = dayData.is_closed;

            return (
              <View key={day.id} style={[styles.dayRow, index === 6 && { borderBottomWidth: 0 }]}>
                <View style={styles.dayInfo}>
                  <Text style={[styles.dayLabel, isClosed && styles.dayLabelClosed]}>{day.label}</Text>
                  <Switch 
                    value={!isClosed} 
                    onValueChange={(val) => handleUpdateDay(day.id, 'is_closed', !val)}
                    trackColor={{ false: '#E2E8F0', true: Colors.light.accent }}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>

                {isClosed ? (
                  <View style={styles.closedBadge}>
                    <Text style={styles.closedBadgeText}>Zamknięte</Text>
                  </View>
                ) : (
                  <View style={styles.timeInputsRow}>
                    <TextInput 
                      style={styles.timeInput} 
                      value={dayData.open_time}
                      onChangeText={(val) => handleUpdateDay(day.id, 'open_time', val)}
                      placeholder="09:00"
                      maxLength={5}
                    />
                    <Text style={styles.timeSeparator}>-</Text>
                    <TextInput 
                      style={styles.timeInput} 
                      value={dayData.close_time}
                      onChangeText={(val) => handleUpdateDay(day.id, 'close_time', val)}
                      placeholder="17:00"
                      maxLength={5}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Zapisz Harmonogram</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', zIndex: 10
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  
  scrollContent: { padding: 20, paddingBottom: 100 },
  infoText: { fontSize: 14, color: Colors.light.textSecondary, marginBottom: 20, lineHeight: 22 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 20,
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 24
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  dayInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text
  },
  dayLabelClosed: {
    color: '#94A3B8'
  },
  timeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 6
  },
  timeInput: {
    width: 60,
    height: 36,
    backgroundColor: '#fff',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: Colors.light.text,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  timeSeparator: {
    marginHorizontal: 8,
    color: Colors.light.textSecondary,
    fontWeight: '700'
  },
  closedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    width: 140,
    alignItems: 'center'
  },
  closedBadgeText: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 13
  },

  saveBtn: { 
    backgroundColor: Colors.light.accent, height: 54, borderRadius: 16, 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.light.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});