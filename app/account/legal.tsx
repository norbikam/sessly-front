import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import Colors from '../../constants/Colors';
import { PRIVACY_POLICY_URL, TERMS_URL } from '../../constants/config';

const DOCS: Record<
  string,
  { title: string; url: string; summary: string }
> = {
  terms: {
    title: 'Regulamin',
    url: TERMS_URL,
    summary:
      'Regulamin określa zasady korzystania z Sessly jako marketplace rezerwacji wizyt, prawa i obowiązki klientów oraz salonów.',
  },
  privacy: {
    title: 'Polityka prywatności',
    url: PRIVACY_POLICY_URL,
    summary:
      'Polityka prywatności opisuje, jakie dane przetwarzamy (konto, rezerwacje, lokalizacja, powiadomienia), cele RODO oraz jak usunąć konto.',
  },
};

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc?: string }>();
  const key = doc === 'privacy' ? 'privacy' : 'terms';
  const content = DOCS[key];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{content.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>{content.summary}</Text>
        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => void Linking.openURL(content.url)}
        >
          <Ionicons name="open-outline" size={18} color="#fff" />
          <Text style={styles.openBtnText}>Otwórz pełny dokument</Text>
        </TouchableOpacity>
        <Text style={styles.urlHint}>{content.url}</Text>
        <Text style={styles.footnote}>
          Pełna treść jest publikowana na stronie Sessly. W razie pytań RODO napisz na
          adres support z ekranu Pomoc.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  content: { padding: 20, paddingBottom: 40 },
  body: { fontSize: 15, lineHeight: 24, color: '#334155' },
  openBtn: {
    marginTop: 20,
    backgroundColor: Colors.light.accent,
    borderRadius: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  openBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  urlHint: { marginTop: 12, fontSize: 12, color: '#94A3B8' },
  footnote: { marginTop: 24, fontSize: 12, color: '#94A3B8', lineHeight: 18 },
});
