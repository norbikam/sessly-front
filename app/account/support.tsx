import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '../../constants/Colors';
import {
  PRIVACY_POLICY_URL,
  SUPPORT_EMAIL,
  TERMS_URL,
} from '../../constants/config';

export default function SupportScreen() {
  const mail = () => {
    void Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Pomoc Sessly')}`
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Pomoc i kontakt</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lead}>
          Masz problem z rezerwacją, kontem lub salenem? Napisz do nas — odpowiadamy w
          dni robocze.
        </Text>

        <TouchableOpacity style={styles.card} onPress={mail}>
          <View style={styles.iconBox}>
            <Ionicons name="mail-outline" size={22} color={Colors.light.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>E-mail support</Text>
            <Text style={styles.cardSub}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push({ pathname: '/account/legal', params: { doc: 'terms' } })}
        >
          <View style={styles.iconBox}>
            <Ionicons name="document-text-outline" size={22} color={Colors.light.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Regulamin</Text>
            <Text style={styles.cardSub}>{TERMS_URL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() =>
            router.push({ pathname: '/account/legal', params: { doc: 'privacy' } })
          }
        >
          <View style={styles.iconBox}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color={Colors.light.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Polityka prywatności</Text>
            <Text style={styles.cardSub}>{PRIVACY_POLICY_URL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/account/delete-account')}
        >
          <View style={[styles.iconBox, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="trash-outline" size={22} color="#DC2626" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: '#DC2626' }]}>Usuń konto</Text>
            <Text style={styles.cardSub}>Trwałe usunięcie danych konta (RODO)</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
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
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: { marginRight: 15 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.light.text },
  content: { padding: 20, paddingBottom: 40 },
  lead: { fontSize: 14, color: '#64748B', lineHeight: 20, marginBottom: 16 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#111' },
  cardSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
});
