import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import Colors from '../../constants/Colors';
import { getAvailability } from '../../api/appointments';
import type { Service, Business } from '../../types/api';

// Konfiguracja języka polskiego dla kalendarza
LocaleConfig.locales['pl'] = {
  monthNames: ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'],
  monthNamesShort: ['Sty','Lut','Mar','Kwi','Maj','Cze','Lip','Sie','Wrz','Paź','Lis','Gru'],
  dayNames: ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'],
  dayNamesShort: ['Nie','Pon','Wt','Śr','Czw','Pt','Sob'],
  today: 'Dzisiaj'
};
LocaleConfig.defaultLocale = 'pl';

interface BookingModalProps {
  visible: boolean;
  onClose: () => void;
  service: Service;
  business: Business;
  onConfirm: (date: string, time: string) => void;
}

const BookingModal: React.FC<BookingModalProps> = ({
  visible,
  onClose,
  service,
  business,
  onConfirm,
}) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Zresetuj stan przy otwarciu
  useEffect(() => {
    if (visible) {
      setSelectedDate(null);
      setSelectedTime(null);
      setAvailableSlots([]);
    }
  }, [visible]);

  // Pobieranie dostępności gdy wybierzemy datę
  useEffect(() => {
    if (selectedDate && business.slug) {
      fetchAvailability(selectedDate);
    }
  }, [selectedDate]);

  const fetchAvailability = async (date: string) => {
    setLoading(true);
    setAvailableSlots([]);
    setSelectedTime(null);

    try {
      const availability = await getAvailability(
        business.slug!,
        String(service.id),
        date
      );

      let slots: string[] = [];
      // Rzutowanie na any[], żeby ominąć błąd TS o typie `never`
      const rawSlots = availability.slots as any[];
      
      if (Array.isArray(rawSlots) && rawSlots.length > 0) {
        if (typeof rawSlots[0] === 'string') {
          slots = rawSlots as string[];
        } else if (rawSlots[0]?.time) {
          slots = rawSlots.map((slot: any) => slot.time);
        }
      }
      
      setAvailableSlots(slots);
    } catch (error: any) {
      console.error('❌ [BookingModal] Error:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      onConfirm(selectedDate, selectedTime);
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setAvailableSlots([]);
    onClose();
  };

  // Ustawienie dzisiejszej daty, żeby zablokować kalendarz przed dzisiejszym dniem
  const today = new Date().toISOString().split('T')[0];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="calendar" size={24} color={Colors.accent} />
              <Text style={styles.title}>Wybierz termin</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Service Info */}
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{service.name}</Text>
            <View style={styles.serviceMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.metaText}>
                  {service.duration_minutes} min
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color="#666" />
                <Text style={styles.metaText}>
                  {service.price_amount !== undefined ? service.price_amount : '-'} PLN
                </Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            {/* Kalendarz */}
            <View style={styles.calendarSection}>
              <Text style={styles.sectionTitle}>1. Wybierz dzień</Text>
              
              <View style={styles.calendarWrapper}>
                <Calendar
                  current={selectedDate || today}
                  minDate={today}
                  onDayPress={(day: any) => {
                    setSelectedDate(day.dateString);
                    setSelectedTime(null);
                  }}
                  markedDates={{
                    [selectedDate || '']: { selected: true, selectedColor: Colors.accent },
                  }}
                  theme={{
                    backgroundColor: '#ffffff',
                    calendarBackground: '#ffffff',
                    textSectionTitleColor: '#b6c1cd',
                    selectedDayBackgroundColor: Colors.accent,
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: Colors.accent,
                    dayTextColor: '#2d4150',
                    textDisabledColor: '#d9e1e8',
                    arrowColor: Colors.accent,
                    monthTextColor: Colors.accent,
                    textDayFontWeight: '500',
                    textMonthFontWeight: 'bold',
                    textDayHeaderFontWeight: '500',
                    textDayFontSize: 14,
                    textMonthFontSize: 16,
                    textDayHeaderFontSize: 13
                  }}
                />
              </View>
            </View>

            {/* Time Slots */}
            {selectedDate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  2. Wybierz godzinę
                </Text>
                
                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Szukanie wolnych terminów...</Text>
                  </View>
                ) : availableSlots.length > 0 ? (
                  <View style={styles.slotsGrid}>
                    {availableSlots.map((slot, idx) => {
                      const isSelected = selectedTime === slot;
                      return (
                        <TouchableOpacity
                          key={`time-${idx}-${slot}`}
                          style={[
                            styles.slotButton,
                            isSelected && styles.slotButtonSelected,
                          ]}
                          onPress={() => setSelectedTime(slot)}
                        >
                          <Ionicons
                            name="time-outline"
                            size={18}
                            color={isSelected ? '#fff' : Colors.accent}
                          />
                          <Text
                            style={[
                              styles.slotText,
                              isSelected && styles.slotTextSelected,
                            ]}
                          >
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Brak wolnych miejsc w tym dniu</Text>
                    <Text style={styles.emptySubtext}>Wybierz inną datę z kalendarza</Text>
                  </View>
                )}
              </View>
            )}
            <View style={{height: 40}} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedDate || !selectedTime) && styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={!selectedDate || !selectedTime}
            >
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Potwierdź</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    ...Platform.select({
      web: {
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  serviceInfo: {
    padding: 16,
    backgroundColor: '#FFF5F0',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  calendarSection: {
    padding: 16,
    paddingBottom: 0,
  },
  calendarWrapper: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  slotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.accent,
    backgroundColor: '#fff',
    minWidth: 100,
  },
  slotButtonSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  slotText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accent,
  },
  slotTextSelected: {
    color: '#fff',
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: Colors.accent,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default BookingModal;