import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, RefreshControl, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getSpecialistSchedule } from '../../api/appointments';
import { Appointment } from '../../types/api';
import Colors from '../../constants/Colors';

export default function ScheduleScreen() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSchedule = async () => {
    try {
      const data = await getSpecialistSchedule();
      // Sortowanie: od najwcześniejszych wizyt
      const sorted = data.sort((a, b) => 
        new Date(a.start || 0).getTime() - new Date(b.start || 0).getTime()
      );
      setAppointments(sorted);
    } catch (e) {
      console.error("Błąd ładowania grafiku:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadSchedule(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchedule();
  };

  const renderStatusBadge = (status?: string) => {
    const isConfirmed = status === 'confirmed';
    return (
      <View style={[styles.badge, { backgroundColor: isConfirmed ? '#e6fffa' : '#fff5f5' }]}>
        <Text style={[styles.badgeText, { color: isConfirmed ? '#319795' : '#e53e3e' }]}>
          {status === 'confirmed' ? 'Potwierdzona' : 'Oczekująca'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Twój Grafik</Text>
      </View>

      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.appointmentCard}>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>
                {item.start ? new Date(item.start).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </Text>
              <Text style={styles.dateText}>
                {item.start ? new Date(item.start).toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' }) : ''}
              </Text>
            </View>

            <View style={styles.infoContainer}>
              <Text style={styles.clientName}>
                {/* Zakładamy, że backend przesyła dane klienta w polu 'client_name' lub 'user' */}
                {(item as any).client_name || "Klient Sessly"}
              </Text>
              <Text style={styles.serviceName}>{item.service?.name || "Usługa"}</Text>
              {renderStatusBadge(item.status)}
            </View>

            <TouchableOpacity style={styles.detailsBtn}>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={60} color="#ddd" />
              <Text style={styles.emptyText}>Brak zaplanowanych wizyt na najbliższy czas.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 20, 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: 'bold' },
  listContent: { padding: 16 },
  appointmentCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    flexDirection: 'row', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2
  },
  timeContainer: { 
    paddingRight: 16, 
    borderRightWidth: 1, 
    borderRightColor: '#eee', 
    alignItems: 'center',
    minWidth: 70
  },
  timeText: { fontSize: 18, fontWeight: 'bold', color: Colors.accent },
  dateText: { fontSize: 12, color: '#999', marginTop: 2, textTransform: 'uppercase' },
  infoContainer: { flex: 1, paddingLeft: 16 },
  clientName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  serviceName: { fontSize: 14, color: '#666', marginVertical: 4 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  badgeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  detailsBtn: { paddingLeft: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 20, textAlign: 'center', paddingHorizontal: 40 }
});