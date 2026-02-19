import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getMyBusiness, updateBusinessProfile } from '@/api/business';
import { BusinessOpeningHour } from '@/types/api';

const DAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

export default function OpeningHoursScreen() {
  const router = useRouter();
  const [hours, setHours] = useState<BusinessOpeningHour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHours();
  }, []);

  const loadHours = async () => {
    try {
      const business = await getMyBusiness();
      // Jeśli backend zwraca puste godziny, zainicjuj domyślnie
      let initialHours = business.opening_hours || [];
      if (initialHours.length === 0) {
        initialHours = DAYS.map((day, index) => ({
          day_of_week: index, // 0-6
          day_name: day,
          is_closed: index > 4, // Sobota/Niedziela zamknięte domyślnie
          open_time: '09:00',
          close_time: '17:00'
        }));
      }
      setHours(initialHours);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (index: number, field: keyof BusinessOpeningHour, value: any) => {
    const newHours = [...hours];
    newHours[index] = { ...newHours[index], [field]: value };
    setHours(newHours);
  };

  const handleSave = async () => {
    try {
      // Zakładamy, że backend przyjmuje pole 'opening_hours' w updateBusinessProfile
      // Jeśli backend wymaga osobnego endpointu, trzeba go dodać w api/business.ts
      await updateBusinessProfile({ opening_hours: hours } as any);
      Alert.alert("Sukces", "Godziny otwarcia zapisane");
      router.back();
    } catch (e) {
      Alert.alert("Błąd", "Nie udało się zapisać godzin");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Godziny Otwarcia</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {hours.map((item, index) => (
          <View key={index} style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.dayName}>{DAYS[item.day_of_week] || item.day_name}</Text>
              <View style={styles.switchContainer}>
                <Text style={styles.switchLabel}>{item.is_closed ? "Zamknięte" : "Otwarte"}</Text>
                <Switch 
                  value={!item.is_closed} 
                  onValueChange={(v) => updateDay(index, 'is_closed', !v)}
                  trackColor={{ false: "#ddd", true: "#319795" }}
                />
              </View>
            </View>

            {!item.is_closed && (
              <View style={styles.timeRow}>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>Od:</Text>
                  <TextInput 
                    style={styles.timeInput} 
                    value={item.open_time} 
                    placeholder="HH:MM"
                    maxLength={5}
                    onChangeText={(v) => updateDay(index, 'open_time', v)}
                  />
                </View>
                <View style={styles.timeInputContainer}>
                  <Text style={styles.timeLabel}>Do:</Text>
                  <TextInput 
                    style={styles.timeInput} 
                    value={item.close_time} 
                    placeholder="HH:MM"
                    maxLength={5}
                    onChangeText={(v) => updateDay(index, 'close_time', v)}
                  />
                </View>
              </View>
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveText}>Zapisz Godziny</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, 
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' 
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold' },
  list: { padding: 20, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayName: { fontSize: 16, fontWeight: 'bold' },
  switchContainer: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { marginRight: 10, color: '#666', fontSize: 12 },
  timeRow: { flexDirection: 'row', marginTop: 15, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 15 },
  timeInputContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  timeLabel: { marginRight: 8, color: '#666' },
  timeInput: { backgroundColor: '#f5f5f5', padding: 8, borderRadius: 6, width: 80, textAlign: 'center', fontSize: 16 },
  saveBtn: { backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});