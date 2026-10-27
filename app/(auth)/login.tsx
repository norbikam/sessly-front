import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  Platform, Dimensions, TouchableOpacity, Switch, ActivityIndicator,
  TextInput, Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '../../constants/Colors';
import { useLocale } from '../../contexts/LocaleContext';
import { getApiErrorPayload } from '../../api/errors';

const { height } = Dimensions.get('window');

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(true);
  const [switchingAccount, setSwitchingAccount] = useState<string | null>(null);

  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const { login, savedAccounts, switchAccount, removeSavedAccount } = useAuth();
  const { t } = useLocale();
  const router = useRouter();

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setLoginError('Wypełnij wszystkie pola.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);
    setLoginError('');
    setNeedsVerification(false);

    try {
      await login({ username: username.trim(), password }, rememberLogin);
      router.replace('/(tabs)');
    } catch (error: any) {
      const payload = getApiErrorPayload(error);
      let errorMessage = payload.message || error?.message || 'Nieprawidłowa nazwa użytkownika lub hasło';
      if (payload.code === 'EMAIL_NOT_VERIFIED') {
        errorMessage = 'Konto nieaktywne. Sprawdź e-mail, aby aktywować profil.';
        setNeedsVerification(true);
      }
      if (!error?.response) {
        errorMessage = payload.message || 'Brak połączenia z serwerem. Uruchom backend (port 8000).';
      }
      setLoginError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountSwitch = async (accountId: string) => {
    try {
      setSwitchingAccount(accountId);
      setLoginError('');
      await switchAccount(accountId);
      router.replace('/(tabs)');
    } catch (error: any) {
      setLoginError(error?.message || 'Nie udało się przełączyć konta.');
    } finally {
      setSwitchingAccount(null);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['#8B5CF6', '#7C3AED']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backgroundGradient}
      >
        <View style={[styles.decorCircle, styles.circle1]} />
        <View style={[styles.decorCircle, styles.circle2]} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        showsVerticalScrollIndicator={false}
        bounces={false}
        automaticallyAdjustKeyboardInsets
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => goBackToApp(router, '/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="sparkles" size={48} color={Colors.light.accent} />
          </View>
          <Text style={styles.appName}>Sessly</Text>
          <Text style={styles.tagline}>{t('auth.tagline')}</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.title}>{t('auth.welcomeBack')} 👋</Text>
            <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
          </View>

          {loginError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <View style={styles.errorContent}>
                <Text style={styles.errorBannerText}>{loginError}</Text>
                {needsVerification ? (
                  <TouchableOpacity onPress={() => router.push({ pathname: '/(auth)/verify-email', params: { email: username.includes('@') ? username : '' } })}>
                    <Text style={styles.verifyLink}>Wpisz kod lub wyślij nowy</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          ) : null}

          {savedAccounts.length ? (
            <View style={styles.savedSection}>
              <Text style={styles.savedTitle}>{t('auth.savedAccounts')}</Text>
              {savedAccounts.map((account) => (
                <View key={account.id} style={styles.savedAccount}>
                  <TouchableOpacity style={styles.savedMain} onPress={() => handleAccountSwitch(account.id)}>
                    <View style={styles.savedAvatar}>
                      <Text style={styles.savedAvatarText}>{(account.user.first_name || account.user.username).slice(0, 1).toUpperCase()}</Text>
                    </View>
                    <View style={styles.savedDetails}>
                      <Text style={styles.savedName}>{account.user.first_name || account.user.username}</Text>
                      <Text style={styles.savedRole}>{account.user.role === 'business_owner' ? 'Konto firmowe' : account.user.email}</Text>
                    </View>
                    {switchingAccount === account.id ? <ActivityIndicator color={Colors.light.accent} /> : <Ionicons name="chevron-forward" size={18} color="#64748B" />}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.forgetButton} onPress={() => removeSavedAccount(account.id)} accessibilityLabel="Usuń zapisane konto">
                    <Ionicons name="close" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              ))}
              <View style={styles.savedDivider} />
            </View>
          ) : null}

          <View style={styles.form}>
            <Input
              ref={usernameRef}
              label={t('auth.username')}
              placeholder={t('auth.username')}
              value={username}
              onChangeText={(value) => { setUsername(value); setLoginError(''); }}
              icon="person-outline"
              autoCapitalize="none"
              autoComplete="username"
              textContentType="username"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Input
              ref={passwordRef}
              label={t('auth.password')}
              placeholder={t('auth.password')}
              value={password}
              onChangeText={(value) => { setPassword(value); setLoginError(''); }}
              icon="lock-closed-outline"
              isPassword
              autoComplete="password"
              textContentType="password"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={handleLogin}
            />

            <View style={styles.loginOptions}>
              <View style={styles.rememberRow}>
                <Switch
                  value={rememberLogin}
                  onValueChange={setRememberLogin}
                  trackColor={{ false: '#CBD5E1', true: '#C4B5FD' }}
                  thumbColor={rememberLogin ? Colors.light.accent : '#fff'}
                />
                <Text style={styles.rememberText}>{t('auth.remember')}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotLink}>Zapomniałem hasła</Text>
              </TouchableOpacity>
            </View>

            <Button
              title={t('auth.signIn')}
              onPress={handleLogin}
              loading={loading}
              style={styles.loginButton}
            />

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>{t('auth.or')}</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>{t('auth.noAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.registerLink}>{t('auth.register')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#8B5CF6' },
  backgroundGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  decorCircle: { position: 'absolute', borderRadius: 1000, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  circle1: { width: 300, height: 300, top: -100, right: -100 },
  circle2: { width: 200, height: 200, bottom: height * 0.1, left: -50 },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40 },
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
  errorContent: { flex: 1 },
  verifyLink: { color: Colors.light.accent, fontWeight: '800', marginTop: 6 },
  form: { width: '100%' },
  loginOptions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: -6, marginBottom: 22 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 1 },
  rememberText: { color: '#475569', fontSize: 13, fontWeight: '600' },
  forgotLink: { color: Colors.light.accent, fontSize: 13, fontWeight: '800' },
  savedSection: { marginBottom: 16 },
  savedTitle: { color: '#334155', fontSize: 13, fontWeight: '800', marginBottom: 8 },
  savedAccount: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 14, marginBottom: 8 },
  savedMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10 },
  savedAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  savedAvatarText: { color: Colors.light.accent, fontWeight: '900' },
  savedDetails: { flex: 1, marginLeft: 10 },
  savedName: { color: '#1E293B', fontWeight: '800', fontSize: 14 },
  savedRole: { color: '#64748B', fontSize: 12, marginTop: 2 },
  forgetButton: { padding: 12 },
  savedDivider: { height: 1, backgroundColor: '#E2E8F0', marginTop: 8 },
  loginButton: { backgroundColor: Colors.light.accent, borderRadius: 16, height: 54, shadowColor: Colors.light.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  dividerText: { marginHorizontal: 16, color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
  registerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  registerText: { color: '#64748B', fontSize: 14, fontWeight: '500' },
  registerLink: { color: Colors.light.accent, fontSize: 14, fontWeight: '800' },
});
