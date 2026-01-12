import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';
import { cancelAppointment, getUserAppointments, getAppointmentDetail } from '../../api/appointments';
import type { Appointment } from '../../types/api';

export default function AppointmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAppointmentDetail();
  }, [id]);

  const fetchAppointmentDetail = async () => {
    if (!id) {
      setError('Brak ID wizyty');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[AppointmentDetail] Fetching appointment:', id);
      
      // ✅ OPCJA 1: Spróbuj pobrać bezpośrednio szczegóły (jeśli endpoint istnieje)
      try {
        const apt = await getAppointmentDetail(String(id));
        setAppointment(apt);
        setLoading(false);
        return;
      } catch (directError) {
        console.log('[AppointmentDetail] Direct fetch failed, trying list approach');
      }
      
      // ✅ OPCJA 2: Pobierz wszystkie i znajdź w tablicy
      const appointmentsResponse = await getUserAppointments();
      
      console.log('[AppointmentDetail] Response type:', typeof appointmentsResponse);
      console.log('[AppointmentDetail] Is array:', Array.isArray(appointmentsResponse));
      console.log('[AppointmentDetail] Response:', appointmentsResponse);
      
      // ✅ Normalizacja odpowiedzi
      let appointments: Appointment[] = [];
      
      if (Array.isArray(appointmentsResponse)) {
        appointments = appointmentsResponse;
      } else if (appointmentsResponse && typeof appointmentsResponse === 'object') {
        // Backend może zwrócić { results: [...] } lub { data: [...] }
        const data = appointmentsResponse as any;
        if (Array.isArray(data.results)) {
          appointments = data.results;
        } else if (Array.isArray(data.data)) {
          appointments = data.data;
        } else {
          console.error('[AppointmentDetail] Unexpected response format:', data);
          throw new Error('Nieprawidłowy format odpowiedzi z serwera');
        }
      } else {
        console.error('[AppointmentDetail] Response is not an array or object:', appointmentsResponse);
        throw new Error('Nieprawidłowy format odpowiedzi z serwera');
      }
      
      console.log('[AppointmentDetail] Normalized appointments:', appointments.length);
      
      // Znajdź konkretną wizytę
      const apt = appointments.find((a: Appointment) => String(a.id) === String(id));
      
      if (!apt) {
        throw new Error('Nie znaleziono wizyty');
      }

      setAppointment(apt);
    } catch (e: any) {
      console.error('[AppointmentDetail] Error:', e);
      
      let errorMessage = 'Błąd pobierania danych wizyty';
      
      if (e?.response?.status === 404) {
        errorMessage = 'Nie znaleziono wizyty';
      } else if (e?.response?.data?.detail) {
        errorMessage = e.response.data.detail;
      } else if (e?.message) {
        errorMessage = e.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = () => {
    console.log('🔵 [Cancel] Button clicked!');
    
    if (!appointment) {
      console.log('❌ [Cancel] No appointment!');
      return;
    }

    console.log('🔵 [Cancel] Showing confirmation for:', appointment.id);

    // ✅ Obsługa web i mobile
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Czy na pewno chcesz anulować tę wizytę?');
      if (confirmed) {
        confirmCancelAppointment();
      }
    } else {
      Alert.alert(
        'Anulowanie wizyty',
        'Czy na pewno chcesz anulować tę wizytę?',
        [
          { text: 'Nie', style: 'cancel' },
          { 
            text: 'Tak, anuluj', 
            style: 'destructive',
            onPress: confirmCancelAppointment 
          }
        ]
      );
    }
  };

  const confirmCancelAppointment = async () => {
    if (!appointment) {
      console.log('❌ [Cancel] No appointment in confirm!');
      return;
    }

    console.log('🔵 [Cancel] Starting cancellation...');
    setCancelling(true);
    
    try {
      console.log('📤 [Cancel] Cancelling appointment:', appointment.id);
      
      // ✅ Wywołaj anulowanie
      const result = await cancelAppointment(String(appointment.id));
      
      console.log('✅ [Cancel] Success, result:', result);

      // ✅ Zaktualizuj stan lokalny
      if (result) {
        setAppointment(result);
      } else {
        // Jeśli backend nie zwrócił obiektu, odśwież ręcznie
        setAppointment(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }

      // ✅ Obsługa web i mobile
      if (Platform.OS === 'web') {
        window.alert('Wizyta została anulowana');
      } else {
        Alert.alert(
          'Sukces',
          'Wizyta została anulowana',
          [{ text: 'OK' }]
        );
      }
    } catch (e: any) {
      console.error('❌ [Cancel] Error:', e);
      console.error('❌ [Cancel] Error response:', e?.response?.data);
      
      let errorMessage = 'Nie udało się anulować wizyty';
      
      // ✅ Obsługa błędów z backendu (sprawdzaj różne formaty)
      if (e?.response?.data) {
        const errorData = e.response.data;
        errorMessage = errorData.message || errorData.detail || errorData.error || errorMessage;
      } else if (e?.message) {
        errorMessage = e.message;
      }

      console.log('❌ [Cancel] Error message:', errorMessage);

      // ✅ Obsługa web i mobile
      if (Platform.OS === 'web') {
        window.alert(`Błąd: ${errorMessage}`);
      } else {
        Alert.alert('Błąd', errorMessage);
      }
    } finally {
      setCancelling(false);
      console.log('🔵 [Cancel] Finished');
    }
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Ładowanie...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (error || !appointment) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#b00020" />
          <Text style={styles.errorText}>{error || 'Nie znaleziono wizyty'}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color="#333" />
            <Text style={styles.backText}>Powrót</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Status configuration
  const status = appointment.status || 'pending';
  const statusConfig: Record<string, { label: string; color: string; icon: string; bgColor: string }> = {
    pending: { 
      label: 'Oczekuje', 
      color: '#f59e0b', 
      icon: 'time-outline',
      bgColor: '#fef3c7'
    },
    confirmed: { 
      label: 'Potwierdzona', 
      color: '#10b981', 
      icon: 'checkmark-circle-outline',
      bgColor: '#d1fae5'
    },
    cancelled: { 
      label: 'Anulowana', 
      color: '#ef4444', 
      icon: 'close-circle-outline',
      bgColor: '#fee2e2'
    },
    completed: { 
      label: 'Zakończona', 
      color: '#6366f1', 
      icon: 'checkmark-done-outline',
      bgColor: '#e0e7ff'
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.pending;

  const service = appointment.service as any;
  const business = appointment.business as any;
  
  // Format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pl-PL', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const canCancel = status !== 'cancelled' && status !== 'completed';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Szczegóły wizyty</Text>
        </LinearGradient>

        {/* Status Badge */}
        <View style={[styles.statusContainer, { backgroundColor: currentStatus.bgColor }]}>
          <Ionicons name={currentStatus.icon as any} size={24} color={currentStatus.color} />
          <Text style={[styles.statusLabel, { color: currentStatus.color }]}>
            {currentStatus.label}
          </Text>
        </View>

        {/* Service Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="cut-outline" size={24} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Usługa</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Nazwa</Text>
            <Text style={styles.infoValue}>{service?.name || 'Brak danych'}</Text>
            
            {service?.duration_minutes && (
              <>
                <Text style={[styles.infoLabel, { marginTop: 12 }]}>Czas trwania</Text>
                <Text style={styles.infoValue}>{service.duration_minutes} min</Text>
              </>
            )}
            
            {service?.price_amount && (
              <>
                <Text style={[styles.infoLabel, { marginTop: 12 }]}>Cena</Text>
                <Text style={styles.infoValue}>{service.price_amount} PLN</Text>
              </>
            )}
          </View>
        </View>

        {/* Business Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business-outline" size={24} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Firma</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Nazwa</Text>
            <Text style={styles.infoValue}>
              {typeof business === 'string' ? business : business?.name || 'Brak danych'}
            </Text>
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="calendar-outline" size={24} color={Colors.accent} />
            <Text style={styles.sectionTitle}>Data i godzina</Text>
          </View>
          <View style={styles.infoCard}>
            {appointment.start && (
              <>
                <Text style={styles.infoLabel}>Data</Text>
                <Text style={styles.infoValue}>{formatDate(appointment.start)}</Text>
                
                <Text style={[styles.infoLabel, { marginTop: 12 }]}>Godzina rozpoczęcia</Text>
                <Text style={styles.infoValue}>{formatTime(appointment.start)}</Text>
              </>
            )}
            
            {appointment.end && (
              <>
                <Text style={[styles.infoLabel, { marginTop: 12 }]}>Godzina zakończenia</Text>
                <Text style={styles.infoValue}>{formatTime(appointment.end)}</Text>
              </>
            )}
          </View>
        </View>

        {/* Notes */}
        {appointment.notes && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={24} color={Colors.accent} />
              <Text style={styles.sectionTitle}>Notatki</Text>
            </View>
            <View style={styles.infoCard}>
              <Text style={styles.infoValue}>{appointment.notes}</Text>
            </View>
          </View>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.cancelButton, cancelling && styles.cancelButtonDisabled]}
              onPress={handleCancelAppointment}
              disabled={cancelling}
            >
              {cancelling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="close-circle-outline" size={20} color="#fff" />
                  <Text style={styles.cancelButtonText}>Anuluj wizytę</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f0f4f9',
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#b00020',
    marginTop: 16,
    textAlign: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 12,
  },
  backText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginTop: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelButtonDisabled: {
    opacity: 0.6,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});
