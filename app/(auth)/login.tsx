import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Dimensions,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';

export const options = {
  headerShown: false,
};

const { width, height } = Dimensions.get('window');
const isWeb = Platform.OS === 'web';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [loginError, setLoginError] = useState<string>('');
  
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
    setLoginError('');
    
    try {
      await login({ username, password });
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('❌ [Login] Error:', error);
      
      let errorMessage = 'Nieprawidłowa nazwa użytkownika lub hasło';
      
      if (error?.response?.data) {
        const data = error.response.data;
        
        if (data.detail) {
          errorMessage = data.detail;
          
          if (errorMessage.toLowerCase().includes('credentials')) {
            errorMessage = 'Nieprawidłowa nazwa użytkownika lub hasło';
          } else if (errorMessage.toLowerCase().includes('inactive')) {
            errorMessage = 'Konto nie jest aktywne. Sprawdź swój email.';
          } else if (errorMessage.toLowerCase().includes('email')) {
            errorMessage = 'Potwierdź swój adres email przed zalogowaniem';
          }
        }
      }
      
      setLoginError(errorMessage);
      
      if (!isWeb) {
        // Alert na mobile został usunięty - pokazujemy tylko banner
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Animated Background */}
      <LinearGradient
        colors={[Colors.gradientStart, Colors.gradientEnd, '#FF6B35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        {/* Decorative circles */}
        <View style={[styles.decorCircle, styles.circle1]} />
        <View style={[styles.decorCircle, styles.circle2]} />
        <View style={[styles.decorCircle, styles.circle3]} />
      </LinearGradient>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Back Button */}
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="calendar" size={56} color={Colors.accent} />
            </View>
            <Text style={styles.appName}>Sessly</Text>
            <Text style={styles.tagline}>Twój asystent rezerwacji</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Witaj ponownie! 👋</Text>
              <Text style={styles.subtitle}>Zaloguj się do swojego konta</Text>
            </View>

            {/* Error Banner */}
            {loginError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#c62828" />
                <Text style={styles.errorBannerText}>{loginError}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Input
                label="Nazwa użytkownika"
                placeholder="Wpisz nazwę użytkownika"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setErrors({ ...errors, username: undefined });
                  setLoginError('');
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
                  setLoginError('');
                }}
                error={errors.password}
                icon="lock-closed-outline"
                isPassword
              />

              <TouchableOpacity 
                style={styles.forgotPassword}
                onPress={() => {
                  if (isWeb) {
                    window.alert('Funkcja odzyskiwania hasła będzie wkrótce dostępna');
                  }
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

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  decorCircle: {
    position: 'absolute',
    borderRadius: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: -50,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    top: height * 0.4,
    right: -30,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: 40,
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
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  appName: {
    fontSize: 42,
    fontWeight: '900',
    color: 'white',
    marginBottom: 8,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
  },
  cardHeader: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#c62828',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: '#c62828',
    fontWeight: '600',
    lineHeight: 20,
  },
  form: {
    width: '100%',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotPasswordText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  loginButton: {
    marginTop: 8,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    height: 56,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
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
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '500',
  },
  registerLink: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '800',
  },
});
