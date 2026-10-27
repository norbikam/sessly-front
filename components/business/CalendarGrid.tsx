import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Appointment } from '../../types/api';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { appointmentClientName, staffDisplayName } from '../../utils/staffName';

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 72;
const TIME_WIDTH = 52;

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const addDays = (value: Date, count: number) => {
  const next = new Date(value);
  next.setDate(next.getDate() + count);
  return next;
};
const sameDay = (left: Date, right: Date) => left.toDateString() === right.toDateString();

type Props = {
  appointments: Appointment[];
  onAppointmentPress: (appointment: Appointment) => void;
  daysToShow?: number;
};

export function CalendarGrid({ appointments, onAppointmentPress, daysToShow }: Props) {
  const { width } = useWindowDimensions();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = Colors[scheme];
  const [containerWidth, setContainerWidth] = useState(0);
  const dayCount = daysToShow || (width >= 1100 ? 7 : width >= 700 ? 5 : 3);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewStart, setViewStart] = useState(() => {
    if (dayCount < 7) return today;
    const mondayOffset = (today.getDay() + 6) % 7;
    return addDays(today, -mondayOffset);
  });
  const days = useMemo(
    () => Array.from({ length: dayCount }, (_, index) => addDays(viewStart, index)),
    [dayCount, viewStart],
  );
  const columnWidth = Math.max(104, ((containerWidth || width) - TIME_WIDTH) / dayCount);
  const gridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
  const visibleAppointments = appointments.filter((item) => {
    const date = new Date(item.start);
    return date >= days[0] && date < addDays(days[days.length - 1], 1);
  });

  return (
    <View
      style={[styles.wrapper, { backgroundColor: palette.card, borderColor: palette.border }]}
      onLayout={(event) => setContainerWidth(event.nativeEvent.layout.width)}
    >
      <View style={[styles.toolbar, { borderBottomColor: palette.border }]}>
        <View>
          <Text style={[styles.rangeTitle, { color: palette.text }]}>
            {days[0].toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} – {days[days.length - 1].toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
          </Text>
          <Text style={[styles.rangeHint, { color: palette.textSecondary }]}>{dayCount === 7 ? 'Widok tygodnia' : `${dayCount}-dniowy widok mobilny`}</Text>
        </View>
        <View style={styles.navigation}>
          <TouchableOpacity style={[styles.navButton, { borderColor: palette.border }]} onPress={() => setViewStart(addDays(viewStart, -dayCount))}>
            <Ionicons name="chevron-back" size={19} color={palette.text} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, { borderColor: palette.border }]} onPress={() => setViewStart(addDays(viewStart, dayCount))}>
            <Ionicons name="chevron-forward" size={19} color={palette.text} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width: TIME_WIDTH + columnWidth * dayCount }}>
          <View style={[styles.daysHeader, { borderBottomColor: palette.border }]}>
            <View style={{ width: TIME_WIDTH }} />
            {days.map((day) => (
              <View key={day.toISOString()} style={[styles.dayHeader, { width: columnWidth, borderLeftColor: palette.border }]}>
                <Text style={[styles.weekday, { color: palette.textSecondary }]}>{day.toLocaleDateString('pl-PL', { weekday: 'short' }).toUpperCase()}</Text>
                <View style={[styles.dayNumber, sameDay(day, today) && styles.dayNumberToday]}>
                  <Text style={[styles.dayNumberText, { color: palette.text }, sameDay(day, today) && styles.dayNumberTextToday]}>{day.getDate()}</Text>
                </View>
              </View>
            ))}
          </View>

          <ScrollView style={styles.verticalScroll} contentContainerStyle={{ height: gridHeight + 20 }} nestedScrollEnabled>
            <View style={{ height: gridHeight }}>
              {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => (
                <View key={index} style={[styles.hourLine, { top: index * HOUR_HEIGHT, borderTopColor: palette.border }]}>
                  <Text style={[styles.hourText, { color: palette.textSecondary }]}>{String(START_HOUR + index).padStart(2, '0')}:00</Text>
                </View>
              ))}
              {days.map((day, index) => (
                <View key={day.toISOString()} pointerEvents="none" style={[styles.dayColumn, { left: TIME_WIDTH + index * columnWidth, width: columnWidth, height: gridHeight, borderLeftColor: palette.border }]} />
              ))}
              {visibleAppointments.map((appointment) => {
                const start = new Date(appointment.start);
                const end = new Date(appointment.end);
                const dayIndex = days.findIndex((day) => sameDay(day, start));
                const minutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
                const duration = Math.max(30, (end.getTime() - start.getTime()) / 60000);
                const statusColor = appointment.status === 'pending' || appointment.status === 'proposed'
                  ? '#F59E0B'
                  : appointment.status === 'confirmed'
                    ? '#10B981'
                    : appointment.status === 'completed'
                      ? '#6366F1'
                      : '#94A3B8';
                const staffName = staffDisplayName(appointment.staff);
                if (dayIndex < 0 || minutes < 0) return null;
                return (
                  <TouchableOpacity
                    key={appointment.id}
                    style={[
                      styles.event,
                      {
                        left: TIME_WIDTH + dayIndex * columnWidth + 4,
                        top: minutes / 60 * HOUR_HEIGHT + 2,
                        width: columnWidth - 8,
                        height: Math.max(42, duration / 60 * HOUR_HEIGHT - 4),
                        backgroundColor: statusColor + '20',
                        borderLeftColor: statusColor,
                      },
                    ]}
                    onPress={() => onAppointmentPress(appointment)}
                  >
                    <Text style={[styles.eventTime, { color: statusColor }]}>
                      {start.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.eventTitle, { color: palette.text }]} numberOfLines={1}>{appointment.service?.name || 'Wizyta'}</Text>
                    <Text style={[styles.eventClient, { color: palette.textSecondary }]} numberOfLines={1}>
                      {appointmentClientName(appointment)}
                    </Text>
                    {staffName ? (
                      <Text style={[styles.eventClient, { color: palette.textSecondary }]} numberOfLines={1}>
                        {staffName}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, borderWidth: 1, borderRadius: 18, overflow: 'hidden' },
  toolbar: { minHeight: 70, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  rangeTitle: { fontSize: 16, fontWeight: '800' },
  rangeHint: { fontSize: 11, marginTop: 3 },
  navigation: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  navButton: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  daysHeader: { height: 70, flexDirection: 'row', borderBottomWidth: 1 },
  dayHeader: { alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth },
  weekday: { fontSize: 10, fontWeight: '800' },
  dayNumber: { width: 32, height: 32, marginTop: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dayNumberToday: { backgroundColor: Colors.light.accent },
  dayNumberText: { fontSize: 15, fontWeight: '800' },
  dayNumberTextToday: { color: '#fff' },
  verticalScroll: { maxHeight: 620 },
  hourLine: { position: 'absolute', left: 0, right: 0, height: HOUR_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth },
  hourText: { width: TIME_WIDTH - 7, marginTop: -8, textAlign: 'right', fontSize: 10 },
  dayColumn: { position: 'absolute', top: 0, borderLeftWidth: StyleSheet.hairlineWidth },
  event: { position: 'absolute', zIndex: 2, borderLeftWidth: 3, borderRadius: 8, padding: 6, overflow: 'hidden' },
  eventTime: { fontSize: 10, fontWeight: '900' },
  eventTitle: { fontSize: 11, fontWeight: '800', marginTop: 2 },
  eventClient: { fontSize: 10, marginTop: 2 },
});
