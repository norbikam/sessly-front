import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../constants/Colors';
import { goBackToApp } from '../utils/navigation';

type Props = {
  title: string;
  body: string;
  showBack?: boolean;
};

export function LegalDocumentScreen({ title, body, showBack = true }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {showBack ? (
          <TouchableOpacity
            onPress={() => goBackToApp(router, '/(tabs)')}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Wróć"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.footnote}>
          Dokument roboczy. W razie pytań: support@sessly.pl
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
  backBtn: { width: 36, marginRight: 12 },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.text,
  },
  content: { padding: 20, paddingBottom: 48 },
  body: {
    fontSize: 15,
    lineHeight: 24,
    color: '#334155',
  },
  footnote: {
    marginTop: 28,
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 18,
  },
});
