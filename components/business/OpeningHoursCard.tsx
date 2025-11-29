import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

interface OpeningHour {
  day_of_week: number;
  day_name: string;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
}

interface OpeningHoursCardProps {
  hours: OpeningHour[];
}

const DAY_ICONS: { [key: string]: keyof typeof Ionicons.glyphMap } = {
  'Poniedziałek': 'calendar-outline',
  'Wtorek': 'calendar-outline',
  'Środa': 'calendar-outline',
  'Czwartek': 'calendar-outline',
  'Piątek': 'calendar-outline',
  'Sobota': 'calendar-outline',
  'Niedziela': 'calendar-outline',
};

const OpeningHoursCard: React.FC<OpeningHoursCardProps> = ({ hours }) => {
  if (!hours || hours.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="time-outline" size={24} color={Colors.accent} />
          <Text style={styles.title}>Godziny otwarcia</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Brak informacji o godzinach otwarcia</Text>
        </View>
      </View>
    );
  }

  // Posortuj dni (poniedziałek = 0, niedziela = 6)
  const sortedHours = [...hours].sort((a, b) => a.day_of_week - b.day_of_week);

  // Get current day (0 = Monday, 6 = Sunday)
  const today = new Date().getDay();
  // Convert JavaScript day (0 = Sunday) to backend format (0 = Monday)
  const currentDay = today === 0 ? 6 : today - 1;

  // Format time HH:MM:SS -> HH:MM
  const formatTime = (time?: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time-outline" size={24} color={Colors.accent} />
        <Text style={styles.title}>Godziny otwarcia</Text>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color="#666" />
        <Text style={styles.infoText}>
          Rezerwacje dostępne do miesiąca w przód
        </Text>
      </View>

      <View style={styles.hoursList}>
        {sortedHours.map((hour, index) => {
          const isToday = hour.day_of_week === currentDay;
          
          return (
            <View
              key={index}
              style={[
                styles.hourRow,
                isToday && styles.todayRow,
                index === sortedHours.length - 1 && styles.lastRow,
              ]}
            >
              <View style={styles.dayContainer}>
                <View style={[styles.dayBadge, isToday && styles.todayBadge]}>
                  <Ionicons
                    name={DAY_ICONS[hour.day_name] || 'calendar-outline'}
                    size={16}
                    color={isToday ? '#fff' : Colors.accent}
                  />
                </View>
                <View>
                  <Text style={[styles.dayName, isToday && styles.todayDayName]}>
                    {hour.day_name}
                  </Text>
                  {isToday && (
                    <Text style={styles.todayLabel}>Dzisiaj</Text>
                  )}
                </View>
              </View>

              {hour.is_closed ? (
                <View style={styles.closedBadge}>
                  <Ionicons name="close-circle" size={16} color="#ff4444" />
                  <Text style={styles.closedText}>Zamknięte</Text>
                </View>
              ) : (
                <View style={styles.timeContainer}>
                  <Text style={styles.timeText}>
                    {formatTime(hour.open_time)} - {formatTime(hour.close_time)}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  hoursList: {
    gap: 0,
  },
  hourRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  todayRow: {
    backgroundColor: '#FFF5F0',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  dayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dayBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF5F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  todayBadge: {
    backgroundColor: Colors.accent,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  todayDayName: {
    color: Colors.accent,
    fontWeight: '700',
  },
  todayLabel: {
    fontSize: 11,
    color: Colors.accent,
    marginTop: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  closedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ff4444',
    marginLeft: 4,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
});

export default OpeningHoursCard;