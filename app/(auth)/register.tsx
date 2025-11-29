import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SuccessDialog } from '../../components/ui/SuccessDialog';  // ← DODAJ IMPORT

interface FormData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
}

interface FormErrors {
  [key: string]: string;
}

export default function RegisterScreen() {
  const { register } = useAuth();
  
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  
  // ✅ DODAJ STATES DLA POPUP
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const handleRegister = async () => {
    console.log('🎯 Register button pressed');
    
    // Reset błędów
    setErrors({});
    
    // ============================================
    // WALIDACJA FRONTENDU
    // ============================================
    const newErrors: FormErrors = {};
    
    if (!formData.username.trim()) {
      newErrors.username = 'Nazwa użytkownika jest wymagana';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Nazwa użytkownika musi mieć co najmniej 3 znaki';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email jest wymagany';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Nieprawidłowy format email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Hasło jest wymagane';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Hasło musi mieć co najmniej 8 znaków';
    }
    
    if (formData.password !== formData.password2) {
      newErrors.password2 = 'Hasła nie są identyczne';
    }
    
    // Jeśli są błędy walidacji - zatrzymaj
    if (Object.keys(newErrors).length > 0) {
      console.log('❌ Validation errors:', newErrors);
      setErrors(newErrors);
      return;
    }
    
    // ============================================
    // WYWOŁANIE API REJESTRACJI
    // ============================================
    try {
      console.log('🚀 Starting registration process...');
      
      const result = await register(formData);
      
      if (result.success) {
        console.log('✅ Registration completed successfully!');
        
        // ✅ POKAŻ POPUP SUKCESU
        setDialogMessage('Twoje konto zostało pomyślnie utworzone!');
        setShowSuccessDialog(true);
        
      } else {
        // ❌ POKAŻ POPUP BŁĘDU
        console.error('❌ Registration failed:', result.error);
        setDialogMessage(result.error || 'Wystąpił błąd podczas rejestracji. Spróbuj ponownie.');
        setShowErrorDialog(true);
      }
      
    } catch (error: any) {
      // ❌ POKAŻ POPUP BŁĘDU
      console.error('❌ Unexpected registration error:', error);
      setDialogMessage(error.message || 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.');
      setShowErrorDialog(true);
    }
  };

  // ✅ HANDLER DLA SUKCESU - PRZEKIEROWANIE DO LOGOWANIA
  const handleSuccessPress = () => {
    setShowSuccessDialog(false);
    setTimeout(() => {
      router.replace('/(auth)/login');
    }, 300);
  };

  // ✅ HANDLER DLA BŁĘDU - ZAMKNIJ DIALOG
  const handleErrorPress = () => {
    setShowErrorDialog(false);
  };

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Utwórz konto</Text>
          <Text style={styles.subtitle}>
            Wypełnij formularz aby założyć nowe konto
          </Text>

          {/* Formularz rejestracji */}
          <View style={styles.form}>
            <Input
              label="Nazwa użytkownika *"
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              error={errors.username}
              placeholder="np. jan_kowalski"
              autoCapitalize="none"
            />
            
            <Input
              label="Email *"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              error={errors.email}
              placeholder="twoj@email.pl"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Input
              label="Hasło *"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              error={errors.password}
              placeholder="Minimum 8 znaków"
              secureTextEntry
            />
            
            <Input
              label="Powtórz hasło *"
              value={formData.password2}
              onChangeText={(text) => setFormData({ ...formData, password2: text })}
              error={errors.password2}
              placeholder="Powtórz hasło"
              secureTextEntry
            />
            
            <Input
              label="Imię"
              value={formData.first_name}
              onChangeText={(text) => setFormData({ ...formData, first_name: text })}
              placeholder="Jan"
            />
            
            <Input
              label="Nazwisko"
              value={formData.last_name}
              onChangeText={(text) => setFormData({ ...formData, last_name: text })}
              placeholder="Kowalski"
            />
            
            <Button
              title="Zarejestruj się"
              onPress={handleRegister}
              style={styles.registerButton}
            />
            
            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={styles.loginLinkText}>
                Masz już konto? <Text style={styles.loginLinkTextBold}>Zaloguj się</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ✅ POPUP SUKCESU */}
      <SuccessDialog
        visible={showSuccessDialog}
        type="success"
        title="Rejestracja udana!"
        message={dialogMessage}
        buttonText="Przejdź do logowania"
        onPress={handleSuccessPress}
      />

      {/* ❌ POPUP BŁĘDU */}
      <SuccessDialog
        visible={showErrorDialog}
        type="error"
        title="Błąd rejestracji"
        message={dialogMessage}
        buttonText="Spróbuj ponownie"
        onPress={handleErrorPress}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  registerButton: {
    marginTop: 8,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 16,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loginLinkTextBold: {
    fontWeight: '600',
    color: '#3b82f6',
  },
});