import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Colors from '../../constants/Colors';

type Role = 'customer' | 'business_owner';

const CATEGORIES = [
  { label: 'Fryzjer', value: 'hairdresser' },
  { label: 'Uroda i Kosmetyka', value: 'beauty' },
  { label: 'Lekarz / Specjalista', value: 'doctor' },
  { label: 'SPA & Masaż', value: 'spa' },
  { label: 'Inne', value: 'other' }
];

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  
  const [role, setRole] = useState<Role>('customer');
  const [loading, setLoading] = useState(false);

  // Dane Użytkownika
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Dane Biznesu (wymagane tylko jeśli role === 'business_owner')
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState<any>('hairdresser');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');

  const handleRegister = async () => {
    if (!username || !email || !password || !passwordConfirm) {
      Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola użytkownika.');
      return;
    }
    if (password !== passwordConfirm) {
      Alert.alert('Błąd', 'Hasła nie są identyczne.');
      return;
    }

    let payload: any = {
      username,
      email,
      first_name: firstName,
      last_name: lastName,
      password,
      password2: passwordConfirm,
      role
    };

    if (role === 'business_owner') {
      if (!businessName || !phone || !address || !city) {
        Alert.alert('Błąd', 'Wypełnij wszystkie dane salonu.');
        return;
      }
      payload.business = {
        name: businessName,
        category: category,
        phone_number: phone,
        address_line1: address,
        city: city,
        postal_code: zip || '00-000',
        country: 'Polska'
      };
    }

    try {
      setLoading(true);
      const res = await register(payload);
      if (res.success) {
        Alert.alert('Sukces!', 'Konto zostało utworzone. Możesz się zalogować.');
        router.replace('/(auth)/login');
      } else {
        Alert.alert('Błąd rejestracji', res.error || 'Nie udało się założyć konta.');
      }
    } catch (e: any) {
      Alert.alert('Błąd', e.message || 'Wystąpił nieoczekiwany błąd.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
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
          <Text style={styles.sectionTitle}>Twoje Dane</Text>
          <View style={styles.inputGroup}>
            <Ionicons name="person-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Nazwa użytkownika (Login)*" value={username} onChangeText={setUsername} autoCapitalize="none" />
          </View>
          <View style={styles.inputGroup}>
            <Ionicons name="mail-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="E-mail*" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          </View>
          
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <TextInput style={styles.input} placeholder="Imię" value={firstName} onChangeText={setFirstName} />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <TextInput style={styles.input} placeholder="Nazwisko" value={lastName} onChangeText={setLastName} />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Hasło*" value={password} onChangeText={setPassword} secureTextEntry />
          </View>
          <View style={styles.inputGroup}>
            <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
            <TextInput style={styles.input} placeholder="Powtórz hasło*" value={passwordConfirm} onChangeText={setPasswordConfirm} secureTextEntry />
          </View>
        </View>

        {/* Sekcja dla Biznesu */}
        {role === 'business_owner' && (
          <View style={styles.formCard}>
            <Text style={styles.sectionTitle}>Dane Twojego Salonu</Text>
            
            <View style={styles.inputGroup}>
              <Ionicons name="business-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Nazwa Salonu / Biznesu*" value={businessName} onChangeText={setBusinessName} />
            </View>

            <View style={styles.categoryContainer}>
              <Text style={styles.label}>Kategoria</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                    key={cat.value}
                    style={[styles.catChip, category === cat.value && styles.catChipActive]}
                    onPress={() => setCategory(cat.value)}
                  >
                    <Text style={[styles.catText, category === cat.value && styles.catTextActive]}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="call-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Telefon kontaktowy*" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="location-outline" size={20} color="#94A3B8" style={styles.inputIcon} />
              <TextInput style={styles.input} placeholder="Ulica i numer*" value={address} onChangeText={setAddress} />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 2 }]}>
                <TextInput style={styles.input} placeholder="Miasto*" value={city} onChangeText={setCity} />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <TextInput style={styles.input} placeholder="Kod pocztowy" value={zip} onChangeText={setZip} />
              </View>
            </View>
          </View>
        )}

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
  scrollContent: { padding: 24, paddingBottom: 60 },
  header: { marginTop: Platform.OS === 'ios' ? 40 : 20, marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: {width:0, height:2}, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  title: { fontSize: 28, fontWeight: '900', color: Colors.light.text },
  subtitle: { fontSize: 15, color: Colors.light.textSecondary, marginTop: 4 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#E2E8F0', borderRadius: 16, padding: 4, marginBottom: 24 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 8 },
  tabActive: { backgroundColor: Colors.light.accent, shadowColor: Colors.light.accent, shadowOffset: {width:0, height:2}, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '700', color: Colors.light.textSecondary },
  tabTextActive: { color: '#fff' },

  formCard: { backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 20, shadowColor: '#4C1D95', shadowOffset: {width:0, height:4}, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.light.text, marginBottom: 16 },
  
  inputGroup: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 16, marginBottom: 12, height: 54 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: Colors.light.text, height: '100%' },
  row: { flexDirection: 'row', gap: 12 },
  
  categoryContainer: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: Colors.light.textSecondary, marginBottom: 8, marginLeft: 4 },
  catChip: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F1F5F9', borderRadius: 20, borderWidth: 1, borderColor: 'transparent' },
  catChipActive: { backgroundColor: '#F5F3FF', borderColor: Colors.light.accent },
  catText: { fontSize: 13, fontWeight: '600', color: Colors.light.textSecondary },
  catTextActive: { color: Colors.light.accent, fontWeight: '700' },

  submitBtn: { backgroundColor: Colors.light.accent, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10, shadowColor: Colors.light.accent, shadowOffset: {width:0, height:4}, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  
  loginLink: { marginTop: 24, alignItems: 'center' },
  loginLinkText: { fontSize: 15, color: Colors.light.textSecondary },
  loginLinkBold: { color: Colors.light.accent, fontWeight: '800' }
});