import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import Colors from '../../constants/Colors';
import { getAvailability } from '../../api/appointments';
import type { Appointment } from '../../types/api';

LocaleConfig.locales.pl = {
  monthNames: [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
  ],
  monthNamesShort: ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'],
  dayNames: ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'],
  dayNamesShort: ['Nie', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'],
  today: 'Dzisiaj',
};
LocaleConfig.defaultLocale = 'pl';

interface RescheduleModalProps {
  visible: boolean;
  appointment: Appointment | null;
  submitting?: boolean;
  title?: string;
  hint?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (date: string, time: string) => void;
}

export default function RescheduleModal({
  visible,
  appointment,
  submitting = false,
  title = 'Zmień termin',
  hint = 'Po zmianie terminu salon musi ponownie potwierdzić wizytę.',
  confirmLabel = 'Zapisz nowy termin',
  onClose,
  onConfirm,
}: RescheduleModalProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
  }, [visible]);

  const fetchAvailability = useCallback(
    async (date: string) => {
      if (!appointment?.business || !appointment.service?.id) return;
      setLoading(true);
      try {
        const availability = await getAvailability(
          appointment.business,
          String(appointment.service.id),
          date
        );
        const rawSlots = (availability.slots as any[]) || [];
        let slots: string[] = [];
        if (rawSlots.length > 0) {
          if (typeof rawSlots[0] === 'string') {
            slots = rawSlots as string[];
          } else if (rawSlots[0]?.time) {
            slots = rawSlots.map((slot: any) => slot.time);
          }
        }
        setAvailableSlots(slots);
      } catch {
        setAvailableSlots([]);
      } finally {
        setLoading(false);
      }
    },
    [appointment?.business, appointment?.service?.id]
  );

  useEffect(() => {
    if (selectedDate) {
      void fetchAvailability(selectedDate);
    }
  }, [selectedDate, fetchAvailability]);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            {appointment?.service?.name || 'Wizyta'}
            {appointment?.business_name ? ` · ${appointment.business_name}` : ''}
          </Text>
          <Text style={styles.hint}>{hint}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Calendar
              minDate={today}
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setSelectedTime(null);
              }}
              markedDates={
                selectedDate
                  ? { [selectedDate]: { selected: true, selectedColor: Colors.accent } }
                  : {}
              }
              theme={{
                todayTextColor: Colors.accent,
                arrowColor: Colors.accent,
              }}
            />

            {selectedDate ? (
              <View style={styles.slotsSection}>
                <Text style={styles.slotsTitle}>Dostępne godziny</Text>
                {loading ? (
                  <ActivityIndicator color={Colors.accent} style={{ marginVertical: 16 }} />
                ) : availableSlots.length === 0 ? (
                  <Text style={styles.emptySlots}>Brak wolnych godzin tego dnia</Text>
                ) : (
                  <View style={styles.slotsGrid}>
                    {availableSlots.map((time) => (
                      <TouchableOpacity
                        key={time}
                        style={[
                          styles.slot,
                          selectedTime === time && styles.slotSelected,
                        ]}
                        onPress={() => setSelectedTime(time)}
                      >
                        <Text
                          style={[
                            styles.slotText,
                            selectedTime === time && styles.slotTextSelected,
                          ]}
                        >
                          {time}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.confirmBtn,
              (!selectedDate || !selectedTime || submitting) && styles.confirmBtnDisabled,
            ]}
            disabled={!selectedDate || !selectedTime || submitting}
            onPress={() => {
              if (selectedDate && selectedTime) onConfirm(selectedDate, selectedTime);
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 12,
  },
  slotsSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  slotsTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    color: '#222',
  },
  emptySlots: {
    color: '#888',
    marginVertical: 12,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slot: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  slotSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  slotText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  slotTextSelected: {
    color: '#fff',
  },
  confirmBtn: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
