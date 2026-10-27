import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { goBackToApp } from '../../utils/navigation';
import * as ImagePicker from 'expo-image-picker';

import { deleteBusinessImage, getBusinessGallery, uploadBusinessImage, UploadAsset } from '../../api/business';
import Colors from '../../constants/Colors';
import { useLocation } from '../../contexts/LocationContext';
import { BusinessImage } from '../../types/api';
import { notify } from '../../utils/notify';

export default function BusinessGalleryScreen() {
  const { activeLocation } = useLocation();
  const activeSlug = activeLocation?.slug;
  const [images, setImages] = useState<BusinessImage[]>([]);
  const [asset, setAsset] = useState<UploadAsset | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadGallery = useCallback(async () => {
    if (!activeSlug) {
      setLoading(false);
      return;
    }
    try {
      setImages(await getBusinessGallery(activeSlug));
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się pobrać galerii.');
    } finally {
      setLoading(false);
    }
  }, [activeSlug]);

  useEffect(() => {
    void Promise.resolve().then(loadGallery);
  }, [loadGallery]);

  const handleAdd = async () => {
    if (!activeLocation?.slug || !asset) return;
    try {
      setSaving(true);
      const image = await uploadBusinessImage(activeLocation.slug, asset, {
        caption: caption.trim(),
        is_cover: images.length === 0,
        sort_order: images.length,
      });
      setImages((current) => [...current, image]);
      setAsset(null);
      setCaption('');
    } catch (error: any) {
      notify('Błąd', error?.response?.data?.error?.message || error?.message || 'Nie udało się dodać zdjęcia.');
    } finally {
      setSaving(false);
    }
  };

  const handlePick = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      notify('Brak dostępu', 'Zezwól aplikacji na dostęp do zdjęć.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });
    if (!result.canceled) setAsset(result.assets[0]);
  };

  const handleDelete = async (image: BusinessImage) => {
    if (!activeLocation?.slug) return;
    try {
      await deleteBusinessImage(activeLocation.slug, image.id);
      setImages((current) => current.filter((item) => item.id !== image.id));
    } catch (error: any) {
      notify('Błąd', error?.message || 'Nie udało się usunąć zdjęcia.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => goBackToApp(router, '/(tabs)')}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Galeria</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Zdjęcie</Text>
        <TouchableOpacity style={styles.picker} onPress={handlePick}>
          {asset ? (
            <Image source={{ uri: asset.uri }} style={styles.preview} contentFit="cover" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={30} color={Colors.light.accent} />
              <Text style={styles.pickerTitle}>Wybierz z urządzenia</Text>
              <Text style={styles.pickerHint}>JPG, PNG lub WebP · maks. 8 MB</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.label}>Podpis</Text>
        <TextInput style={styles.input} value={caption} onChangeText={setCaption} placeholder="Opcjonalny opis" />
        <TouchableOpacity style={[styles.addButton, (!asset || saving) && styles.disabled]} onPress={handleAdd} disabled={!asset || saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.addButtonText}>Prześlij zdjęcie</Text>}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={Colors.light.accent} />
      ) : (
        <FlatList
          data={images}
          keyExtractor={(item) => item.id}
          numColumns={Platform.OS === 'web' ? 3 : 2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          ListEmptyComponent={<Text style={styles.empty}>Galeria jest jeszcze pusta.</Text>}
          renderItem={({ item }) => (
            <View style={styles.imageCard}>
              <Image source={{ uri: item.url }} style={styles.image} contentFit="cover" />
              {item.is_cover ? <Text style={styles.coverBadge}>Okładka</Text> : null}
              {item.caption ? <Text style={styles.caption} numberOfLines={2}>{item.caption}</Text> : null}
              <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
                <Ionicons name="trash-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '900', color: Colors.light.text },
  form: { margin: 20, padding: 18, borderRadius: 20, backgroundColor: '#fff' },
  label: { color: Colors.light.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 6, textTransform: 'uppercase' },
  input: { height: 48, borderRadius: 12, paddingHorizontal: 14, backgroundColor: '#F1F5F9', color: Colors.light.text, marginBottom: 12 },
  picker: { height: 150, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#C4B5FD', backgroundColor: '#FAF5FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16, overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  pickerTitle: { color: Colors.light.accent, fontWeight: '800', marginTop: 8 },
  pickerHint: { color: '#64748B', fontSize: 12, marginTop: 4 },
  addButton: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.light.accent },
  addButtonText: { color: '#fff', fontWeight: '800' },
  disabled: { opacity: 0.55 },
  loader: { marginTop: 40 },
  list: { padding: 20, paddingTop: 0 },
  row: { gap: 12 },
  imageCard: { flex: 1, minWidth: 0, borderRadius: 16, padding: 8, marginBottom: 12, backgroundColor: '#fff' },
  image: { width: '100%', aspectRatio: 1.4, borderRadius: 12, backgroundColor: '#EDE9FE' },
  coverBadge: { position: 'absolute', left: 14, top: 14, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, color: '#fff', backgroundColor: Colors.light.accent, fontSize: 11, fontWeight: '800' },
  caption: { color: Colors.light.textSecondary, fontSize: 12, marginTop: 8, paddingRight: 28 },
  deleteButton: { position: 'absolute', right: 10, bottom: 8, padding: 6 },
  empty: { color: Colors.light.textSecondary, textAlign: 'center', marginTop: 30 },
});
