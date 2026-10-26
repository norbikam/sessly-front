import React, { useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import Colors from '../../constants/Colors';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from '../../contexts/LocaleContext';
import { updateCurrentUser } from '../../api/auth';
import { AppLanguage } from '../../i18n/translations';
import { AppCurrency } from '../../utils/currency';

const LANGUAGES: AppLanguage[] = ['pl', 'en', 'de'];
const CURRENCIES: AppCurrency[] = ['PLN', 'EUR'];

export default function PreferencesScreen() {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { language, currency, setPreferences, t } = useLocale();
  const [draftLanguage, setDraftLanguage] = useState<AppLanguage>(language);
  const [draftCurrency, setDraftCurrency] = useState<AppCurrency>(currency);
  const [emailReminders, setEmailReminders] = useState(user?.notify_email_reminders !== false);
  const [pushReminders, setPushReminders] = useState(user?.notify_push_reminders !== false);
  const [promotions, setPromotions] = useState(user?.notify_promotions !== false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    try {
      setSaving(true);
      await setPreferences({ language: draftLanguage, currency: draftCurrency });
      const updated = await updateCurrentUser({
        preferred_language: draftLanguage,
        preferred_currency: draftCurrency,
        notify_email_reminders: emailReminders,
        notify_push_reminders: pushReminders,
        notify_promotions: promotions,
      } as any);
      if (updated) updateUser(updated);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('account.preferences')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.subtitle}>{t('account.preferencesSubtitle')}</Text>

        <Text style={styles.label}>{t('account.language')}</Text>
        <View style={styles.group}>
          {LANGUAGES.map((code) => {
            const active = draftLanguage === code;
            return (
              <TouchableOpacity
                key={code}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setDraftLanguage(code)}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>
                  {t(`account.language.${code}`)}
                </Text>
                {active ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.light.accent} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>{t('account.currency')}</Text>
        <View style={styles.group}>
          {CURRENCIES.map((code) => {
            const active = draftCurrency === code;
            return (
              <TouchableOpacity
                key={code}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setDraftCurrency(code)}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{code}</Text>
                {active ? (
                  <Ionicons name="checkmark-circle" size={20} color={Colors.light.accent} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Powiadomienia</Text>
        <View style={styles.group}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Przypomnienia e-mail</Text>
            <Switch
              value={emailReminders}
              onValueChange={setEmailReminders}
              trackColor={{ true: Colors.light.accent }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Przypomnienia push</Text>
            <Switch
              value={pushReminders}
              onValueChange={setPushReminders}
              trackColor={{ true: Colors.light.accent }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Promocje od obserwowanych</Text>
            <Switch
              value={promotions}
              onValueChange={setPromotions}
              trackColor={{ true: Colors.light.accent }}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveDisabled]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>{t('common.save')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
  },
  backBtn: { marginRight: 14 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.light.text },
  subtitle: { color: '#64748B', marginBottom: 18, lineHeight: 20 },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 8,
    marginTop: 8,
  },
  group: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  optionActive: { backgroundColor: '#F5F3FF' },
  optionText: { fontSize: 15, color: '#334155', fontWeight: '600' },
  optionTextActive: { color: Colors.light.accent },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  switchLabel: { fontSize: 15, color: '#334155', fontWeight: '600', flex: 1, paddingRight: 12 },
  saveBtn: {
    backgroundColor: Colors.light.accent,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveDisabled: { opacity: 0.6 },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
