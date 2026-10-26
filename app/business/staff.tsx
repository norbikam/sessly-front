import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { addBusinessStaff, getBusinessStaff, removeBusinessStaff, UploadAsset } from '../../api/business';
import Colors from '../../constants/Colors';
import { useLocation } from '../../contexts/LocationContext';
import { useColorScheme } from '../../hooks/useColorScheme';
import { BusinessStaff } from '../../types/api';
import { notify } from '../../utils/notify';

export default function StaffScreen() {
  const { activeLocation } = useLocation();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const palette = Colors[scheme];
  const [staff, setStaff] = useState<BusinessStaff[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatar, setAvatar] = useState<UploadAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!activeLocation?.slug) return setLoading(false);
    try {
      setStaff(await getBusinessStaff(activeLocation.slug));
    } finally {
      setLoading(false);
    }
  }, [activeLocation?.slug]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Brak dostępu', 'Zezwól aplikacji na dostęp do zdjęć.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) setAvatar(result.assets[0]);
  };

  const add = async () => {
    if (!activeLocation?.slug || !username.trim() || !password || !firstName.trim()) {
      notify('Uzupełnij dane', 'Podaj login, hasło i imię pracownika.');
      return;
    }
    try {
      setSaving(true);
      const member = await addBusinessStaff(activeLocation.slug, {
        username: username.trim(),
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        avatar: avatar || undefined,
      });
      setStaff((current) => [...current, member]);
      setUsername('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setAvatar(null);
      notify('Pracownik dodany', `Konto ${member.username} zostało utworzone dla ${activeLocation.name}.`);
    } catch (error: any) {
      const details = error?.response?.data;
      notify(
        'Nie udało się dodać',
        details?.username?.[0] || details?.error?.message || details?.detail || 'Sprawdź login i hasło.',
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = (member: BusinessStaff) => {
    if (!activeLocation?.slug) return;
    Alert.alert('Usuń pracownika?', 'Utraci dostęp do grafiku tego miejsca.', [
      { text: 'Anuluj', style: 'cancel' },
      {
        text: 'Usuń',
        style: 'destructive',
        onPress: async () => {
          await removeBusinessStaff(activeLocation.slug, member.id);
          setStaff((current) => current.filter((item) => item.id !== member.id));
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: palette.card, borderBottomColor: palette.border }]}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={23} color={palette.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.title, { color: palette.text }]}>Pracownicy</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            Sub-konta dla: {activeLocation?.name || 'wybranego miejsca'}
          </Text>
        </View>
      </View>

      <View style={[styles.inviteCard, { backgroundColor: palette.card }]}>
        <Text style={[styles.cardTitle, { color: palette.text }]}>Nowe konto pracownika</Text>
        <Text style={[styles.hint, { color: palette.textSecondary }]}>
          Firma zakłada login bez adresu e-mail. Pracownik loguje się do tego miejsca.
        </Text>
        <TouchableOpacity style={styles.avatarPicker} onPress={pickAvatar}>
          {avatar?.uri ? (
            <Image source={{ uri: avatar.uri }} style={styles.avatarPreview} />
          ) : (
            <Ionicons name="camera-outline" size={22} color={Colors.light.accent} />
          )}
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
          value={username}
          onChangeText={setUsername}
          placeholder="Login"
          placeholderTextColor={palette.textSecondary}
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
          value={password}
          onChangeText={setPassword}
          placeholder="Hasło"
          placeholderTextColor={palette.textSecondary}
          secureTextEntry
        />
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.half, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Imię"
            placeholderTextColor={palette.textSecondary}
          />
          <TextInput
            style={[styles.input, styles.half, { color: palette.text, backgroundColor: palette.background, borderColor: palette.border }]}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Nazwisko"
            placeholderTextColor={palette.textSecondary}
          />
        </View>
        <TouchableOpacity style={styles.addButton} onPress={add} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.addButtonText}>Utwórz konto</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
          ListEmptyComponent={<Text style={[styles.empty, { color: palette.textSecondary }]}>Nie dodano jeszcze pracowników do tego miejsca.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.member, { backgroundColor: palette.card, borderColor: palette.border }]}
              onPress={() => router.push({ pathname: '/business/staff-stats', params: { id: item.id } } as any)}
            >
              <View style={styles.avatar}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.memberPhoto} />
                ) : (
                  <Text style={styles.avatarText}>{(item.first_name || item.username).slice(0, 1).toUpperCase()}</Text>
                )}
              </View>
              <View style={styles.memberInfo}>
                <Text style={[styles.memberName, { color: palette.text }]}>
                  {item.first_name ? `${item.first_name} ${item.last_name || ''}` : item.username}
                </Text>
                <Text style={[styles.memberEmail, { color: palette.textSecondary }]}>
                  login: {item.username}{item.location_name ? ` · ${item.location_name}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.hoursButton}
                onPress={(event) => {
                  event.stopPropagation();
                  const label = item.first_name
                    ? `${item.first_name} ${item.last_name || ''}`.trim()
                    : item.username;
                  router.push({
                    pathname: '/business/staff-hours',
                    params: { id: item.id, name: label },
                  } as any);
                }}
              >
                <Ionicons name="time-outline" size={19} color={Colors.light.accent} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={(event) => {
                  event.stopPropagation();
                  remove(item);
                }}
              >
                <Ionicons name="trash-outline" size={19} color="#DC2626" />
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 16, borderBottomWidth: 1 },
  back: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  title: { fontSize: 22, fontWeight: '900' },
  subtitle: { fontSize: 12, marginTop: 2 },
  inviteCard: { margin: 16, padding: 18, borderRadius: 18 },
  cardTitle: { fontSize: 17, fontWeight: '800' },
  hint: { fontSize: 12, lineHeight: 18, marginTop: 4, marginBottom: 14 },
  avatarPicker: {
    width: 64, height: 64, borderRadius: 18, backgroundColor: '#EDE9FE',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12, overflow: 'hidden',
  },
  avatarPreview: { width: '100%', height: '100%' },
  input: { height: 50, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  addButton: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.accent, marginTop: 4 },
  addButtonText: { color: '#fff', fontWeight: '800' },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16 },
  member: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 10, borderRadius: 16, borderWidth: 1 },
  avatar: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EDE9FE', overflow: 'hidden' },
  memberPhoto: { width: '100%', height: '100%' },
  avatarText: { color: Colors.light.accent, fontSize: 17, fontWeight: '900' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 15, fontWeight: '800' },
  memberEmail: { fontSize: 12, marginTop: 3 },
  hoursButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F3FF', marginRight: 6 },
  removeButton: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEF2F2' },
  empty: { textAlign: 'center', marginTop: 36 },
});
