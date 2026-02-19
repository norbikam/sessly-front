import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import type { Service } from '../../types/api';

interface ServiceCardProps {
  service: Service;
  onBookClick: (service: Service) => void;
}

export default function ServiceCard({ service, onBookClick }: ServiceCardProps) {
  // Używamy poprawnych typów zdefiniowanych w types/api.ts
  const duration = service.duration_minutes;
  // Fallback dla ceny - jeśli price_amount jest niezdefiniowane, można wyświetlić np. '-'
  const price = service.price_amount !== undefined ? service.price_amount : '-';

  return (
    <View style={styles.serviceCard}>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <View style={styles.serviceMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{duration} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="cash-outline" size={16} color="#666" />
            <Text style={styles.metaText}>{price} PLN</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity 
        style={styles.bookButton}
        onPress={() => onBookClick(service)}
      >
        <Text style={styles.bookButtonText}>Zarezerwuj</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  serviceMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  bookButton: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});