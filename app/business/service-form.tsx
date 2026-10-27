import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, Dimensions,
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
import AppSwitch from '../../components/ui/AppSwitch';
import { useLocale } from '../../contexts/LocaleContext';
import { useLocation } from '../../contexts/LocationContext';
import { convertCurrency, resolveDualPrices } from '../../utils/currency';
import { formatApiError, notify } from '../../utils/notify';
import { goBackToApp } from '../../utils/navigation';

const IMAGE_PICKER_SIZE = Math.min(
  Dimensions.get('window').width - 72,
  Dimensions.get('window').height * 0.35,
);

const parseOptionalAmount = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = parseFloat(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : NaN;
};

type PricingMode = 'simple' | 'variants';

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
  const [imageBroken, setImageBroken] = useState(false);
  const [imageDragOver, setImageDragOver] = useState(false);
  const [showPromoCalendar, setShowPromoCalendar] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [priceIsIndicative, setPriceIsIndicative] = useState(false);
  const [pricingMode, setPricingMode] = useState<PricingMode>('simple');
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const previewUri = imageAsset?.uri || existing?.image_url || null;
  const showImagePreview = Boolean(previewUri) && !imageBroken;

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
          const loadedOptions = (match.options || [])
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
            });
          // Need ≥2 options to treat as variants; a lone leftover option stays simple.
          const withVariants = loadedOptions.length >= 2;
          setPricingMode(withVariants ? 'variants' : 'simple');
          setOptions(withVariants ? loadedOptions : []);
          if (withVariants) {
            // Variant services have no base price — amounts live on options only.
            setPricePln('');
            setPriceEur('');
            setPromoPricePln('');
            setPromoPriceEur('');
            setPromoUntil('');
          } else if (
            dual.pln == null
            && dual.eur == null
            && !Boolean(match.price_is_indicative)
          ) {
            // Incomplete legacy rows (no price, not marked indicative) — allow edit/save.
            setPriceIsIndicative(true);
          }
        } else {
          notify('Błąd', 'Nie znaleziono tej usługi na liście cennika.');
        }
      }
    } finally {
      setLoading(false);
    }
  }, [businessSlug, editingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      notify('Zdjęcie', 'Wybierz plik JPG, PNG lub WebP.');
      return;
    }
    setImageBroken(false);
    setImageAsset({
      uri: URL.createObjectURL(file),
      fileName: file.name,
      mimeType: file.type || 'image/jpeg',
    });
  };

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Brak dostępu', 'Zezwól aplikacji na dostęp do zdjęć.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setImageBroken(false);
      setImageAsset(result.assets[0]);
    }
  };

  const webDropProps = useMemo(() => {
    if (Platform.OS !== 'web') return {};
    return {
      onDragEnter: (event: any) => {
        event.preventDefault?.();
        setImageDragOver(true);
      },
      onDragOver: (event: any) => {
        event.preventDefault?.();
        setImageDragOver(true);
      },
      onDragLeave: (event: any) => {
        event.preventDefault?.();
        setImageDragOver(false);
      },
      onDrop: (event: any) => {
        event.preventDefault?.();
        setImageDragOver(false);
        const file = event?.dataTransfer?.files?.[0] as File | undefined;
        if (file) applyImageFile(file);
      },
    } as Record<string, unknown>;
  }, []);

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

  const withVariants = pricingMode === 'variants';
  const hasEnteredPrice = withVariants
    ? options.some((option) => option.pricePln.trim() || option.priceEur.trim())
    : Boolean(pricePln.trim() || priceEur.trim());
  const individuallyPriced = priceIsIndicative && !hasEnteredPrice;
  const showPriceFields = !individuallyPriced;

  const setMode = (mode: PricingMode) => {
    if (mode === pricingMode) return;
    setPricingMode(mode);
    if (mode === 'variants') {
      setPricePln('');
      setPriceEur('');
      setPromoPricePln('');
      setPromoPriceEur('');
      setPromoUntil('');
      setOptions((current) => (current.length ? current : [newOptionDraft(), newOptionDraft()]));
      return;
    }
    setOptions([]);
  };

  const handleToggleIndicative = (value: boolean) => {
    setPriceIsIndicative(value);
    if (value && !hasEnteredPrice) {
      setPromoPricePln('');
      setPromoPriceEur('');
      setPromoUntil('');
    }
  };

  const enableIndividuallyPriced = () => {
    setPricePln('');
    setPriceEur('');
    setPromoPricePln('');
    setPromoPriceEur('');
    setPromoUntil('');
    setOptions((current) =>
      current.map((option) => ({ ...option, pricePln: '', priceEur: '' })),
    );
    setPriceIsIndicative(true);
  };

  const handleSave = async () => {
    if (!name || !duration) {
      notify('Brak danych', 'Wypełnij nazwę oraz czas trwania.');
      return;
    }
    if (!businessSlug) {
      notify('Błąd', 'Nie masz przypisanego salonu do tego konta.');
      return;
    }

    if (!withVariants) {
      if (!individuallyPriced && !pricePln.trim() && !priceEur.trim()) {
        notify('Brak danych', 'Wpisz cenę albo włącz „Wyceniane indywidualnie”.');
        return;
      }
    }

    const formattedPricePln = withVariants || individuallyPriced ? null : parseOptionalAmount(pricePln);
    const formattedPriceEur = withVariants || individuallyPriced ? null : parseOptionalAmount(priceEur);
    const formattedPromoPln = withVariants || individuallyPriced ? null : parseOptionalAmount(promoPricePln);
    const formattedPromoEur = withVariants || individuallyPriced ? null : parseOptionalAmount(promoPriceEur);

    if (formattedPricePln !== null && Number.isNaN(formattedPricePln)) {
      notify('Błąd', 'Cena PLN musi być poprawną liczbą.');
      return;
    }
    if (formattedPriceEur !== null && Number.isNaN(formattedPriceEur)) {
      notify('Błąd', 'Cena EUR musi być poprawną liczbą.');
      return;
    }
    if (formattedPromoPln !== null && Number.isNaN(formattedPromoPln)) {
      notify('Błąd', 'Cena promocyjna PLN musi być poprawną liczbą.');
      return;
    }
    if (formattedPromoEur !== null && Number.isNaN(formattedPromoEur)) {
      notify('Błąd', 'Cena promocyjna EUR musi być poprawną liczbą.');
      return;
    }

    const preparedOptions = [];
    if (withVariants) {
      for (const [index, option] of options.entries()) {
        if (!option.name.trim() && !option.pricePln.trim() && !option.priceEur.trim() && !option.duration.trim()) {
          continue;
        }
        if (!option.name.trim()) {
          notify('Wariant', 'Każdy wariant musi mieć nazwę (np. cała twarz).');
          return;
        }
        const optPln = individuallyPriced ? null : parseOptionalAmount(option.pricePln);
        const optEur = individuallyPriced ? null : parseOptionalAmount(option.priceEur);
        const missingPrice = optPln == null && optEur == null;
        const invalidPrice = (optPln != null && Number.isNaN(optPln))
          || (optEur != null && Number.isNaN(optEur));
        if (!individuallyPriced && (missingPrice || invalidPrice)) {
          notify('Wariant', `Podaj cenę dla wariantu „${option.name.trim()}”.`);
          return;
        }
        const optDual = individuallyPriced
          ? { pln: null, eur: null }
          : resolveDualPrices(optPln, optEur);
        const optDuration = option.duration.trim()
          ? parseInt(option.duration, 10)
          : null;
        if (option.duration.trim() && (!optDuration || Number.isNaN(optDuration))) {
          notify('Wariant', `Czas trwania wariantu „${option.name.trim()}” jest nieprawidłowy.`);
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
      if (preparedOptions.length < 2) {
        notify('Warianty', 'Dodaj co najmniej 2 warianty albo wybierz „Jedna usługa”.');
        return;
      }
    }

    const dual = withVariants || individuallyPriced
      ? { pln: null, eur: null }
      : resolveDualPrices(formattedPricePln, formattedPriceEur);
    try {
      setSubmitting(true);
      const serviceData = {
        name: name.trim(),
        description: description.trim() || '',
        price_amount: dual.pln,
        price_amount_eur: dual.eur,
        duration_minutes: parseInt(duration, 10) || 60,
        category_id: selectedCategoryId || null,
        promotional_price_amount: formattedPromoPln,
        promotional_price_amount_eur: formattedPromoEur,
        promotion_valid_until: withVariants || individuallyPriced ? null : (promoUntil || null),
        price_is_indicative: individuallyPriced || priceIsIndicative,
        options: preparedOptions,
      };
      if (editingId) {
        await updateService(businessSlug, editingId, serviceData, imageAsset || undefined);
      } else {
        await uploadService(businessSlug, serviceData, imageAsset || undefined);
      }
      notify(
        'Sukces',
        editingId ? 'Zmiany usługi zostały zapisane.' : 'Usługa została dodana do cennika.',
        () => {
          router.replace('/business/manage-services' as any);
        },
      );
    } catch (e: any) {
      notify('Nie udało się zapisać usługi', formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = categories.find((item) => item.id === selectedCategoryId);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => goBackToApp(router, '/business/manage-services')}
          style={styles.backBtn}
        >
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
            <TouchableOpacity style={styles.categorySelect} onPress={() => setShowCategoryPicker(true)}>
              <View style={styles.categorySelectLeft}>
                <View
                  style={[
                    styles.categoryDot,
                    { backgroundColor: selectedCategory?.color || '#94A3B8' },
                  ]}
                />
                <Text style={styles.categorySelectText}>
                  {selectedCategory?.name || t('service.form.noCategory')}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#64748B" />
            </TouchableOpacity>
            <Text style={styles.hint}>{t('service.form.categoryHint')}</Text>

            <Text style={styles.inputLabel}>{t('service.form.image')}</Text>
            <TouchableOpacity
              style={[
                styles.imagePicker,
                showImagePreview && styles.imagePickerFilled,
                imageDragOver && styles.imagePickerDragOver,
              ]}
              onPress={handlePickImage}
              activeOpacity={0.85}
              {...webDropProps}
            >
              {showImagePreview ? (
                <Image
                  source={{ uri: previewUri as string }}
                  style={styles.imagePreview}
                  contentFit="cover"
                  onError={() => setImageBroken(true)}
                />
              ) : (
                <>
                  <Ionicons name="image-outline" size={28} color={Colors.light.accent} />
                  <Text style={styles.imagePickerText}>{t('service.form.pickImage')}</Text>
                  {Platform.OS === 'web' ? (
                    <Text style={styles.imagePickerHint}>albo upuść plik tutaj · kwadrat, max 8 MB</Text>
                  ) : null}
                </>
              )}
            </TouchableOpacity>

            <Text style={styles.inputLabel}>{t('service.form.pricingType')}</Text>
            <View style={styles.modeRow}>
              <TouchableOpacity
                style={[styles.modeChip, !withVariants && styles.modeChipActive]}
                onPress={() => setMode('simple')}
              >
                <Text style={[styles.modeChipText, !withVariants && styles.modeChipTextActive]}>
                  {t('service.form.pricingSimple')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeChip, withVariants && styles.modeChipActive]}
                onPress={() => setMode('variants')}
              >
                <Text style={[styles.modeChipText, withVariants && styles.modeChipTextActive]}>
                  {t('service.form.pricingVariants')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {withVariants
                ? t('service.form.pricingVariantsHint')
                : t('service.form.pricingSimpleHint')}
            </Text>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.switchTitle}>
                  {hasEnteredPrice
                    ? t('service.form.indicativePrice')
                    : t('service.form.individuallyPriced')}
                </Text>
                <Text style={styles.switchHint}>
                  {hasEnteredPrice
                    ? t('service.form.indicativePriceHint')
                    : t('service.form.individuallyPricedHint')}
                </Text>
                {hasEnteredPrice ? (
                  <TouchableOpacity onPress={enableIndividuallyPriced} style={styles.individualLink}>
                    <Text style={styles.individualLinkText}>
                      {t('service.form.switchToIndividuallyPriced')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              <AppSwitch
                value={priceIsIndicative}
                onValueChange={handleToggleIndicative}
                trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                thumbColor={priceIsIndicative ? Colors.light.accent : '#f4f3f4'}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>{t('service.form.duration')}</Text>
              <TextInput style={styles.input} placeholder="60" keyboardType="numeric" value={duration} onChangeText={setDuration} />
              {withVariants ? (
                <Text style={styles.hint}>{t('service.form.durationHintVariants')}</Text>
              ) : null}
            </View>

            {!withVariants && showPriceFields ? (
              <>
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
                <Text style={styles.hint}>{t('service.form.priceHint')}</Text>
              </>
            ) : null}

            {withVariants ? (
              <>
                <View style={styles.optionsHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{t('service.form.options')}</Text>
                    <Text style={styles.hint}>{t('service.form.optionsHint')}</Text>
                  </View>
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
                    {showPriceFields ? (
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
                    ) : null}
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

                <TouchableOpacity
                  style={styles.addOptionBtnBottom}
                  onPress={() => setOptions((current) => [...current, newOptionDraft()])}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.addOptionText}>{t('service.form.addOption')}</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {!withVariants && showPriceFields ? (
              <>
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
              </>
            ) : null}

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

      {showCategoryPicker ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowCategoryPicker(false)}>
          <View style={styles.calendarOverlay}>
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Text style={styles.calendarTitle}>{t('service.form.category')}</Text>
                <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                  <Ionicons name="close" size={24} color={Colors.light.text} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.categoryOption, !selectedCategoryId && styles.categoryOptionActive]}
                onPress={() => {
                  setSelectedCategoryId(undefined);
                  setShowCategoryPicker(false);
                }}
              >
                <View style={[styles.categoryDot, { backgroundColor: '#94A3B8' }]} />
                <Text style={styles.categoryOptionText}>{t('service.form.noCategory')}</Text>
                {!selectedCategoryId ? <Ionicons name="checkmark" size={20} color={Colors.light.accent} /> : null}
              </TouchableOpacity>
              {categories.map((category) => {
                const active = selectedCategoryId === category.id;
                return (
                  <TouchableOpacity
                    key={category.id}
                    style={[styles.categoryOption, active && styles.categoryOptionActive]}
                    onPress={() => {
                      setSelectedCategoryId(category.id);
                      setShowCategoryPicker(false);
                    }}
                  >
                    <View style={[styles.categoryDot, { backgroundColor: category.color || '#94A3B8' }]} />
                    <Text style={styles.categoryOptionText}>{category.name}</Text>
                    {active ? <Ionicons name="checkmark" size={20} color={Colors.light.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={styles.manageCategoriesBtn}
                onPress={() => {
                  setShowCategoryPicker(false);
                  router.push('/business/categories' as any);
                }}
              >
                <Ionicons name="pricetags-outline" size={18} color={Colors.light.accent} />
                <Text style={styles.manageCategoriesText}>{t('service.form.manageCategories')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

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
  categorySelect: {
    height: 50, borderRadius: 14, backgroundColor: '#F1F5F9', paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6,
  },
  categorySelectLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  categoryDot: { width: 12, height: 12, borderRadius: 6 },
  categorySelectText: { fontSize: 15, fontWeight: '700', color: Colors.light.text },
  categoryOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 12, marginBottom: 6,
  },
  categoryOptionActive: { backgroundColor: '#F5F3FF' },
  categoryOptionText: { flex: 1, fontSize: 15, fontWeight: '700', color: Colors.light.text },
  manageCategoriesBtn: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 44, borderRadius: 12, backgroundColor: '#EDE9FE',
  },
  manageCategoriesText: { color: Colors.light.accent, fontWeight: '800' },
  imagePicker: {
    width: IMAGE_PICKER_SIZE,
    height: IMAGE_PICKER_SIZE,
    maxWidth: '100%',
    alignSelf: 'center',
    marginBottom: 14,
    borderRadius: 18,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#C4B5FD',
    backgroundColor: '#FAF5FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  imagePickerFilled: {
    borderStyle: 'solid',
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
  },
  imagePickerDragOver: {
    borderColor: Colors.light.accent,
    backgroundColor: '#EDE9FE',
  },
  imagePreview: { width: '100%', height: '100%' },
  imagePickerText: { color: Colors.light.accent, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  imagePickerHint: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'center', paddingHorizontal: 16 },
  dateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateValue: { color: Colors.light.text, fontSize: 15 },
  datePlaceholder: { color: '#94A3B8', fontSize: 15 },
  row: { flexDirection: 'row', gap: 12 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  modeChip: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  modeChipActive: {
    backgroundColor: '#EDE9FE',
    borderColor: Colors.light.accent,
  },
  modeChipText: { color: '#64748B', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  modeChipTextActive: { color: Colors.light.accent },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC',
    borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0',
  },
  switchTitle: { fontSize: 14, fontWeight: '800', color: Colors.light.text, marginBottom: 4 },
  switchHint: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  individualLink: { marginTop: 8 },
  individualLinkText: { fontSize: 12, fontWeight: '800', color: Colors.light.accent },
  optionsHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 8, marginBottom: 8 },
  addOptionBtnBottom: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.light.accent, height: 44, borderRadius: 14, marginBottom: 8,
  },
  addOptionText: { color: '#fff', fontWeight: '800', fontSize: 13 },
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
