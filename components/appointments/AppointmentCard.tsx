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
    case 'completed':
      return { label: 'Zakończona', color: '#6b7280', bg: '#f3f4f6' };
    default:
      return { label: status, color: '#6b7280', bg: '#f3f4f6' };
  }
};

interface AppointmentCardProps {
  appointment: Appointment;
  onCancel: (id: string) => void;
  onReschedule: (appointment: Appointment) => void;
  onPayDeposit?: (appointment: Appointment) => void;
  onBusinessPress: (slug: string) => void;
}

export default function AppointmentCard({
  appointment,
  onCancel,
  onReschedule,
  onPayDeposit,
  onBusinessPress,
}: AppointmentCardProps) {
  const statusInfo = getStatusInfo(appointment.status || 'pending');
  const startDate = appointment.start ? new Date(appointment.start) : null;
  const now = new Date();
  const isFuture = startDate ? startDate > now : false;
  const policyAllows =
    typeof appointment.can_change === 'boolean'
      ? appointment.can_change
      : isFuture &&
        (appointment.status === 'confirmed' || appointment.status === 'pending');

  const canChange =
    (appointment.status === 'confirmed' || appointment.status === 'pending') &&
    policyAllows;

  const formattedDate = startDate
    ? startDate.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Termin nieustalony';

  const businessName =
    appointment.business_name ||
    (typeof appointment.business === 'string'
      ? appointment.business
      : (appointment.business as any)?.name || 'Firma');

  const businessSlug =
    typeof appointment.business === 'string'
      ? appointment.business
      : (appointment.business as any)?.slug || String(appointment.business);

  const duration =
    (appointment.service as any)?.duration_minutes ||
    appointment.service?.duration_minutes ||
    0;

  const minHours = appointment.change_min_hours ?? 2;
  const showPolicyHint =
    isFuture &&
    (appointment.status === 'confirmed' || appointment.status === 'pending') &&
    !canChange &&
    Boolean(appointment.change_blocked_reason);

  const needsDeposit =
    appointment.deposit_status === 'pending' &&
    appointment.deposit_amount != null &&
    Number(appointment.deposit_amount) > 0;

  const depositLabel = needsDeposit
    ? `Opłać zaliczkę ${appointment.deposit_amount} ${appointment.deposit_currency || 'PLN'}`
    : '';

  return (
    <View style={styles.card}>
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

      {appointment.business ? (
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
      ) : null}

      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={18} color="#666" />
        <Text style={styles.detailText}>{formattedDate}</Text>
      </View>

      {duration > 0 ? (
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={18} color="#666" />
          <Text style={styles.detailText}>{`${duration} min`}</Text>
        </View>
      ) : null}

      {appointment.notes ? (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notatki:</Text>
          <Text style={styles.notesText}>{appointment.notes}</Text>
        </View>
      ) : null}

      {showPolicyHint ? (
        <Text style={styles.policyHint}>
          {appointment.change_blocked_reason ||
            `Zmiany możliwe najpóźniej ${minHours} h przed wizytą.`}
        </Text>
      ) : null}

      {needsDeposit && onPayDeposit ? (
        <TouchableOpacity
          style={styles.payButton}
          onPress={() => onPayDeposit(appointment)}
        >
          <Ionicons name="card-outline" size={18} color="#fff" />
          <Text style={styles.payButtonText}>{depositLabel}</Text>
        </TouchableOpacity>
      ) : null}

      {appointment.deposit_status === 'paid' ? (
        <Text style={styles.paidHint}>Zaliczka opłacona</Text>
      ) : null}

      {canChange ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.rescheduleButton}
            onPress={() => onReschedule(appointment)}
          >
            <Ionicons name="calendar-outline" size={18} color={Colors.accent} />
            <Text style={styles.rescheduleButtonText}>Zmień termin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => onCancel(appointment.id)}
          >
            <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
            <Text style={styles.cancelButtonText}>Anuluj</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  policyHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#b45309',
    lineHeight: 16,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#059669',
    gap: 8,
  },
  payButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  paidHint: {
    marginTop: 10,
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    gap: 6,
  },
  rescheduleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    gap: 6,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
});
