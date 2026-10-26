import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

import { createManualAppointment } from '../../api/appointments';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { BusinessStaff, Service } from '../../types/api';
import { useLocale } from '../../contexts/LocaleContext';
import { localizedName } from '../../utils/localized';
import { notify } from '../../utils/notify';

type Props = {
  visible: boolean;
  slug: string;
  services: Service[];
  staff: BusinessStaff[];
  onClose: () => void;
  onCreated: () => void;
  initialDate?: string;
  initialTime?: string;
  initialStaffId?: string;
};

const HOURS = Array.from({ length: 15 }, (_, index) => String(7 + index).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const todayIso = () => {
  const value = new Date();
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
};

const splitTime = (value?: string) => {
  const [hour = '10', minute = '00'] = (value || '10:00').split(':');
  return {
    hour: HOURS.includes(hour) ? hour : '10',
    minute: MINUTES.includes(minute) ? minute : '00',
  };
};

export function ManualAppointmentModal({
  visible,
  slug,
  services = [],
  staff = [],
  onClose,
  onCreated,
  initialDate,
  initialTime,
  initialStaffId,
}: Props) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = Colors[scheme];
  const { language } = useLocale();
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState<string | undefined>();
  const [guestName, setGuestName] = useState('');
  const [date, setDate] = useState(todayIso());
  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
  const [source, setSource] = useState<'phone' | 'walk_in'>('phone');
  const [saving, setSaving] = useState(false);
  const [serviceQuery, setServiceQuery] = useState('');
  const [showServices, setShowServices] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDate(initialDate || todayIso());
    const next = splitTime(initialTime);
    setHour(next.hour);
    setMinute(next.minute);
    setStaffId(initialStaffId);
    setServiceQuery('');
    setShowServices(false);
    setShowCalendar(false);
    if (services.length) setServiceId((current) => current || services[0].id);
  }, [initialDate, initialStaffId, initialTime, services, visible]);

  const selectedService = services.find((item) => item.id === serviceId);
  const selectedStaff = staff.find((item) => item.id === staffId);
  const time = `${hour}:${minute}`;
  const dateLabel = useMemo(() => {
    const value = new Date(`${date}T12:00:00`);
    return value.toLocaleDateString('pl-PL', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    });
  }, [date]);

  const filteredServices = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    if (!query) return services;
    return services.filter((item) => item.name.toLowerCase().includes(query));
  }, [serviceQuery, services]);

  const markedDates = useMemo(
    () => ({ [date]: { selected: true, selectedColor: Colors.light.accent } }),
    [date],
  );

  const nudgeHour = (delta: number) => {
    const index = HOURS.indexOf(hour);
    const next = HOURS[(index + delta + HOURS.length) % HOURS.length];
    setHour(next);
  };

  const nudgeMinute = (delta: number) => {
    const index = MINUTES.indexOf(minute);
    const next = MINUTES[(index + delta + MINUTES.length) % MINUTES.length];
    setMinute(next);
  };

  const save = async () => {
    if (!serviceId || !guestName.trim() || !date || !time) {
      notify('Uzupełnij dane', 'Wybierz usługę, klienta, datę oraz godzinę.');
      return;
    }
    try {
      setSaving(true);
      await createManualAppointment(slug, {
        service_id: serviceId,
        guest_name: guestName.trim(),
        date,
        start_time: `${time}:00`,
        source,
        staff_id: staffId,
      });
      setGuestName('');
      onCreated();
      onClose();
    } catch (error: any) {
      notify(
        'Nie udało się dodać wizyty',
        error?.response?.data?.error?.message
          || error?.response?.data?.start_time?.[0]
          || error?.response?.data?.detail
          || 'Sprawdź termin i spróbuj inną godzinę.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: palette.card }]}>
          <View style={[styles.header, { borderBottomColor: palette.border }]}>
            <View>
              <Text style={[styles.title, { color: palette.text }]}>Nowa wizyta</Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>Dodaj do grafiku poza aplikacją</Text>
            </View>
            <TouchableOpacity style={styles.close} onPress={onClose}>
              <Ionicons name="close" size={22} color={palette.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.sourceRow}>
              {([
                { value: 'phone' as const, label: 'Telefon', icon: 'call-outline' as const },
                { value: 'walk_in' as const, label: 'Osobiście', icon: 'walk-outline' as const },
              ]).map((item) => {
                const active = source === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.sourceChip, active && styles.sourceChipOn]}
                    onPress={() => setSource(item.value)}
                  >
                    <Ionicons name={item.icon} size={14} color={active ? '#fff' : Colors.light.accent} />
                    <Text style={[styles.sourceText, active && styles.sourceTextOn]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: palette.textSecondary }]}>Usługa</Text>
            <TouchableOpacity
              style={[styles.selector, { borderColor: palette.border, backgroundColor: palette.background }]}
              onPress={() => setShowServices((current) => !current)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectorValue, { color: palette.text }]}>
                  {selectedService ? localizedName(selectedService, language) : 'Wybierz usługę'}
                </Text>
                {selectedService?.price_amount ? (
                  <Text style={[styles.selectorHint, { color: palette.textSecondary }]}>
                    {selectedService.duration_minutes} min · {selectedService.price_amount} zł
                  </Text>
                ) : null}
              </View>
              <Ionicons name={showServices ? 'chevron-up' : 'chevron-down'} size={18} color={palette.textSecondary} />
            </TouchableOpacity>
            {showServices ? (
              <View style={[styles.dropdown, { borderColor: palette.border, backgroundColor: palette.card }]}>
                <TextInput
                  style={[styles.search, { color: palette.text, borderColor: palette.border, backgroundColor: palette.background }]}
                  placeholder="Szukaj usługi…"
                  placeholderTextColor={palette.textSecondary}
                  value={serviceQuery}
                  onChangeText={setServiceQuery}
                  autoCorrect={false}
                />
                <ScrollView style={styles.dropdownList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {filteredServices.length ? filteredServices.map((service) => {
                    const active = service.id === serviceId;
                    return (
                      <TouchableOpacity
                        key={service.id}
                        style={[styles.dropdownItem, active && styles.dropdownItemOn]}
                        onPress={() => {
                          setServiceId(service.id);
                          setShowServices(false);
                          setServiceQuery('');
                        }}
                      >
                        <Text style={[styles.dropdownTitle, { color: palette.text }, active && styles.dropdownTitleOn]}>
                          {localizedName(service, language)}
                        </Text>
                        <Text style={[styles.dropdownMeta, active && styles.dropdownMetaOn]}>
                          {service.duration_minutes} min · {service.price_amount || '0'} zł
                        </Text>
                      </TouchableOpacity>
                    );
                  }) : (
                    <Text style={[styles.empty, { color: palette.textSecondary }]}>Brak usług dla tego wyszukiwania.</Text>
                  )}
                </ScrollView>
              </View>
            ) : null}

            {staff.length ? (
              <>
                <Text style={[styles.label, { color: palette.textSecondary }]}>Pracownik</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  <TouchableOpacity
                    style={[styles.chip, { borderColor: palette.border }, !staffId && styles.chipActive]}
                    onPress={() => setStaffId(undefined)}
                  >
                    <Text style={[styles.chipText, { color: palette.text }, !staffId && styles.chipTextActive]}>Dowolny</Text>
                  </TouchableOpacity>
                  {staff.map((member) => (
                    <TouchableOpacity
                      key={member.id}
                      style={[styles.chip, { borderColor: palette.border }, staffId === member.id && styles.chipActive]}
                      onPress={() => setStaffId(member.id)}
                    >
                      <Text style={[styles.chipText, { color: palette.text }, staffId === member.id && styles.chipTextActive]}>
                        {member.first_name || member.username}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : null}

            <Text style={[styles.label, { color: palette.textSecondary }]}>Klient</Text>
            <TextInput
              style={[styles.input, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
              placeholder="Imię i nazwisko"
              placeholderTextColor={palette.textSecondary}
              value={guestName}
              onChangeText={setGuestName}
              returnKeyType="done"
            />

            <Text style={[styles.label, { color: palette.textSecondary }]}>Termin</Text>
            <View style={styles.whenRow}>
              <TouchableOpacity
                style={[styles.whenCard, { borderColor: palette.border, backgroundColor: palette.background }]}
                onPress={() => setShowCalendar((current) => !current)}
              >
                <Ionicons name="calendar-outline" size={18} color={Colors.light.accent} />
                <View>
                  <Text style={[styles.whenLabel, { color: palette.textSecondary }]}>Data</Text>
                  <Text style={[styles.whenValue, { color: palette.text }]}>{dateLabel}</Text>
                </View>
              </TouchableOpacity>

              <View style={[styles.timeCard, { borderColor: palette.border, backgroundColor: palette.background }]}>
                <View style={styles.timeCol}>
                  <Pressable style={styles.stepBtn} onPress={() => nudgeHour(1)}>
                    <Ionicons name="chevron-up" size={18} color={Colors.light.accent} />
                  </Pressable>
                  <Text style={[styles.timeValue, { color: palette.text }]}>{hour}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => nudgeHour(-1)}>
                    <Ionicons name="chevron-down" size={18} color={Colors.light.accent} />
                  </Pressable>
                </View>
                <Text style={[styles.timeColon, { color: palette.text }]}>:</Text>
                <View style={styles.timeCol}>
                  <Pressable style={styles.stepBtn} onPress={() => nudgeMinute(1)}>
                    <Ionicons name="chevron-up" size={18} color={Colors.light.accent} />
                  </Pressable>
                  <Text style={[styles.timeValue, { color: palette.text }]}>{minute}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => nudgeMinute(-1)}>
                    <Ionicons name="chevron-down" size={18} color={Colors.light.accent} />
                  </Pressable>
                </View>
              </View>
            </View>

            {showCalendar ? (
              <View style={[styles.calendarWrap, { borderColor: palette.border }]}>
                <Calendar
                  current={date}
                  markedDates={markedDates}
                  onDayPress={(day) => {
                    setDate(day.dateString);
                    setShowCalendar(false);
                  }}
                  theme={{ todayTextColor: Colors.light.accent, arrowColor: Colors.light.accent }}
                />
              </View>
            ) : null}

            {(selectedService || selectedStaff) ? (
              <Text style={[styles.summary, { color: palette.textSecondary }]}>
                {selectedService ? localizedName(selectedService, language) : 'Usługa'}
                {selectedStaff ? ` · ${selectedStaff.first_name || selectedStaff.username}` : ''}
                {` · ${dateLabel} ${time}`}
              </Text>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: palette.border }]}>
            <TouchableOpacity style={[styles.save, saving && styles.disabled]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Dodaj do grafiku</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(15,23,42,0.55)' },
  modal: {
    maxHeight: '92%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    ...Platform.select({ web: { width: '100%', maxWidth: 620, alignSelf: 'center' } }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 20, fontWeight: '900' },
  subtitle: { fontSize: 12, marginTop: 3 },
  close: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20, paddingBottom: 28 },
  sourceRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  sourceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
  },
  sourceChipOn: { backgroundColor: Colors.light.accent },
  sourceText: { fontSize: 13, fontWeight: '700', color: Colors.light.accent },
  sourceTextOn: { color: '#fff' },
  label: { fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 14, textTransform: 'uppercase' },
  selector: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorValue: { fontSize: 15, fontWeight: '700' },
  selectorHint: { fontSize: 12, marginTop: 2 },
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  search: {
    height: 44,
    borderBottomWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  dropdownList: { maxHeight: 220 },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  dropdownItemOn: { backgroundColor: '#F5F3FF' },
  dropdownTitle: { fontSize: 14, fontWeight: '700' },
  dropdownTitleOn: { color: Colors.light.accent },
  dropdownMeta: { marginTop: 2, fontSize: 12, color: '#64748B' },
  dropdownMetaOn: { color: '#7C3AED' },
  empty: { padding: 14, fontSize: 13 },
  chips: { gap: 8, paddingBottom: 2 },
  chip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
  chipText: { fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: '#fff' },
  input: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  whenRow: { flexDirection: 'row', gap: 10 },
  whenCard: {
    flex: 1.15,
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  whenLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  whenValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  timeCard: {
    flex: 1,
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  timeCol: { alignItems: 'center', minWidth: 44 },
  stepBtn: { width: 36, height: 28, alignItems: 'center', justifyContent: 'center' },
  timeValue: { fontSize: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timeColon: { fontSize: 22, fontWeight: '900', marginBottom: 2 },
  calendarWrap: { marginTop: 10, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  summary: { marginTop: 14, fontSize: 12, lineHeight: 18 },
  footer: { padding: 18, borderTopWidth: StyleSheet.hairlineWidth },
  save: { height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.accent },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  disabled: { opacity: 0.6 },
});
