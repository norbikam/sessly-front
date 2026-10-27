import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { goBackToApp } from '../../utils/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { updateCurrentUser } from '../../api/auth';
import Colors from '../../constants/Colors';
import { notify } from '../../utils/notify';

type UploadAsset = { uri: string; fileName?: string | null; mimeType?: string | null };

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateUser, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phone, setPhone] = useState(user?.phone_number || user?.phone || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [avatarAsset, setAvatarAsset] = useState<UploadAsset | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [loading, setLoading] = useState(false);

  const previewUri = avatarAsset?.uri || avatarUrl || null;
  const showPreview = Boolean(previewUri) && !avatarBroken;
  const initial = (firstName || user?.username || '?').trim().charAt(0).toUpperCase();

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Brak dostępu', 'Zezwól aplikacji na dostęp do zdjęć.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setAvatarBroken(false);
      setAvatarAsset(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      notify('Błąd', 'Imię i nazwisko są wymagane');
      return;
    }

    try {
      setLoading(true);
      const updated = await updateCurrentUser({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phone.trim() || undefined,
        avatar: avatarAsset || undefined,
      });

      if (updateUser) {
        await updateUser({
          ...updated,
          phone: updated.phone_number || phone.trim() || undefined,
        });
      }
      await refreshUser();

      notify('Sukces', 'Profil został zaktualizowany');
      goBackToApp(router, '/(tabs)/account');
    } catch (error: any) {
      console.error('❌ [EditProfile] Update error:', error);
      const msg =
        error?.response?.data?.detail
        || error?.response?.data?.error?.message
        || 'Nie udało się zaktualizować profilu';
      notify('Błąd', typeof msg === 'string' ? msg : 'Nie udało się zaktualizować profilu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackToApp(router, '/(tabs)/account')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edytuj profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={Platform.select({ web: { maxHeight: '100vh' } as any, default: styles.scrollView })}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarBtn} onPress={handlePickAvatar} activeOpacity={0.85}>
            {showPreview ? (
              <Image
                source={{ uri: previewUri as string }}
                style={styles.avatarImage}
                contentFit="cover"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarLetter}>{initial}</Text>
              </View>
            )}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePickAvatar}>
            <Text style={styles.changeAvatarText}>
              {showPreview ? 'Zmień zdjęcie profilowe' : 'Dodaj zdjęcie profilowe'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Kwadratowe zdjęcie · JPG/PNG/WebP · max 8 MB</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.input, styles.inputDisabled]}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <Text style={styles.inputTextDisabled}>{user?.email}</Text>
            </View>
            <Text style={styles.helperText}>Email nie może być zmieniony</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Imię <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.input}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Wpisz swoje imię"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Nazwisko <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.input}>
              <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Wpisz swoje nazwisko"
                placeholderTextColor="#999"
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <View style={styles.input}>
              <Ionicons name="call-outline" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.inputText}
                value={phone}
                onChangeText={setPhone}
                placeholder="+48 123 456 789"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Zapisz zmiany</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 14,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarBtn: { position: 'relative' },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 36, fontWeight: '900' },
  avatarImage: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#EDE9FE' },
  cameraBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changeAvatarText: {
    marginTop: 12,
    color: Colors.light.accent,
    fontWeight: '800',
    fontSize: 15,
  },
  avatarHint: { marginTop: 4, color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '800', color: '#64748B', marginBottom: 8, textTransform: 'uppercase' },
  required: { color: '#EF4444' },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
  },
  inputDisabled: { backgroundColor: '#F1F5F9' },
  inputIcon: { marginRight: 10 },
  inputText: { flex: 1, fontSize: 16, color: '#1E293B', fontWeight: '600' },
  inputTextDisabled: { flex: 1, fontSize: 16, color: '#94A3B8', fontWeight: '600' },
  helperText: { marginTop: 6, fontSize: 12, color: '#94A3B8' },
  saveButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: Colors.light.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
