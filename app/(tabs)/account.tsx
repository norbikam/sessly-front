import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  StatusBar,
  Alert,
  Switch,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { useAuth } from '../../contexts/AuthContext';
import type { User } from '../../contexts/AuthContext';

// --- nowe typy: unikamy kolizji z globalnym FormData ---
interface AuthFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
}

interface MenuItem {
  id: number;
  title: string;
  // dokładny typ nazwy ikony zgodny z Ionicons
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  badge?: number | string;
}

// Types
interface AuthScreenProps {
  onLogin: (userData: User) => void;
}

interface AccountDashboardProps {
  user: User;
  onLogout: () => void;
}

// Komponent Login/Register
const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [formData, setFormData] = useState<AuthFormData>({
    email: '',
    password: '',
    name: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (): Promise<void> => {
    if (!formData.email || !formData.password) {
      Alert.alert('Błąd', 'Wypełnij wszystkie wymagane pola');
      return;
    }

    setIsLoading(true);
    
    // Symulacja API call
    setTimeout(() => {
      const mockUser: User = {
        id: 1,
        name: formData.name || 'Jan Kowalski',
        email: formData.email,
        phone: formData.phone || '+48 123 456 789',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
        joinDate: '2023',
        totalVisits: 24,
        favoriteSpecialists: 3,
        points: 1250,
      };
      
      onLogin(mockUser);
      setIsLoading(false);
      Alert.alert('Sukces', isLogin ? 'Zalogowano pomyślnie!' : 'Konto utworzone!');
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.authContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      {/* Header */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.authHeader}
      >
        <Text style={styles.authTitle}>
          {isLogin ? 'Witaj ponownie!' : 'Dołącz do nas!'}
        </Text>
        <Text style={styles.authSubtitle}>
          {isLogin 
            ? 'Zaloguj się do swojego konta' 
            : 'Utwórz konto i zacznij rezerwować'
          }
        </Text>
      </LinearGradient>

      {/* Form */}
      <View style={styles.formContainer}>
        {!isLogin && (
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Imię i nazwisko"
              value={formData.name}
              onChangeText={(text: string) => setFormData({...formData, name: text})}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={formData.email}
            onChangeText={(text: string) => setFormData({...formData, email: text})}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {!isLogin && (
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Telefon"
              value={formData.phone}
              onChangeText={(text: string) => setFormData({...formData, phone: text})}
              keyboardType="phone-pad"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={20} color="#6B7280" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Hasło"
            value={formData.password}
            onChangeText={(text: string) => setFormData({...formData, password: text})}
            secureTextEntry
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {isLogin && (
          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Zapomniałeś hasła?</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.submitButtonGradient}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? 'Ładowanie...' : (isLogin ? 'Zaloguj się' : 'Utwórz konto')}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.switchContainer}>
          <Text style={styles.switchText}>
            {isLogin ? 'Nie masz konta?' : 'Masz już konto?'}
          </Text>
          <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
            <Text style={styles.switchLink}>
              {isLogin ? 'Zarejestruj się' : 'Zaloguj się'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Social Login */}
      <View style={styles.socialContainer}>
        <Text style={styles.socialTitle}>Lub zaloguj się przez</Text>
        <View style={styles.socialButtons}>
          <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
            <Ionicons name="logo-google" size={24} color="#DB4437" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
            <Ionicons name="logo-facebook" size={24} color="#4267B2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
            <Ionicons name="logo-apple" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

// Komponent Account Dashboard
const AccountDashboard: React.FC<AccountDashboardProps> = ({ user, onLogout }) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const menuItems: MenuItem[] = [
    { id: 1, title: 'Moje rezerwacje', icon: 'calendar-outline', color: '#6366F1', badge: '3' },
    { id: 2, title: 'Historia wizyt', icon: 'time-outline', color: '#10B981' },
    { id: 3, title: 'Ulubieni specjaliści', icon: 'heart-outline', color: '#EF4444', badge: user.favoriteSpecialists },
    { id: 4, title: 'Punkty lojalnościowe', icon: 'star-outline', color: '#F59E0B', badge: user.points },
    { id: 5, title: 'Metody płatności', icon: 'card-outline', color: '#8B5CF6' },
    { id: 6, title: 'Adresy', icon: 'location-outline', color: '#06B6D4' },
    { id: 7, title: 'Powiadomienia', icon: 'notifications-outline', color: '#84CC16' },
    { id: 8, title: 'Pomoc i wsparcie', icon: 'help-circle-outline', color: '#6B7280' },
  ];

  return (
    <ScrollView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      {/* Header Profile */}
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={[styles.profileHeader, { paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}
      >
        <View style={styles.profileInfo}>
          <Image source={{ uri: user.avatar }} style={styles.profileAvatar} />
          <View style={styles.profileDetails}>
            <Text style={styles.profileName}>{user.name}</Text>
            <Text style={styles.profileEmail}>{user.email}</Text>
            <Text style={styles.profileMember}>Członek od {user.joinDate}</Text>
          </View>
          <TouchableOpacity style={styles.editProfileButton}>
            <Ionicons name="pencil" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user.totalVisits}</Text>
          <Text style={styles.statLabel}>Wizyty</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user.favoriteSpecialists}</Text>
          <Text style={styles.statLabel}>Ulubieni</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{user.points}</Text>
          <Text style={styles.statLabel}>Punkty</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item: MenuItem) => (
          <TouchableOpacity key={item.id} style={styles.menuItem} activeOpacity={0.7}>
            <View style={styles.menuItemLeft}>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                <Ionicons name={item.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={item.color} />
              </View>
              <Text style={styles.menuItemTitle}>{item.title}</Text>
            </View>
            <View style={styles.menuItemRight}>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge.toString()}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Settings */}
      <View style={styles.settingsContainer}>
        <Text style={styles.settingsTitle}>Ustawienia</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={22} color="#6366F1" />
            <Text style={styles.settingText}>Powiadomienia push</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
            thumbColor={notificationsEnabled ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="moon-outline" size={22} color="#6366F1" />
            <Text style={styles.settingText}>Tryb ciemny</Text>
          </View>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#E5E7EB', true: '#6366F1' }}
            thumbColor={darkMode ? '#FFFFFF' : '#F3F4F6'}
          />
        </View>
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={22} color="#EF4444" />
        <Text style={styles.logoutText}>Wyloguj się</Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
};

// Main Account Screen
export default function AccountScreen() {
  const { isLoggedIn, user, logout } = useAuth();
  const router = useRouter();

  // poprawny handler logout: usuń sesję w kontekście i przepnij na ekran logowania
  const handleLogout = async () => {
    try {
      logout();
      // zastąp historię, żeby user nie mógł wrócić przyciskiem "back"
      router.replace('/(auth)/login');
    } catch (e) {
      console.log('Logout error', e);
      Alert.alert('Błąd', 'Nie udało się wylogować. Spróbuj ponownie.');
    }
  };

  if (!isLoggedIn) {
    return null;
  }

  return <AccountDashboard user={user!} onLogout={handleLogout} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // Auth Styles
  authContainer: {
    flexGrow: 1,
  },
  authHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    alignItems: 'center',
  },
  authTitle: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  authSubtitle: {
    color: 'white',
    fontSize: 16,
    opacity: 0.9,
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: '#6366F1',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    marginBottom: 24,
    borderRadius: 25,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  switchText: {
    color: '#6B7280',
    fontSize: 16,
    marginRight: 8,
  },
  switchLink: {
    color: '#6366F1',
    fontSize: 16,
    fontWeight: '600',
  },
  socialContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  socialTitle: {
    color: '#6B7280',
    fontSize: 16,
    marginBottom: 20,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Dashboard Styles
  profileHeader: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 2,
  },
  profileMember: {
    color: 'white',
    fontSize: 12,
    opacity: 0.8,
  },
  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginTop: -20,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuItemTitle: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});
