import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SuccessDialog } from '../../components/ui/SuccessDialog';
import { Ionicons } from '@expo/vector-icons';

interface FormData {
  username: string;
  email: string;
  password: string;
  password2: string;
  first_name: string;
  last_name: string;
  is_specialist: boolean;
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
    is_specialist: false,
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const handleRegister = async () => {
    setErrors({});
    const newErrors: FormErrors = {};
    
    if (!formData.username.trim()) newErrors.username = 'Nazwa użytkownika jest wymagana';
    if (!formData.email.trim()) newErrors.email = 'Email jest wymagany';
    if (formData.password.length < 8) newErrors.password = 'Hasło musi mieć co najmniej 8 znaków';
    if (formData.password !== formData.password2) newErrors.password2 = 'Hasła nie są identyczne';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    try {
      const result = await register(formData);
      if (result.success) {
        setDialogMessage('Twoje konto zostało pomyślnie utworzone!');
        setShowSuccessDialog(true);
      } else {
        setDialogMessage(result.error || 'Błąd rejestracji.');
        setShowErrorDialog(true);
      }
    } catch (error: any) {
      setDialogMessage(error.message || 'Wystąpił nieoczekiwany błąd.');
      setShowErrorDialog(true);
    }
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.content}>
          <Text style={styles.title}>Utwórz konto</Text>
          <Text style={styles.subtitle}>Wypełnij formularz aby dołączyć do Sessly</Text>

          <View style={styles.form}>
            {/* WYBÓR ROLI */}
            <TouchableOpacity 
              style={[styles.roleSelector, formData.is_specialist && styles.roleSelectorActive]}
              onPress={() => setFormData({ ...formData, is_specialist: !formData.is_specialist })}
            >
              <View style={styles.roleIcon}>
                <Ionicons 
                  name={formData.is_specialist ? "briefcase" : "person-outline"} 
                  size={24} 
                  color={formData.is_specialist ? "#3b82f6" : "#6b7280"} 
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.roleTitle}>Konto Specjalisty</Text>
                <Text style={styles.roleSubtitle}>Chcę oferować swoje usługi</Text>
              </View>
              <Switch
                value={formData.is_specialist}
                onValueChange={(val) => setFormData({ ...formData, is_specialist: val })}
                trackColor={{ false: "#d1d5db", true: "#bfdbfe" }}
                thumbColor={formData.is_specialist ? "#3b82f6" : "#f4f3f4"}
              />
            </TouchableOpacity>

            <Input
              label="Nazwa użytkownika *"
              value={formData.username}
              onChangeText={(text) => setFormData({ ...formData, username: text })}
              error={errors.username}
              autoCapitalize="none"
            />
            <Input
              label="Email *"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Hasło *"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              error={errors.password}
              secureTextEntry
            />
            <Input
              label="Powtórz hasło *"
              value={formData.password2}
              onChangeText={(text) => setFormData({ ...formData, password2: text })}
              error={errors.password2}
              secureTextEntry
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Imię"
                  value={formData.first_name}
                  onChangeText={(text) => setFormData({ ...formData, first_name: text })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Nazwisko"
                  value={formData.last_name}
                  onChangeText={(text) => setFormData({ ...formData, last_name: text })}
                />
              </View>
            </View>
            
            <Button title="Zarejestruj się" onPress={handleRegister} style={styles.registerButton} />
            
            <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/(auth)/login')}>
              <Text style={styles.loginLinkText}>
                Masz już konto? <Text style={styles.loginLinkTextBold}>Zaloguj się</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <SuccessDialog
        visible={showSuccessDialog}
        type="success"
        title="Sukces!"
        message={dialogMessage}
        buttonText="Zaloguj się"
        onPress={() => { setShowSuccessDialog(false); router.replace('/(auth)/login'); }}
      />

      <SuccessDialog
        visible={showErrorDialog}
        type="error"
        title="Błąd"
        message={dialogMessage}
        buttonText="Zamknij"
        onPress={() => setShowErrorDialog(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  title: { fontSize: 28, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  form: { gap: 12 },
  registerButton: { marginTop: 16 },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginLinkText: { fontSize: 14, color: '#6b7280' },
  loginLinkTextBold: { fontWeight: '600', color: '#3b82f6' },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  roleSelectorActive: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  roleTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  roleSubtitle: { fontSize: 12, color: '#6b7280' },
});