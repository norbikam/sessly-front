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
import Colors from '../../constants/Colors';
import { getAvailability } from '../../api/appointments';
import type { Service, Business } from '../../types/api';

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
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Generate next 30 days
  const generateDates = () => {
    const dates: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date.toISOString().split('T')[0]);
    }
    
    return dates;
  };

  useEffect(() => {
    if (visible) {
      console.log('🔵 [BookingModal] Modal opened');
      setSelectedDate(null);
      setSelectedTime(null);
      setAvailableSlots([]);
      const dates = generateDates();
      setAvailableDates(dates);
      console.log('✅ [BookingModal] Generated dates:', dates.slice(0, 3), '...');
    }
  }, [visible]);

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
      console.log('📤 [BookingModal] Fetching availability:', {
        slug: business.slug,
        serviceId: String(service.id),
        date,
      });

      const availability = await getAvailability(
        business.slug!,
        String(service.id),
        date
      );

      console.log('✅ [BookingModal] Raw response:', availability);

      // ✅ FIX: Backend zwraca array stringów, NIE obiektów!
      let slots: string[] = [];
      
      if (Array.isArray(availability.slots)) {
        // Check if slots are strings or objects
        if (typeof availability.slots[0] === 'string') {
          // Backend zwraca: ["09:00", "10:15", ...]
          slots = availability.slots as unknown as string[];
          console.log('✅ [BookingModal] Slots are strings:', slots);
        } else if (availability.slots[0]?.time) {
          // Backend zwraca: [{time: "09:00"}, {time: "10:15"}, ...]
          slots = availability.slots.map((slot: any) => slot.time);
          console.log('✅ [BookingModal] Slots are objects:', slots);
        }
      }
      
      console.log('✅ [BookingModal] Final slots:', slots);
      setAvailableSlots(slots);
    } catch (error: any) {
      console.error('❌ [BookingModal] Error:', error);
      setAvailableSlots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: string) => {
    console.log('🔵 [BookingModal] Date selected:', date);
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    console.log('🔵 [BookingModal] Time selected:', time);
    setSelectedTime(time);
  };

  const handleConfirm = () => {
    if (selectedDate && selectedTime) {
      console.log('✅ [BookingModal] Confirming:', { date: selectedDate, time: selectedTime });
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

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const targetDate = new Date(dateString + 'T00:00:00');
    targetDate.setHours(0, 0, 0, 0);

    if (targetDate.getTime() === today.getTime()) {
      return 'Dzisiaj';
    } else if (targetDate.getTime() === tomorrow.getTime()) {
      return 'Jutro';
    }

    const dayNames = ['Nie', 'Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob'];
    const monthNames = ['Sty', 'Lut', 'Mar', 'Kwi', 'Maj', 'Cze', 'Lip', 'Sie', 'Wrz', 'Paź', 'Lis', 'Gru'];
    
    return `${dayNames[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
  };

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
                  {(service as any).duration_minutes || service.duration} min
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="cash-outline" size={16} color="#666" />
                <Text style={styles.metaText}>
                  {(service as any).price_amount || service.price} PLN
                </Text>
              </View>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
            {/* Date Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Wybierz dzień</Text>
              <Text style={styles.helperText}>Przesuń w prawo aby zobaczyć więcej dni →</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={true}
                contentContainerStyle={styles.datesScroll}
                style={styles.datesScrollContainer}
              >
                {availableDates.map((date, idx) => {
                  const isSelected = selectedDate === date;
                  const isToday = date === new Date().toISOString().split('T')[0];
                  
                  return (
                    <TouchableOpacity
                      key={`date-${idx}`}
                      style={[
                        styles.dateButton,
                        isSelected && styles.dateButtonSelected,
                        isToday && !isSelected && styles.dateButtonToday,
                      ]}
                      onPress={() => handleDateSelect(date)}
                    >
                      <Text style={[
                        styles.dateButtonText,
                        isSelected && styles.dateButtonTextSelected,
                      ]}>
                        {formatDateDisplay(date)}
                      </Text>
                      <Text style={[
                        styles.dateButtonSubtext,
                        isSelected && styles.dateButtonTextSelected,
                      ]}>
                        {date.slice(5)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Time Slots */}
            {selectedDate && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  2. Wybierz godzinę
                </Text>
                <Text style={styles.helperText}>Wybrana data: {selectedDate}</Text>

                {loading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.accent} />
                    <Text style={styles.loadingText}>Sprawdzam dostępność...</Text>
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
                          onPress={() => handleTimeSelect(slot)}
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
                    <Text style={styles.emptyText}>Brak dostępnych terminów</Text>
                    <Text style={styles.emptySubtext}>Wybierz inny dzień</Text>
                  </View>
                )}
              </View>
            )}
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
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  datesScrollContainer: {
    maxHeight: 100,
  },
  datesScroll: {
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  dateButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    minWidth: 90,
    alignItems: 'center',
  },
  dateButtonToday: {
    borderColor: Colors.accent,
    backgroundColor: '#FFF5F0',
  },
  dateButtonSelected: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  dateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dateButtonSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  dateButtonTextSelected: {
    color: '#fff',
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
    marginTop: 8,
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
    padding: 40,
    alignItems: 'center',
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