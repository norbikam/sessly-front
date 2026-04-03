import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, 
  Platform, Dimensions, TouchableOpacity 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setLoginError('Wypełnij wszystkie pola.');
      return;
    }

    setLoading(true);
    setLoginError('');
    
    try {
      await login({ username, password });
      router.replace('/(tabs)');
    } catch (error: any) {
      let errorMessage = 'Nieprawidłowa nazwa użytkownika lub hasło';
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail.toLowerCase();
        if (detail.includes('inactive') || detail.includes('email')) {
          errorMessage = 'Konto nieaktywne. Sprawdź e-mail, aby aktywować profil.';
        }
      }
      setLoginError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Lawendowy Gradient w tle */}
      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <View style={[styles.decorCircle, styles.circle1]} />
        <View style={[styles.decorCircle, styles.circle2]} />
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
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Ionicons name="sparkles" size={48} color={Colors.light.accent} />
            </View>
            <Text style={styles.appName}>Sessly</Text>
            <Text style={styles.tagline}>Twój asystent rezerwacji</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Witaj ponownie! 👋</Text>
              <Text style={styles.subtitle}>Zaloguj się do swojego konta</Text>
            </View>

            {loginError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.errorBannerText}>{loginError}</Text>
              </View>
            ) : null}

            <View style={styles.form}>
              <Input
                label="Nazwa użytkownika"
                placeholder="Twój login"
                value={username}
                onChangeText={(t) => { setUsername(t); setLoginError(''); }}
                icon="person-outline"
                autoCapitalize="none"
              />

              <Input
                label="Hasło"
                placeholder="Twoje hasło"
                value={password}
                onChangeText={(t) => { setPassword(t); setLoginError(''); }}
                icon="lock-closed-outline"
                isPassword
              />

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Zapomniałeś hasła?</Text>
              </TouchableOpacity>

              <Button
                title="Zaloguj się"
                onPress={handleLogin}
                loading={loading}
                style={styles.loginButton}
              />

              <View style={styles.dividerContainer}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>lub</Text>
                <View style={styles.divider} />
              </View>

              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Nie masz konta? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                  <Text style={styles.registerLink}>Zarejestruj się</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#8B5CF6' },
  backgroundGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  decorCircle: { position: 'absolute', borderRadius: 1000, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  circle1: { width: 300, height: 300, top: -100, right: -100 },
  circle2: { width: 200, height: 200, bottom: height * 0.1, left: -50 },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, justifyContent: 'center' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255, 255, 255, 0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  logoSection: { alignItems: 'center', marginBottom: 30 },
  logoCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
  appName: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  tagline: { fontSize: 16, color: 'rgba(255, 255, 255, 0.9)', fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 28, padding: 24, shadowColor: '#4C1D95', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 12 },
  cardHeader: { marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#1F2937', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 12, marginBottom: 20, gap: 8 },
  errorBannerText: { flex: 1, fontSize: 13, color: '#EF4444', fontWeight: '600' },
  form: { width: '100%' },
  forgotPassword: { alignSelf: 'flex-end', marginTop: -8, marginBottom: 24 },
  forgotPasswordText: { color: Colors.light.accent, fontSize: 13, fontWeight: '700' },
  loginButton: { backgroundColor: Colors.light.accent, borderRadius: 16, height: 54, shadowColor: Colors.light.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 16, color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  registerLink: { color: Colors.light.accent, fontSize: 14, fontWeight: '800' },
});