import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import type { Appointment } from '../../types/api';

export const getStatusInfo = (status: string) => {
  switch (status) {
    case 'confirmed':
      return { label: 'Potwierdzona', color: '#10b981', bg: '#d1fae5' };
    case 'pending':
      return { label: 'Oczekująca', color: '#f59e0b', bg: '#fef3c7' };
    case 'cancelled':
      return { label: 'Anulowana', color: '#ef4444', bg: '#fee2e2' };
    default:
      return { label: status, color: '#6b7280', bg: '#f3f4f6' };
  }
};

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel: (id: string) => void;
  onBusinessPress: (slug: string) => void;
}

export default function AppointmentCard({ appointment, onCancel, onBusinessPress }: AppointmentCardProps) {
  const statusInfo = getStatusInfo(appointment.status || 'pending');
  
  // 1. Definiujemy datę wizyty i obecny czas
  const startDate = appointment.start ? new Date(appointment.start) : null;
  const now = new Date();
  
  // 2. Sprawdzamy czy wizyta jest w przyszłości
  const isFuture = startDate ? startDate > now : false;

  // 3. ✅ POPRAWKA: Można anulować tylko jeśli status pozwala ORAZ wizyta jest w przyszłości
  const canCancel = (appointment.status === 'confirmed' || appointment.status === 'pending') && isFuture;

  const formattedDate = startDate
    ? startDate.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Termin nieustalony';

  const businessName = typeof appointment.business === 'string' 
    ? appointment.business 
    : (appointment.business as any)?.name || 'Firma';

  const businessSlug = typeof appointment.business === 'string'
    ? appointment.business
    : (appointment.business as any)?.slug || String(appointment.business);

  const duration = (appointment.service as any)?.duration_minutes || appointment.service?.duration_minutes || 0;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {appointment.service?.name || 'Brak nazwy usługi'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>
      </View>

      {/* Business */}
      {appointment.business && (
        <TouchableOpacity
          style={styles.businessRow}
          onPress={() => onBusinessPress(businessSlug)}
        >
          <Ionicons name="business" size={18} color={Colors.accent} />
          <Text style={styles.businessText} numberOfLines={1}>
            {businessName}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>
      )}

      {/* Date & Time */}
      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={18} color="#666" />
        <Text style={styles.detailText}>{formattedDate}</Text>
      </View>

      {/* Service Duration */}
      {duration > 0 && (
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.detailText}>{duration} min</Text>
        </View>
      )}

      {/* Notes */}
      {appointment.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notatki:</Text>
          <Text style={styles.notesText}>{appointment.notes}</Text>
        </View>
      )}

      {/* Cancel Button - teraz bezpieczny! */}
      {canCancel && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => onCancel(appointment.id)}
        >
          <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
          <Text style={styles.cancelButtonText}>Anuluj wizytę</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
    gap: 8,
  },
  businessText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  notesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
});