import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Appointment, BusinessStaff } from '../../types/api';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { appointmentClientName, staffDisplayName } from '../../utils/staffName';

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_HEIGHT = 92;
const TIME_WIDTH = 52;
const WEEKDAYS = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

export const startOfDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate());

export const addDays = (value: Date, count: number) => {
  const next = startOfDay(value);
  next.setDate(next.getDate() + count);
  return next;
};

export const sameDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate();

export const mondayOf = (value: Date) => {
  const date = startOfDay(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
};

export const localDateIso = (value: Date) => {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

export const minutesToTime = (total: number) => {
  const hours = String(Math.floor(total / 60)).padStart(2, '0');
  const minutes = String(total % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const statusColor = (status?: string) => {
  if (status === 'pending' || status === 'proposed') return '#F59E0B';
  if (status === 'completed') return '#6366F1';
  if (status === 'cancelled') return '#94A3B8';
  return '#7C3AED';
};

type LaidOut = Appointment & { col: number; cols: number };

function layoutOverlaps(items: Appointment[]): LaidOut[] {
  const sorted = [...items].sort(
    (left, right) => new Date(left.start).getTime() - new Date(right.start).getTime()
  );
  const laid: LaidOut[] = [];
  const active: { end: number; col: number }[] = [];

  sorted.forEach((item) => {
    const start = new Date(item.start).getTime();
    const end = new Date(item.end).getTime();
    for (let index = active.length - 1; index >= 0; index -= 1) {
      if (active[index].end <= start) active.splice(index, 1);
    }
    const used = new Set(active.map((entry) => entry.col));
    let col = 0;
    while (used.has(col)) col += 1;
    active.push({ end, col });
    const cols = Math.max(col + 1, ...active.map((entry) => entry.col + 1));
    laid.forEach((entry) => {
      if (new Date(entry.end).getTime() > start) entry.cols = Math.max(entry.cols, cols);
    });
    laid.push({ ...item, col, cols });
  });
  return laid;
}

type Props = {
  selectedDate: Date;
  onChangeDate: (date: Date) => void;
  appointments: Appointment[];
  staff: BusinessStaff[];
  selectedStaffId?: string | null;
  onSelectStaff?: (id: string | null) => void;
  onAppointmentPress: (appointment: Appointment) => void;
  onEmptySlotPress?: (dateIso: string, time: string) => void;
  canManage?: boolean;
  showTimeline?: boolean;
};

export function MobileDayCalendar({
  selectedDate,
  onChangeDate,
  appointments,
  staff,
  selectedStaffId,
  onSelectStaff,
  onAppointmentPress,
  onEmptySlotPress,
  canManage,
  showTimeline = true,
}: Props) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = Colors[scheme];
  const scrollRef = useRef<ScrollView>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const today = useMemo(() => startOfDay(new Date()), []);
  const weekStart = useMemo(() => mondayOf(selectedDate), [selectedDate]);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );
  const gridHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;
  const now = new Date();
  const isToday = sameDay(selectedDate, today);
  const nowTop = ((now.getHours() - START_HOUR) * 60 + now.getMinutes()) / 60 * HOUR_HEIGHT;

  const dayAppointments = useMemo(() => {
    const visible = appointments.filter((item) => {
      if (!item.start || item.status === 'cancelled') return false;
      if (selectedStaffId && (typeof item.staff === 'object' ? item.staff?.id : item.staff) !== selectedStaffId) {
        return false;
      }
      return sameDay(new Date(item.start), selectedDate);
    });
    return layoutOverlaps(visible);
  }, [appointments, selectedDate, selectedStaffId]);

  useEffect(() => {
    const first = dayAppointments[0];
    let y = 0;
    if (isToday && nowTop > 0) y = nowTop - 120;
    else if (first) {
      const start = new Date(first.start);
      y = ((start.getHours() - START_HOUR) * 60 + start.getMinutes()) / 60 * HOUR_HEIGHT - 40;
    }
    scrollRef.current?.scrollTo({ y: Math.max(0, y), animated: false });
  }, [dayAppointments, isToday, nowTop, selectedDate]);

  const monthTitle = selectedDate
    .toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })
    .replace(/^./, (letter) => letter.toUpperCase());

  const onGridPress = (locationY: number) => {
    if (!canManage || !onEmptySlotPress) return;
    const total = START_HOUR * 60 + Math.round((locationY / HOUR_HEIGHT) * 60 / 15) * 15;
    const clamped = Math.min(END_HOUR * 60 - 15, Math.max(START_HOUR * 60, total));
    onEmptySlotPress(localDateIso(selectedDate), minutesToTime(clamped));
  };

  return (
    <View style={[styles.wrap, !showTimeline && styles.wrapHeader, { backgroundColor: palette.background }]}>
      <View style={[styles.monthRow, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity style={styles.nav} onPress={() => onChangeDate(addDays(selectedDate, -7))}>
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onChangeDate(today)} style={styles.monthHit}>
          <Text style={[styles.monthTitle, { color: palette.text }]}>{monthTitle}</Text>
          {!isToday ? <Text style={styles.todayHint}>Dotknij, aby wrócić do dziś</Text> : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.nav} onPress={() => onChangeDate(addDays(selectedDate, 7))}>
          <Ionicons name="chevron-forward" size={22} color={palette.text} />
        </TouchableOpacity>
      </View>

      <View style={[styles.week, { backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        {days.map((day, index) => {
          const selected = sameDay(day, selectedDate);
          const todayMark = sameDay(day, today);
          const count = appointments.filter((item) => item.start && item.status !== 'cancelled' && sameDay(new Date(item.start), day)).length;
          return (
            <TouchableOpacity key={day.toISOString()} style={styles.dayCell} onPress={() => onChangeDate(day)}>
              <Text style={[styles.weekday, { color: selected ? Colors.light.accent : palette.textSecondary }]}>
                {WEEKDAYS[index]}
              </Text>
              <View style={[styles.dayBubble, selected && styles.dayBubbleOn, !selected && todayMark && styles.dayBubbleToday]}>
                <Text style={[styles.dayNum, { color: palette.text }, selected && styles.dayNumOn, !selected && todayMark && { color: Colors.light.accent }]}>
                  {day.getDate()}
                </Text>
              </View>
              {count ? <View style={[styles.dot, selected && styles.dotOn]} /> : <View style={styles.dotPlaceholder} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {staff.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.staffRow, { backgroundColor: palette.card, borderBottomColor: palette.border }]}
          contentContainerStyle={styles.staffContent}
        >
          <TouchableOpacity
            style={[styles.staffChip, !selectedStaffId && styles.staffChipOn]}
            onPress={() => onSelectStaff?.(null)}
          >
            <Text style={[styles.staffChipText, !selectedStaffId && styles.staffChipTextOn]}>Wszyscy</Text>
          </TouchableOpacity>
          {staff.map((member) => {
            const active = selectedStaffId === member.id;
            return (
              <TouchableOpacity
                key={member.id}
                style={[styles.staffChip, active && styles.staffChipOn]}
                onPress={() => onSelectStaff?.(member.id)}
              >
                <Text style={[styles.staffChipText, active && styles.staffChipTextOn]}>
                  {member.first_name || member.username}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {showTimeline ? <ScrollView
        ref={scrollRef}
        style={styles.timeline}
        contentContainerStyle={{ height: gridHeight + 40, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ height: gridHeight }} onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
          {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => (
            <View key={index} style={[styles.hourLine, { top: index * HOUR_HEIGHT, borderTopColor: palette.border }]}>
              <Text style={[styles.hourText, { color: palette.textSecondary }]}>
                {String(START_HOUR + index).padStart(2, '0')}:00
              </Text>
            </View>
          ))}

          <Pressable style={StyleSheet.absoluteFill} onPress={(event) => onGridPress(event.nativeEvent.locationY)} />

          {dayAppointments.map((item) => {
            const start = new Date(item.start);
            const end = new Date(item.end);
            const minutes = (start.getHours() - START_HOUR) * 60 + start.getMinutes();
            if (minutes < 0) return null;
            const duration = Math.max(25, (end.getTime() - start.getTime()) / 60000);
            const color = statusColor(item.status);
            const areaLeft = TIME_WIDTH + 6;
            const areaWidth = Math.max(160, gridWidth - areaLeft - 8);
            const colWidth = areaWidth / item.cols;
            const staffName = staffDisplayName(item.staff);
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                onPress={() => onAppointmentPress(item)}
                style={[
                  styles.event,
                  {
                    top: minutes / 60 * HOUR_HEIGHT + 3,
                    height: Math.max(48, duration / 60 * HOUR_HEIGHT - 6),
                    left: areaLeft + item.col * colWidth,
                    width: colWidth - 4,
                  },
                ]}
              >
                <View style={[styles.eventInner, { backgroundColor: color }]}>
                  <Text style={styles.eventTime}>
                    {start.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {end.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text style={styles.eventName} numberOfLines={1}>{appointmentClientName(item)}</Text>
                  <Text style={styles.eventMeta} numberOfLines={1}>
                    {item.service?.name || 'Wizyta'}
                    {staffName ? ` · ${staffName}` : ''}
                    {item.service?.price_amount ? ` · ${item.service.price_amount} zł` : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {isToday && nowTop > 0 && nowTop < gridHeight ? (
            <View pointerEvents="none" style={[styles.nowLine, { top: nowTop }]}>
              <View style={styles.nowDot} />
              <View style={styles.nowBar} />
            </View>
          ) : null}
        </View>
      </ScrollView> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  wrapHeader: { flex: 0, flexGrow: 0 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  nav: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthHit: { alignItems: 'center', flex: 1 },
  monthTitle: { fontSize: 17, fontWeight: '800' },
  todayHint: { marginTop: 2, fontSize: 11, color: Colors.light.accent, fontWeight: '700' },
  week: { flexDirection: 'row', paddingHorizontal: 6, paddingTop: 8, paddingBottom: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  dayCell: { flex: 1, alignItems: 'center', gap: 4 },
  weekday: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  dayBubble: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dayBubbleOn: { backgroundColor: Colors.light.accent },
  dayBubbleToday: { borderWidth: 1.5, borderColor: Colors.light.accent },
  dayNum: { fontSize: 15, fontWeight: '800' },
  dayNumOn: { color: '#fff' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.light.accent, opacity: 0.7 },
  dotOn: { backgroundColor: Colors.light.accent },
  dotPlaceholder: { width: 5, height: 5 },
  staffRow: { maxHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth },
  staffContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  staffChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffChipOn: { backgroundColor: Colors.light.accent },
  staffChipText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  staffChipTextOn: { color: '#fff' },
  timeline: { flex: 1 },
  hourLine: { position: 'absolute', left: 0, right: 0, height: HOUR_HEIGHT, borderTopWidth: StyleSheet.hairlineWidth },
  hourText: { width: TIME_WIDTH - 6, marginTop: -8, textAlign: 'right', fontSize: 11, fontWeight: '700' },
  event: { position: 'absolute', zIndex: 2 },
  eventInner: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center' },
  eventTime: { color: 'rgba(255,255,255,0.86)', fontSize: 11, fontWeight: '700' },
  eventName: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 1 },
  eventMeta: { color: 'rgba(255,255,255,0.88)', fontSize: 12, marginTop: 2, fontWeight: '600' },
  nowLine: { position: 'absolute', left: TIME_WIDTH - 8, right: 8, height: 2, zIndex: 3, flexDirection: 'row', alignItems: 'center' },
  nowDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', marginLeft: -4 },
  nowBar: { flex: 1, height: 2, backgroundColor: '#EF4444' },
});
