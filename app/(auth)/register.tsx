import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { registerAsCustomer, registerAsBusinessOwner, RegisterBusinessData } from '../../api/auth';
import { RegisterRequest } from '../../types/api';

type AccountType = 'customer' | 'business';

const CATEGORIES = [
  { value: 'hairdresser', label: 'Fryzjer', icon: 'cut' },
  { value: 'doctor', label: 'Lekarz', icon: 'medical' },
  { value: 'beauty', label: 'Kosmetyka', icon: 'sparkles' },
  { value: 'spa', label: 'SPA', icon: 'water' },
  { value: 'fitness', label: 'Fitness', icon: 'fitness' },
  { value: 'other', label: 'Inne', icon: 'ellipsis-horizontal' },
] as const;

export default function RegisterScreen() {
  const router = useRouter();
  
  // Typ konta
  const [accountType, setAccountType] = useState<AccountType>('customer');
  
  // Dane użytkownika
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  // Dane biznesu
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState<string>('hairdresser');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessPostalCode, setBusinessPostalCode] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [businessNip, setBusinessNip] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const validateForm = () => {
    if (!username.trim()) {
      setError('Nazwa użytkownika jest wymagana');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Podaj prawidłowy adres email');
      return false;
    }
    if (password.length < 8) {
      setError('Hasło musi mieć minimum 8 znaków');
      return false;
    }
    if (password !== password2) {
      setError('Hasła nie są identyczne');
      return false;
    }
    
    if (accountType === 'business') {
      if (!businessName.trim()) {
        setError('Nazwa firmy jest wymagana');
        return false;
      }
      if (!businessPhone.trim()) {
        setError('Numer telefonu firmy jest wymagany');
        return false;
      }
      if (!businessAddress.trim()) {
        setError('Adres firmy jest wymagany');
        return false;
      }
      if (!businessCity.trim()) {
        setError('Miasto jest wymagane');
        return false;
      }
      if (!businessPostalCode.trim()) {
        setError('Kod pocztowy jest wymagany');
        return false;
      }
    }
    
    return true;
  };

  const handleRegister = async () => {
    setError('');
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      if (accountType === 'customer') {
        const data: RegisterRequest = {
          username: username.trim(),
          email: email.trim(),
          password,
          password2,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
        };
        
        await registerAsCustomer(data);
        Alert.alert('Sukces', 'Konto zostało utworzone!', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') }
        ]);
        
      } else {
        const data: RegisterBusinessData = {
          username: username.trim(),
          email: email.trim(),
          password,
          password2,
          first_name: firstName.trim() || undefined,
          last_name: lastName.trim() || undefined,
          business_name: businessName.trim(),
          business_category: businessCategory as any,
          business_phone: businessPhone.trim(),
          business_address_line1: businessAddress.trim(),
          business_city: businessCity.trim(),
          business_postal_code: businessPostalCode.trim(),
          business_description: businessDescription.trim() || undefined,
          business_nip: businessNip.trim() || undefined,
        };
        
        const result = await registerAsBusinessOwner(data);
        Alert.alert(
          'Sukces!', 
          `Firma "${result.business.name}" została utworzona!`,
          [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
        );
      }
      
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Wystąpił błąd podczas rejestracji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Utwórz konto</Text>
        
        {/* Toggle typ konta */}
        <View style={styles.accountTypeContainer}>
          <TouchableOpacity
            style={[
              styles.accountTypeButton,
              accountType === 'customer' && styles.accountTypeButtonActive
            ]}
            onPress={() => setAccountType('customer')}
          >
            <Ionicons 
              name="person" 
              size={20} 
              color={accountType === 'customer' ? '#FFF' : '#8B7AB8'} 
            />
            <Text 
              style={[
                styles.accountTypeText,
                accountType === 'customer' && styles.accountTypeTextActive
              ]}
            >
              Klient
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.accountTypeButton,
              accountType === 'business' && styles.accountTypeButtonActive
            ]}
            onPress={() => setAccountType('business')}
          >
            <Ionicons 
              name="business" 
              size={20} 
              color={accountType === 'business' ? '#FFF' : '#8B7AB8'} 
            />
            <Text 
              style={[
                styles.accountTypeText,
                accountType === 'business' && styles.accountTypeTextActive
              ]}
            >
              Firma
            </Text>
          </TouchableOpacity>
        </View>

        {/* Błąd */}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {/* Dane użytkownika */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dane logowania</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Nazwa użytkownika"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Hasło"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? 'eye-off' : 'eye'} 
                size={20} 
                color="#999" 
              />
            </TouchableOpacity>
          </View>
          
          <TextInput
            style={styles.input}
            placeholder="Potwierdź hasło"
            value={password2}
            onChangeText={setPassword2}
            secureTextEntry={!showPassword}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Imię (opcjonalne)"
            value={firstName}
            onChangeText={setFirstName}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Nazwisko (opcjonalne)"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>

        {/* Dane biznesu (tylko jeśli business) */}
        {accountType === 'business' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dane firmy</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Nazwa firmy *"
              value={businessName}
              onChangeText={setBusinessName}
            />
            
            <Text style={styles.label}>Kategoria *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryButton,
                    businessCategory === cat.value && styles.categoryButtonActive
                  ]}
                  onPress={() => setBusinessCategory(cat.value)}
                >
                  <Ionicons 
                    name={cat.icon as any} 
                    size={24} 
                    color={businessCategory === cat.value ? '#FFF' : '#8B7AB8'} 
                  />
                  <Text 
                    style={[
                      styles.categoryLabel,
                      businessCategory === cat.value && styles.categoryLabelActive
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={styles.input}
              placeholder="Telefon *"
              value={businessPhone}
              onChangeText={setBusinessPhone}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Adres *"
              value={businessAddress}
              onChangeText={setBusinessAddress}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Miasto *"
              value={businessCity}
              onChangeText={setBusinessCity}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Kod pocztowy *"
              value={businessPostalCode}
              onChangeText={setBusinessPostalCode}
            />
            
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Opis firmy (opcjonalnie)"
              value={businessDescription}
              onChangeText={setBusinessDescription}
              multiline
              numberOfLines={4}
            />
            
            <TextInput
              style={styles.input}
              placeholder="NIP (opcjonalnie)"
              value={businessNip}
              onChangeText={setBusinessNip}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Przycisk rejestracji */}
        <TouchableOpacity 
          style={styles.registerButton} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.registerButtonText}>
              {accountType === 'customer' ? 'Zarejestruj się' : 'Zarejestruj firmę'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Link do logowania */}
        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.loginLink}>
            Masz już konto? <Text style={styles.loginLinkBold}>Zaloguj się</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8FF',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D2438',
    marginBottom: 20,
    textAlign: 'center',
  },
  accountTypeContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  accountTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B7AB8',
    backgroundColor: '#FFF',
  },
  accountTypeButtonActive: {
    backgroundColor: '#8B7AB8',
    borderColor: '#8B7AB8',
  },
  accountTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B7AB8',
  },
  accountTypeTextActive: {
    color: '#FFF',
  },
  error: {
    backgroundColor: '#FFE5E5',
    color: '#D32F2F',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D2438',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5DFF5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5DFF5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B5B87',
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  categoryButton: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B7AB8',
    backgroundColor: '#FFF',
  },
  categoryButtonActive: {
    backgroundColor: '#8B7AB8',
    borderColor: '#8B7AB8',
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B7AB8',
    marginTop: 4,
  },
  categoryLabelActive: {
    color: '#FFF',
  },
  registerButton: {
    backgroundColor: '#8B7AB8',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  loginLink: {
    textAlign: 'center',
    color: '#6B5B87',
    marginTop: 20,
    fontSize: 14,
  },
  loginLinkBold: {
    fontWeight: '600',
    color: '#8B7AB8',
  },
});
