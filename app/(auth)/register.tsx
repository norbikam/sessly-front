import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, TextInputProps
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { lookupBusinessRegistry } from '../../api/business';
import { useLocale } from '../../contexts/LocaleContext';
import Colors from '../../constants/Colors';
import { notify } from '../../utils/notify';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Role = 'customer' | 'business_owner';

type FormFieldProps = TextInputProps & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  containerStyle?: object;
};

function FormField({ label, icon, containerStyle, style, ...props }: FormFieldProps) {
  return (
    <View style={[styles.field, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputGroup}>
        {icon ? <Ionicons name={icon} size={20} color="#64748B" style={styles.inputIcon} /> : null}
        <TextInput
          {...props}
          style={[styles.input, style]}
          placeholderTextColor="#64748B"
          selectionColor={Colors.light.accent}
        />
      </View>
    </View>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { t } = useLocale();
  const insets = useSafeAreaInsets();
  
  const [role, setRole] = useState<Role>('customer');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Dane Użytkownika
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [nip, setNip] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [legalAddress, setLegalAddress] = useState('');
  const [legalCity, setLegalCity] = useState('');
  const [legalPostalCode, setLegalPostalCode] = useState('');
  const [lookingUpNip, setLookingUpNip] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const digitsOnly = (value: string) => value.replace(/\D/g, '');

  const handleNipLookup = async () => {
    const cleanNip = digitsOnly(nip);
    if (cleanNip.length !== 10) {
      notify('NIP', 'Podaj 10-cyfrowy NIP, aby pobrać dane firmy.');
      return;
    }
    try {
      setLookingUpNip(true);
      const company = await lookupBusinessRegistry(cleanNip);
      setNip(company.nip);
      if (company.name) setOrganizationName(company.name);
      if (company.address_line1) setLegalAddress(company.address_line1);
      else if (company.address) setLegalAddress(company.address);
      if (company.city) setLegalCity(company.city);
      if (company.postal_code) setLegalPostalCode(company.postal_code);
      notify('Znaleziono firmę', company.regon ? `REGON: ${company.regon}` : 'Uzupełniliśmy dane rozliczeniowe.');
    } catch (error: any) {
      notify(
        'Nie znaleziono firmy',
        error?.response?.data?.detail || error?.message || 'Sprawdź numer NIP.',
      );
    } finally {
      setLookingUpNip(false);
    }
  };

  const handleRegister = async () => {
    setFormError('');
    const cleanUsername = username.trim();
    if (!cleanUsername || !email || !password || !passwordConfirm) {
      const msg = 'Wypełnij wszystkie wymagane pola użytkownika.';
      setFormError(msg);
      notify('Błąd', msg);
      return;
    }
    if (/\s/.test(cleanUsername)) {
      const msg = t('auth.usernameSpaces');
      setFormError(msg);
      notify('Błąd', msg);
      return;
    }
    if (password !== passwordConfirm) {
      const msg = 'Hasła nie są identyczne.';
      setFormError(msg);
      notify('Błąd', msg);
      return;
    }

    if (!phoneNumber.trim()) {
      const msg = 'Podaj numer telefonu.';
      setFormError(msg);
      notify('Błąd', msg);
      return;
    }

    const cleanNip = digitsOnly(nip);
    if (role === 'business_owner') {
      if (cleanNip.length !== 10) {
        const msg = 'Podaj poprawny, 10-cyfrowy NIP firmy — jest wymagany do rozliczeń.';
        setFormError(msg);
        notify('Błąd', msg);
        return;
      }
      if (!legalAddress.trim() || !legalCity.trim() || !legalPostalCode.trim()) {
        const msg = 'Uzupełnij adres do rozliczeń (ulica, miasto, kod).';
        setFormError(msg);
        notify('Błąd', msg);
        return;
      }
    }

    if (!acceptedTerms) {
      const msg = 'Zaakceptuj regulamin i politykę prywatności.';
      setFormError(msg);
      notify('Błąd', msg);
      return;
    }

    const payload: any = {
      username: cleanUsername,
      email: email.trim(),
      first_name: firstName,
      last_name: lastName,
      password,
      password2: passwordConfirm,
      role,
      phone_number: phoneNumber.trim(),
    };

    if (role === 'business_owner') {
      payload.organization_name = organizationName.trim() || `${firstName} ${lastName}`.trim() || cleanUsername;
      payload.nip = cleanNip;
      payload.legal_address_line1 = legalAddress.trim();
      payload.legal_city = legalCity.trim();
      payload.legal_postal_code = legalPostalCode.trim();
      payload.legal_country = 'Polska';
    }

    try {
      setLoading(true);
      const res = await register(payload);
      if (res.success) {
        if (res.requiresVerification) {
          notify('Sprawdź pocztę', 'Wysłaliśmy 6-cyfrowy kod potwierdzający.');
          router.replace({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
        } else {
          notify('Sukces', 'Konto zostało utworzone. Możesz się zalogować.');
          router.replace('/(auth)/login');
        }
      } else {
        setFormError(res.error || 'Nie udało się założyć konta.');
        notify('Błąd rejestracji', res.error || 'Nie udało się założyć konta.');
      }
    } catch (e: any) {
      const msg = e.message || 'Wystąpił nieoczekiwany błąd.';
      setFormError(msg);
      notify('Błąd', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20), paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Dołącz do Sessly</Text>
          <Text style={styles.subtitle}>Wybierz typ konta i uzupełnij dane</Text>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, role === 'customer' && styles.tabActive]}
            onPress={() => setRole('customer')}
          >
            <Ionicons name="person-outline" size={18} color={role === 'customer' ? '#fff' : Colors.light.textSecondary} />
            <Text style={[styles.tabText, role === 'customer' && styles.tabTextActive]}>Dla Klienta</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, role === 'business_owner' && styles.tabActive]}
            onPress={() => setRole('business_owner')}
          >
            <Ionicons name="storefront-outline" size={18} color={role === 'business_owner' ? '#fff' : Colors.light.textSecondary} />
            <Text style={[styles.tabText, role === 'business_owner' && styles.tabTextActive]}>Dla Biznesu</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formCard}>
          {formError ? <Text style={styles.formError}>{formError}</Text> : null}
          <Text style={styles.sectionTitle}>Twoje Dane</Text>
          <FormField
            label={`${t('auth.usernameLogin')} *`}
            icon="person-outline"
            placeholder={t('auth.usernameHint')}
            value={username}
            onChangeText={(text) => setUsername(text.replace(/\s/g, ''))}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FormField label="E-mail *" icon="mail-outline" placeholder="anna@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <FormField
            label="Telefon *"
            icon="call-outline"
            placeholder="+48 500 000 000"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          
          <View style={styles.row}>
            <FormField label="Imię" containerStyle={styles.rowField} placeholder="Anna" value={firstName} onChangeText={setFirstName} />
            <FormField label="Nazwisko" containerStyle={styles.rowField} placeholder="Nowak" value={lastName} onChangeText={setLastName} />
          </View>

          <FormField label="Hasło *" icon="lock-closed-outline" placeholder="Minimum 8 znaków" value={password} onChangeText={setPassword} secureTextEntry />
          <FormField label="Powtórz hasło *" icon="shield-checkmark-outline" placeholder="Wpisz hasło ponownie" value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />
        </View>

        {role === 'business_owner' && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Dane do rozliczeń</Text>
            <Text style={styles.businessHint}>
              To dane firmy (NIP, adres rozliczeniowy). Adres miejsca wykonywania usług dodasz osobno po zalogowaniu.
            </Text>
            <View style={styles.nipRow}>
              <FormField
                label="NIP *"
                icon="document-text-outline"
                placeholder="10 cyfr"
                value={nip}
                onChangeText={setNip}
                keyboardType="number-pad"
                maxLength={13}
                containerStyle={styles.nipField}
              />
              <TouchableOpacity
                style={styles.lookupButton}
                onPress={handleNipLookup}
                disabled={lookingUpNip || digitsOnly(nip).length < 10}
              >
                {lookingUpNip
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.lookupButtonText}>Pobierz</Text>}
              </TouchableOpacity>
            </View>
            <FormField
              label="Nazwa firmy *"
              icon="business-outline"
              placeholder="np. Studio Urody Anna"
              value={organizationName}
              onChangeText={setOrganizationName}
            />
            <FormField
              label="Ulica i numer (rozliczenia) *"
              icon="home-outline"
              placeholder="ul. Przykładowa 10"
              value={legalAddress}
              onChangeText={setLegalAddress}
            />
            <View style={styles.row}>
              <FormField
                label="Miasto *"
                containerStyle={styles.cityField}
                placeholder="Warszawa"
                value={legalCity}
                onChangeText={setLegalCity}
              />
              <FormField
                label="Kod *"
                containerStyle={styles.zipField}
                placeholder="00-000"
                value={legalPostalCode}
                onChangeText={setLegalPostalCode}
              />
            </View>
          </View>
        )}

        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => setAcceptedTerms((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={[styles.checkbox, acceptedTerms && styles.checkboxOn]}>
            {acceptedTerms ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
          </View>
          <Text style={styles.termsText}>
            Akceptuję{' '}
            <Text
              style={styles.termsLink}
              onPress={() => router.push({ pathname: '/account/legal', params: { doc: 'terms' } })}
            >
              regulamin
            </Text>
            {' '}i{' '}
            <Text
              style={styles.termsLink}
              onPress={() => router.push({ pathname: '/account/legal', params: { doc: 'privacy' } })}
            >
              politykę prywatności
            </Text>
            .
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Załóż konto</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginLinkText}>Masz już konto? <Text style={styles.loginLinkBold}>Zaloguj się</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 24 },
  header: { marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.light.text },
  subtitle: { fontSize: 15, color: Colors.light.textSecondary, marginTop: 4 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 16, padding: 4, marginBottom: 24 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  tabActive: { backgroundColor: Colors.light.accent, shadowColor: Colors.light.accent, shadowOffset: {width:0, height:2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '700', color: Colors.light.textSecondary },
  tabTextActive: { color: '#fff' },

  formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20, shadowColor: '#4C1D95', shadowOffset: {width:0, height:4}, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  formError: { fontSize: 14, color: '#EF4444', fontWeight: '700', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.light.text, marginBottom: 16 },
  businessHint: { fontSize: 13, color: Colors.light.textSecondary, lineHeight: 20, marginBottom: 14 },
  
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '800', color: '#334155', marginBottom: 7, marginLeft: 2 },
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 16, minHeight: 54 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: '#0F172A', minHeight: 52, fontWeight: '500' },
  row: { flexDirection: 'row', gap: 12 },
  rowField: { flex: 1 },
  cityField: { flex: 2 },
  zipField: { flex: 1 },
  nipRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  nipField: { flex: 1 },
  lookupButton: { height: 54, paddingHorizontal: 15, marginBottom: 14, borderRadius: 14, justifyContent: 'center', backgroundColor: Colors.light.accent },
  lookupButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  
  categoryContainer: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.textSecondary, marginBottom: 8, marginLeft: 4 },
  catChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  catChipActive: { backgroundColor: '#F5F3FF', borderColor: Colors.light.accent },
  catText: { fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary },
  catTextActive: { color: Colors.light.accent, fontWeight: '700' },

  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8, marginTop: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#fff',
  },
  checkboxOn: { backgroundColor: Colors.light.accent, borderColor: Colors.light.accent },
  termsText: { flex: 1, fontSize: 13, color: '#64748B', lineHeight: 18 },
  termsLink: { color: Colors.light.accent, fontWeight: '800' },
  submitBtn: { backgroundColor: Colors.light.accent, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: Colors.light.accent, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  loginLink: { marginTop: 24, alignItems: 'center' },
  loginLinkText: { fontSize: 15, color: Colors.light.textSecondary },
  loginLinkBold: { color: Colors.light.accent, fontWeight: '800' }
});