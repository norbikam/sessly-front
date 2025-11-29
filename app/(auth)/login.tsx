import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export const options = {
  headerShown: false,
};

const { width } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';
const isLargeScreen = width > 768;

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  
  const { login } = useAuth();
  const router = useRouter();

  const validate = () => {
    const newErrors: { username?: string; password?: string } = {};
    
    if (!username.trim()) {
      newErrors.username = 'Nazwa użytkownika jest wymagana';
    }
    
    if (!password) {
      newErrors.password = 'Hasło jest wymagane';
    } else if (password.length < 4) {
      newErrors.password = 'Hasło musi mieć minimum 4 znaki';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await login({username, password});
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Nieprawidłowa nazwa użytkownika lub hasło';
      
      if (error.response?.data) {
        const data = error.response.data;
        
        if (data.detail) {
          errorMessage = data.detail;
          
          // Tłumacz typowe błędy
          if (errorMessage.toLowerCase().includes('credentials')) {
            errorMessage = 'Nieprawidłowa nazwa użytkownika lub hasło';
          } else if (errorMessage.toLowerCase().includes('inactive')) {
            errorMessage = 'Konto nie jest aktywne. Sprawdź swój email.';
          } else if (errorMessage.toLowerCase().includes('email')) {
            errorMessage = 'Potwierdź swój adres email przed zalogowaniem';
          }
        } else if (data.username) {
          errorMessage = Array.isArray(data.username) ? data.username[0] : data.username;
        } else if (data.password) {
          errorMessage = Array.isArray(data.password) ? data.password[0] : data.password;
        }
      }
      
      Alert.alert('Błąd logowania', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar style="light" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#FF6B35', '#FF8E53', '#F7931E']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
        pointerEvents="none" // <- allow touches to pass through
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
        pointerEvents="box-none"
      >
        <ScrollView 
               contentContainerStyle={[
                 styles.scrollContent,
                 isLargeScreen && styles.scrollContentLarge
               ]}
               keyboardShouldPersistTaps="always"
               /* keyboardDismissMode removed - może powodować natychmiastowe zwinięcie */
               showsVerticalScrollIndicator={false}
               pointerEvents="box-none"
               bounces={false}
             >
              {/* Logo/Brand Section */}
              <View style={styles.brandContainer}>
                <View style={styles.logoCircle}>
                  <Ionicons name="calendar" size={48} color="#FF6B35" />
                </View>
                <Text style={styles.brandName}>Sessly</Text>
                <Text style={styles.brandTagline}>Zarządzaj swoim czasem</Text>
              </View>

              {/* Login Card */}
              <View style={[styles.card, isLargeScreen && styles.cardLarge]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title}>Witaj ponownie! 👋</Text>
                  <Text style={styles.subtitle}>Zaloguj się do swojego konta</Text>
                </View>

                <View style={styles.form}>
                  <Input
                    label="Nazwa użytkownika"
                    placeholder="Wpisz nazwę użytkownika"
                    value={username}
                    onChangeText={(text) => {
                      setUsername(text);
                      setErrors({ ...errors, username: undefined });
                    }}
                    error={errors.username}
                    icon="person-outline"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <Input
                    label="Hasło"
                    placeholder="Wpisz hasło"
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      setErrors({ ...errors, password: undefined });
                    }}
                    error={errors.password}
                    icon="lock-closed-outline"
                    isPassword
                  />

                  {/* Forgot Password Link */}
                  <TouchableOpacity 
                    style={styles.forgotPassword}
                    onPress={() => {
                      // TODO: Implement forgot password
                      Alert.alert('Info', 'Funkcja odzyskiwania hasła będzie wkrótce dostępna');
                    }}
                  >
                    <Text style={styles.forgotPasswordText}>Zapomniałeś hasła?</Text>
                  </TouchableOpacity>

                  <Button
                    title="Zaloguj się"
                    onPress={handleLogin}
                    loading={loading}
                    style={styles.loginButton}
                  />

                  {/* Divider */}
                  <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>lub</Text>
                    <View style={styles.divider} />
                  </View>

                  {/* Register Link */}
                  <View style={styles.registerContainer}>
                    <Text style={styles.registerText}>Nie masz konta? </Text>
                    <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                      <Text style={styles.registerLink}>Zarejestruj się</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Footer */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  © 2025 Sessly. Wszystkie prawa zastrzeżone.
                </Text>
              </View>
            </ScrollView>
       </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#FF6B35',
  },
  backgroundGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  scrollContentLarge: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  brandName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  brandTagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  cardLarge: {
    maxWidth: 480,
    width: '100%',
  },
  cardHeader: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    height: 52,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#666',
    fontSize: 15,
  },
  registerLink: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
  },
});