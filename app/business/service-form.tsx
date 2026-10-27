import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar } from 'react-native-calendars';
import {
  getMyServices,
  getServiceCategories,
  updateService,
  uploadService,
  UploadAsset,
} from '../../api/business';
import { Service, ServiceCategory } from '../../types/api';
import Colors from '../../constants/Colors';
import { useLocale } from '../../contexts/LocaleContext';
import { useLocation } from '../../contexts/LocationContext';
import { convertCurrency, resolveDualPrices } from '../../utils/currency';
import { formatApiError } from '../../utils/notify';
import { goBackToApp } from '../../utils/navigation';

const parseOptionalAmount = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
};

type OptionDraft = {
  key: string;
  id?: string;
  name: string;
  pricePln: string;
  priceEur: string;
  duration: string;
};

const newOptionDraft = (): OptionDraft => ({
  key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  name: '',
  pricePln: '',
  priceEur: '',
  duration: '',
});

export default function ServiceFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { activeLocation } = useLocation();
  const { t } = useLocale();
  const businessSlug = activeLocation?.slug;
  const editingId = id ? String(id) : null;

  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [existing, setExisting] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [pricePln, setPricePln] = useState('');
  const [priceEur, setPriceEur] = useState('');
  const [duration, setDuration] = useState('60');
  const [promoPricePln, setPromoPricePln] = useState('');
  const [promoPriceEur, setPromoPriceEur] = useState('');
  const [promoUntil, setPromoUntil] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const [imageAsset, setImageAsset] = useState<UploadAsset | null>(null);
  const [showPromoCalendar, setShowPromoCalendar] = useState(false);
  const [priceIsIndicative, setPriceIsIndicative] = useState(false);
  const [options, setOptions] = useState<OptionDraft[]>([]);

  const load = useCallback(async () => {
    if (!businessSlug) {
      setLoading(false);
      return;
    }
    try {
      const [categoryData, services] = await Promise.all([
        getServiceCategories(businessSlug),
        getMyServices(businessSlug),
      ]);
      setCategories(categoryData);
      if (editingId) {
        const match = services.find((item) => String(item.id) === editingId) || null;
        setExisting(match);
        if (match) {
          const dual = resolveDualPrices(
            match.price_amount == null ? null : Number(match.price_amount),
            match.price_amount_eur == null ? null : Number(match.price_amount_eur),
          );
          const promoDual = resolveDualPrices(
            match.promotional_price_amount == null ? null : Number(match.promotional_price_amount),
            match.promotional_price_amount_eur == null ? null : Number(match.promotional_price_amount_eur),
          );
          setName(match.name);
          setDescription(match.description || '');
          setPricePln(dual.pln == null ? '' : String(dual.pln));
          setPriceEur(dual.eur == null ? '' : String(dual.eur));
          setDuration(String(match.duration_minutes));
          setPromoPricePln(promoDual.pln == null ? '' : String(promoDual.pln));
          setPromoPriceEur(promoDual.eur == null ? '' : String(promoDual.eur));
          setPromoUntil(match.promotion_valid_until || '');
          setPriceIsIndicative(Boolean(match.price_is_indicative));
          setSelectedCategoryId(match.category?.id);
          setOptions(
            (match.options || [])
              .filter((item) => item.is_active !== false)
              .map((item, index) => {
                const optionDual = resolveDualPrices(
                  item.price_amount == null ? null : Number(item.price_amount),
                  item.price_amount_eur == null ? null : Number(item.price_amount_eur),
                );
                return {
                  key: item.id || `opt-${index}`,
                  id: item.id,
                  name: item.name || '',
                  pricePln: optionDual.pln == null ? '' : String(optionDual.pln),
                  priceEur: optionDual.eur == null ? '' : String(optionDual.eur),
                  duration: item.duration_minutes ? String(item.duration_minutes) : '',
                };
              }),
          );
        }
      }
    } finally {
      setLoading(false);
    }
  }, [businessSlug, editingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Brak dostępu', 'Zezwól aplikacji na dostęp do zdjęć.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled) setImageAsset(result.assets[0]);
  };

  const fillMissingFromPln = () => {
    const pln = parseOptionalAmount(pricePln);
    if (pln == null || Number.isNaN(pln) || priceEur.trim()) return;
    setPriceEur(String(convertCurrency(pln, 'PLN', 'EUR')));
  };

  const fillMissingFromEur = () => {
    const eur = parseOptionalAmount(priceEur);
    if (eur == null || Number.isNaN(eur) || pricePln.trim()) return;
    setPricePln(String(convertCurrency(eur, 'EUR', 'PLN')));
  };

  const updateOption = (key: string, patch: Partial<OptionDraft>) => {
    setOptions((current) =>
      current.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const handleSave = async () => {
    if (!name || !duration || (!pricePln.trim() && !priceEur.trim())) {
      Alert.alert('Brak danych', 'Wypełnij nazwę, czas trwania oraz cenę w PLN lub EUR.');
      return;
    }
    if (!businessSlug) {
      Alert.alert('Błąd', 'Nie masz przypisanego salonu do tego konta.');
      return;
    }
    const formattedPricePln = parseOptionalAmount(pricePln);
    const formattedPriceEur = parseOptionalAmount(priceEur);
    const formattedPromoPln = parseOptionalAmount(promoPricePln);
    const formattedPromoEur = parseOptionalAmount(promoPriceEur);

    if (formattedPricePln !== null && Number.isNaN(formattedPricePln)) {
      Alert.alert('Błąd', 'Cena PLN musi być poprawną liczbą.');
      return;
    }
    if (formattedPriceEur !== null && Number.isNaN(formattedPriceEur)) {
      Alert.alert('Błąd', 'Cena EUR musi być poprawną liczbą.');
      return;
    }
    if (formattedPromoPln !== null && Number.isNaN(formattedPromoPln)) {
      Alert.alert('Błąd', 'Cena promocyjna PLN musi być poprawną liczbą.');
      return;
    }
    if (formattedPromoEur !== null && Number.isNaN(formattedPromoEur)) {
      Alert.alert('Błąd', 'Cena promocyjna EUR musi być poprawną liczbą.');
      return;
    }

    const preparedOptions = [];
    for (const [index, option] of options.entries()) {
      if (!option.name.trim() && !option.pricePln.trim() && !option.priceEur.trim()) continue;
      if (!option.name.trim()) {
        Alert.alert('Wariant', 'Każdy wariant musi mieć nazwę (np. cała twarz).');
        return;
      }
      const optPln = parseOptionalAmount(option.pricePln);
      const optEur = parseOptionalAmount(option.priceEur);
      if ((optPln == null && optEur == null) || Number.isNaN(optPln) || Number.isNaN(optEur)) {
        Alert.alert('Wariant', `Podaj cenę dla wariantu „${option.name.trim()}”.`);
        return;
      }
      const optDual = resolveDualPrices(optPln, optEur);
      const optDuration = option.duration.trim()
        ? parseInt(option.duration, 10)
        : null;
      if (option.duration.trim() && (!optDuration || Number.isNaN(optDuration))) {
        Alert.alert('Wariant', `Czas trwania wariantu „${option.name.trim()}” jest nieprawidłowy.`);
        return;
      }
      preparedOptions.push({
        id: option.id,
        name: option.name.trim(),
        price_amount: optDual.pln,
        price_amount_eur: optDual.eur,
        duration_minutes: optDuration,
        sort_order: index,
        is_active: true,
      });
    }

    const dual = resolveDualPrices(formattedPricePln, formattedPriceEur);
    try {
      setSubmitting(true);
      const serviceData = {
        name: name.trim(),
        description: description.trim() || '',
        price_amount: dual.pln as number,
        price_amount_eur: dual.eur ?? undefined,
        duration_minutes: parseInt(duration, 10) || 60,
        category_id: selectedCategoryId || null,
        promotional_price_amount: formattedPromoPln,
        promotional_price_amount_eur: formattedPromoEur,
        promotion_valid_until: promoUntil || null,
        price_is_indicative: priceIsIndicative,
        options: preparedOptions,
      };
      if (editingId) {
        await updateService(businessSlug, editingId, serviceData, imageAsset || undefined);
      } else {
        await uploadService(businessSlug, serviceData, imageAsset || undefined);
      }
      Alert.alert('Sukces', editingId ? 'Zmiany usługi zostały zapisane.' : 'Usługa została dodana.', [
        { text: 'OK', onPress: () => goBackToApp(router) },
      ]);
    } catch (e: any) {
      Alert.alert('Nie udało się zapisać usługi', formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackToApp(router)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{editingId ? t('service.form.edit') : t('service.form.new')}</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.light.accent} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.formCard}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('service.form.name')}</Text>
              <TextInput style={styles.input} placeholder="np. Laser pikosekundowy — przebarwienia" value={name} onChangeText={setName} />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('service.form.description')}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={t('service.form.descriptionPlaceholder')}
                value={description}
                onChangeText={setDescription}
                multiline
                textAlignVertical="top"
              />
              <Text style={styles.hint}>{t('service.form.descriptionHint')}</Text>
            </View>

            <Text style={styles.inputLabel}>{t('service.form.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorList}>
              <TouchableOpacity
                style={[styles.selectorChip, !selectedCategoryId && styles.selectorChipActive]}
                onPress={() => setSelectedCategoryId(undefined)}
              >
                <Text style={[styles.selectorText, !selectedCategoryId && styles.selectorTextActive]}>{t('service.form.noCategory')}</Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.selectorChip, selectedCategoryId === category.id && styles.selectorChipActive]}
                  onPress={() => setSelectedCategoryId(category.id)}
                >
                  <Text style={[styles.selectorText, selectedCategoryId === category.id && styles.selectorTextActive]}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>{t('service.form.image')}</Text>
            <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
              {imageAsset || existing?.image_url ? (
                <Image source={{ uri: imageAsset?.uri || existing?.image_url }} style={styles.imagePreview} contentFit="cover" />
              ) : (
                <>
                  <Ionicons name="image-outline" size={26} color={Colors.light.accent} />
                  <Text style={styles.imagePickerText}>{t('service.form.pickImage')}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('service.form.pricePln')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={pricePln}
                  onChangeText={setPricePln}
                  onBlur={fillMissingFromPln}
                />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('service.form.priceEur')}</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={priceEur}
                  onChangeText={setPriceEur}
                  onBlur={fillMissingFromEur}
                />
              </View>
            </View>
            <Text style={styles.hint}>
              {options.length
                ? t('service.form.priceHintWithOptions')
                : t('service.form.priceHint')}
            </Text>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.switchTitle}>{t('service.form.indicativePrice')}</Text>
                <Text style={styles.switchHint}>{t('service.form.indicativePriceHint')}</Text>
              </View>
              <Switch
                value={priceIsIndicative}
                onValueChange={setPriceIsIndicative}
                trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                thumbColor={priceIsIndicative ? Colors.light.accent : '#f4f3f4'}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('service.form.duration')}</Text>
              <TextInput style={styles.input} placeholder="60" keyboardType="numeric" value={duration} onChangeText={setDuration} />
            </View>

            <View style={styles.optionsHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>{t('service.form.options')}</Text>
                <Text style={styles.hint}>{t('service.form.optionsHint')}</Text>
              </View>
              <TouchableOpacity style={styles.addOptionBtn} onPress={() => setOptions((current) => [...current, newOptionDraft()])}>
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addOptionText}>{t('service.form.addOption')}</Text>
              </TouchableOpacity>
            </View>

            {options.map((option, index) => (
              <View key={option.key} style={styles.optionCard}>
                <View style={styles.optionTop}>
                  <Text style={styles.optionTitle}>{t('service.form.optionN', undefined, { n: index + 1 })}</Text>
                  <TouchableOpacity
                    onPress={() => setOptions((current) => current.filter((item) => item.key !== option.key))}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder={t('service.form.optionNamePlaceholder')}
                  value={option.name}
                  onChangeText={(value) => updateOption(option.key, { name: value })}
                />
                <View style={[styles.row, { marginTop: 10 }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('service.form.pricePln')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={option.pricePln}
                      onChangeText={(value) => updateOption(option.key, { pricePln: value })}
                      onBlur={() => {
                        const pln = parseOptionalAmount(option.pricePln);
                        if (pln == null || Number.isNaN(pln) || option.priceEur.trim()) return;
                        updateOption(option.key, { priceEur: String(convertCurrency(pln, 'PLN', 'EUR')) });
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>{t('service.form.priceEur')}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0"
                      keyboardType="numeric"
                      value={option.priceEur}
                      onChangeText={(value) => updateOption(option.key, { priceEur: value })}
                      onBlur={() => {
                        const eur = parseOptionalAmount(option.priceEur);
                        if (eur == null || Number.isNaN(eur) || option.pricePln.trim()) return;
                        updateOption(option.key, { pricePln: String(convertCurrency(eur, 'EUR', 'PLN')) });
                      }}
                    />
                  </View>
                </View>
                <View style={[styles.inputWrapper, { marginTop: 10, marginBottom: 0 }]}>
                  <Text style={styles.inputLabel}>{t('service.form.optionDuration')}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={t('service.form.optionDurationPlaceholder')}
                    keyboardType="numeric"
                    value={option.duration}
                    onChangeText={(value) => updateOption(option.key, { duration: value })}
                  />
                </View>
              </View>
            ))}

            <View style={styles.row}>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('service.form.promo')}</Text>
                <TextInput style={styles.input} placeholder="Opcjonalnie" keyboardType="numeric" value={promoPricePln} onChangeText={setPromoPricePln} />
              </View>
              <View style={[styles.inputWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>{t('service.form.promoEur')}</Text>
                <TextInput style={styles.input} placeholder="Opcjonalnie" keyboardType="numeric" value={promoPriceEur} onChangeText={setPromoPriceEur} />
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('service.form.promoUntil')}</Text>
              <TouchableOpacity style={[styles.input, styles.dateButton]} onPress={() => setShowPromoCalendar(true)}>
                <Text style={promoUntil ? styles.dateValue : styles.datePlaceholder}>
                  {promoUntil ? new Date(`${promoUntil}T12:00:00`).toLocaleDateString('pl-PL') : t('service.form.pickDate')}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={Colors.light.accent} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.addBtn, submitting && styles.addBtnDisabled]} onPress={handleSave} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={editingId ? 'save-outline' : 'add-circle-outline'} size={20} color="#fff" />
                  <Text style={styles.addBtnText}>{editingId ? t('service.form.save') : t('service.form.add')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {showPromoCalendar ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowPromoCalendar(false)}>
          <View style={styles.calendarOverlay}>
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>{t('service.form.promoUntil')}</Text>
                <TouchableOpacity onPress={() => setShowPromoCalendar(false)}>
                  <Ionicons name="close" size={24} color={Colors.light.text} />
                </TouchableOpacity>
              </View>
              <Calendar
                minDate={new Date().toISOString().slice(0, 10)}
                markedDates={promoUntil ? { [promoUntil]: { selected: true, selectedColor: Colors.light.accent } } : {}}
                onDayPress={(day) => {
                  setPromoUntil(day.dateString);
                  setShowPromoCalendar(false);
                }}
                theme={{ todayTextColor: Colors.light.accent, arrowColor: Colors.light.accent }}
              />
              {promoUntil ? (
                <TouchableOpacity style={styles.clearDateButton} onPress={() => { setPromoUntil(''); setShowPromoCalendar(false); }}>
                  <Text style={styles.clearDateText}>Usuń datę zakończenia</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </Modal>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  scrollContent: { padding: 20, paddingBottom: 100 },
  formCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  inputWrapper: { marginBottom: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: Colors.light.textSecondary, marginBottom: 6, marginLeft: 4, textTransform: 'uppercase' },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
  hint: { fontSize: 12, color: '#64748B', marginTop: -4, marginBottom: 12, lineHeight: 17 },
  input: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 16, height: 50, borderRadius: 14, fontSize: 15,
    color: Colors.light.text, borderWidth: 1, borderColor: 'transparent',
  },
  textArea: { height: 96, paddingTop: 12, paddingBottom: 12 },
  selectorList: { gap: 8, paddingBottom: 16 },
  selectorChip: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 18, backgroundColor: '#F1F5F9' },
  selectorChipActive: { backgroundColor: '#EDE9FE', borderWidth: 1, borderColor: Colors.light.accent },
  selectorText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  selectorTextActive: { color: Colors.light.accent },
  imagePicker: {
    height: 100, marginBottom: 12, borderRadius: 14, borderStyle: 'dashed', borderWidth: 1,
    borderColor: '#C4B5FD', backgroundColor: '#FAF5FF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { color: Colors.light.accent, fontWeight: '800', marginTop: 6 },
  dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateValue: { color: Colors.light.text, fontSize: 15 },
  datePlaceholder: { color: '#94A3B8', fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
  switchTitle: { fontSize: 14, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
  switchHint: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  optionsHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, marginBottom: 8 },
  addOptionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.light.accent,
    height: 36, paddingHorizontal: 12, borderRadius: 12,
  },
  addOptionText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  optionCard: {
    backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  optionTitle: { fontWeight: '800', color: '#334155', fontSize: 13 },
  addBtn: {
    flexDirection: 'row', backgroundColor: Colors.light.accent, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginTop: 8, gap: 8,
  },
  addBtnDisabled: { opacity: 0.7 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  calendarOverlay: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(15,23,42,0.55)' },
  calendarCard: { borderRadius: 20, padding: 16, backgroundColor: '#fff', overflow: 'hidden' },
  calendarHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  calendarTitle: { color: Colors.light.text, fontSize: 17, fontWeight: '800' },
  clearDateButton: { alignItems: 'center', paddingVertical: 13 },
  clearDateText: { color: '#DC2626', fontWeight: '700' },
});
