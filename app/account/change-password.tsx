import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';
import Colors from '../../constants/Colors';
import { api } from '../../api/client';

export default function ChangePasswordScreen() {
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePasswords = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      return 'Wszystkie pola są wymagane';
    }

    if (newPassword.length < 8) {
      return 'Nowe hasło musi mieć minimum 8 znaków';
    }

    if (newPassword !== confirmPassword) {
      return 'Nowe hasła nie są identyczne';
    }

    if (oldPassword === newPassword) {
      return 'Nowe hasło musi być inne niż stare';
    }

    return null;
  };

  const handleChangePassword = async () => {
    const error = validatePasswords();
    if (error) {
      if (Platform.OS === 'web') {
        window.alert(error);
      } else {
        Alert.alert('Błąd', error);
      }
      return;
    }

    try {
      setLoading(true);
      console.log('📤 [ChangePassword] Changing password...');

      // Call backend API
      await api.put('/users/change-password/', {
        old_password: oldPassword,
        new_password: newPassword,
        new_password2: confirmPassword,
      });

      console.log('✅ [ChangePassword] Password changed successfully');

      const successMsg = 'Hasło zostało zmienione';
      if (Platform.OS === 'web') {
        window.alert(successMsg);
        goBackToApp(router, '/(tabs)/account');
      } else {
        Alert.alert('Sukces', successMsg, [
          {
            text: 'OK',
            onPress: () => goBackToApp(router, '/(tabs)/account'),
          },
        ]);
      }
    } catch (error: any) {
      console.error('❌ [ChangePassword] Error:', error);

      const errorMsg = 
        error?.response?.data?.detail || 
        error?.response?.data?.old_password?.[0] ||
        error?.response?.data?.new_password?.[0] ||
        'Nie udało się zmienić hasła';
        
      if (Platform.OS === 'web') {
        window.alert(`Błąd: ${errorMsg}`);
      } else {
        Alert.alert('Błąd', errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackToApp(router, '/(tabs)/account')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Zmień hasło</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Info Box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={Colors.accent} />
          <Text style={styles.infoText}>
            Twoje nowe hasło musi mieć minimum 8 znaków i różnić się od obecnego hasła.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Old Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Obecne hasło <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.input}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Wpisz obecne hasło"
                placeholderTextColor="#999"
                secureTextEntry={!showOldPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowOldPassword(!showOldPassword)}>
                <Ionicons
                  name={showOldPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nowe hasło <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.input}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Minimum 8 znaków"
                placeholderTextColor="#999"
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            {newPassword.length > 0 && newPassword.length < 8 && (
              <Text style={styles.errorText}>Hasło musi mieć minimum 8 znaków</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Potwierdź nowe hasło <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.input}>
              <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Wpisz ponownie nowe hasło"
                placeholderTextColor="#999"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <Text style={styles.errorText}>Hasła nie są identyczne</Text>
            )}
          </View>
        </View>

        {/* Security Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>Wskazówki dotyczące hasła:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.tipText}>Użyj minimum 8 znaków</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.tipText}>Połącz duże i małe litery</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.tipText}>Dodaj cyfry i znaki specjalne</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.tipText}>Unikaj oczywistych haseł</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Zmień hasło</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelButton} onPress={() => goBackToApp(router, '/(tabs)/account')}>
            <Text style={styles.cancelButtonText}>Anuluj</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingTop: Platform.OS === 'ios' ? 50 : Platform.OS === 'android' ? 0 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF5F0',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  form: {
    backgroundColor: '#fff',
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#e74c3c',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    fontSize: 12,
    color: '#e74c3c',
    marginTop: 4,
  },
  tipsSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
  },
  buttonContainer: {
    padding: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});