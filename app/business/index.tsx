import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';

const MenuOption = ({ title, icon, subtitle, route }: any) => {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.optionCard} onPress={() => router.push(route)}>
      <View style={[styles.iconContainer, { backgroundColor: '#e6fffa' }]}>
        <Ionicons name={icon} size={24} color={Colors.tint || '#319795'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#ccc" />
    </TouchableOpacity>
  );
};

export default function BusinessDashboard() {
  const { user } = useAuth();
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Cześć, {user?.username}!</Text>
        <Text style={styles.subGreeting}>Panel zarządzania {user?.business?.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Twój Biznes</Text>
        
        <MenuOption 
          title="Edytuj Profil" 
          subtitle="Adres, telefon, opis, zdjęcia"
          icon="business-outline"
          route="/business/edit-profile"
        />

        <MenuOption 
          title="Godziny Otwarcia" 
          subtitle="Zarządzaj dostępnością firmy"
          icon="time-outline"
          route="/business/opening-hours"
        />

        <MenuOption 
          title="Moje Usługi" 
          subtitle="Dodaj lub edytuj cennik usług"
          icon="list-outline"
          route="/business/manage-services"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Kalendarz</Text>
        <MenuOption 
          title="Grafik Wizyt" 
          subtitle="Zobacz nadchodzące rezerwacje"
          icon="calendar-outline"
          route="/business/schedule"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 25, paddingTop: 70, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subGreeting: { fontSize: 16, color: '#666', marginTop: 5 },
  section: { padding: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  optionCard: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    padding: 16, borderRadius: 16, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 5, elevation: 1
  },
  iconContainer: { 
    width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 
  },
  optionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  optionSubtitle: { fontSize: 13, color: '#888', marginTop: 2 }
});