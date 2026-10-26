import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Appointment } from '../../types/api';
import { appointmentClientName, staffDisplayName } from '../../utils/staffName';
import Colors from '../../constants/Colors';

type WeekGroup = {
  key: string;
  label: string;
  appointments: Appointment[];
};

type MonthGroup = {
  key: string;
  label: string;
  count: number;
  weeks: WeekGroup[];
};

const startOfWeek = (value: Date) => {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date;
};

const monthLabel = (value: Date) => {
  const label = value.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const weekLabel = (start: Date) => {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}`;
};

const localDateKey = (value: Date) => {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

function groupCompleted(appointments: Appointment[]): MonthGroup[] {
  const sorted = [...appointments].sort(
    (left, right) => new Date(right.start || 0).getTime() - new Date(left.start || 0).getTime()
  );
  const months = new Map<string, Map<string, Appointment[]>>();

  sorted.forEach((item) => {
    const start = item.start ? new Date(item.start) : null;
    if (!start) return;
    const monthKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;
    const weekKey = localDateKey(startOfWeek(start));
    if (!months.has(monthKey)) months.set(monthKey, new Map());
    const weeks = months.get(monthKey)!;
    if (!weeks.has(weekKey)) weeks.set(weekKey, []);
    weeks.get(weekKey)!.push(item);
  });

  return Array.from(months.entries()).map(([monthKey, weeks]) => {
    const [year, month] = monthKey.split('-').map(Number);
    const sample = new Date(year, month - 1, 1);
    const weekGroups = Array.from(weeks.entries()).map(([weekKey, items]) => {
      const [weekYear, weekMonth, weekDay] = weekKey.split('-').map(Number);
      return {
        key: `${monthKey}-${weekKey}`,
        label: weekLabel(new Date(weekYear, weekMonth - 1, weekDay)),
        appointments: items,
      };
    });
    return {
      key: monthKey,
      label: monthLabel(sample),
      count: weekGroups.reduce((sum, week) => sum + week.appointments.length, 0),
      weeks: weekGroups,
    };
  });
}

type Props = {
  appointments: Appointment[];
  onAppointmentPress: (appointment: Appointment) => void;
};

export function CompletedAppointmentsList({ appointments, onAppointmentPress }: Props) {
  const groups = useMemo(() => groupCompleted(appointments), [appointments]);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>(() => (
    groups[0] ? { [groups[0].key]: true } : {}
  ));
  const [openWeeks, setOpenWeeks] = useState<Record<string, boolean>>(() => (
    groups[0]?.weeks[0] ? { [groups[0].weeks[0].key]: true } : {}
  ));

  const toggleMonth = (key: string) => {
    setOpenMonths((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleWeek = (key: string) => {
    setOpenWeeks((current) => ({ ...current, [key]: !current[key] }));
  };

  if (!groups.length) {
    return <Text style={styles.empty}>Brak zakończonych wizyt.</Text>;
  }

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {groups.map((month) => {
        const monthOpen = !!openMonths[month.key];
        return (
          <View key={month.key} style={styles.monthCard}>
            <TouchableOpacity style={styles.monthHeader} onPress={() => toggleMonth(month.key)}>
              <View>
                <Text style={styles.monthTitle}>{month.label}</Text>
                <Text style={styles.monthCount}>{month.count} wizyt</Text>
              </View>
              <Ionicons name={monthOpen ? 'chevron-up' : 'chevron-down'} size={20} color="#64748B" />
            </TouchableOpacity>
            {monthOpen ? month.weeks.map((week) => {
              const weekOpen = !!openWeeks[week.key];
              return (
                <View key={week.key} style={styles.weekBlock}>
                  <TouchableOpacity style={styles.weekHeader} onPress={() => toggleWeek(week.key)}>
                    <Text style={styles.weekTitle}>Tydzień {week.label}</Text>
                    <View style={styles.weekMeta}>
                      <Text style={styles.weekCount}>{week.appointments.length}</Text>
                      <Ionicons name={weekOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#94A3B8" />
                    </View>
                  </TouchableOpacity>
                  {weekOpen ? week.appointments.map((item) => {
                    const start = item.start ? new Date(item.start) : null;
                    const staff = staffDisplayName(item.staff);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.visit}
                        onPress={() => onAppointmentPress(item)}
                      >
                        <View style={styles.visitMain}>
                          <Text style={styles.visitClient}>{appointmentClientName(item)}</Text>
                          <Text style={styles.visitMeta}>
                            {item.service?.name || 'Wizyta'}
                            {staff ? ` · ${staff}` : ' · nieprzypisany'}
                          </Text>
                        </View>
                        <View style={styles.visitRight}>
                          <Text style={styles.visitWhen}>
                            {start?.toLocaleString('pl-PL', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </Text>
                          <Text style={styles.visitPrice}>{item.service?.price_amount || '0'} zł</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  }) : null}
                </View>
              );
            }) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, paddingBottom: 40 },
  empty: { textAlign: 'center', marginTop: 32, color: '#64748B', fontWeight: '600' },
  monthCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  monthTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
  monthCount: { marginTop: 2, fontSize: 12, color: '#64748B', fontWeight: '600' },
  weekBlock: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  weekHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekTitle: { fontSize: 13, fontWeight: '700', color: '#334155' },
  weekMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weekCount: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  visit: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#F1F5F9',
  },
  visitMain: { flex: 1 },
  visitClient: { fontWeight: '800', color: '#1E293B' },
  visitMeta: { marginTop: 4, fontSize: 12, color: '#64748B' },
  visitRight: { alignItems: 'flex-end' },
  visitWhen: { fontSize: 12, color: '#475569', fontWeight: '600' },
  visitPrice: { marginTop: 4, fontWeight: '800', color: Colors.light.accent },
});
