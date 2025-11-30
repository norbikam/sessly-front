import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

interface OpeningHour {
  day_of_week: number;
  day_name: string;
  is_closed: boolean;
  open_time: string | null;
  close_time: string | null;
}

interface OpeningHoursCardProps {
  hours: OpeningHour[];
}

export default function OpeningHoursCard({ hours }: OpeningHoursCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!hours || hours.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      {/* Collapsible Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="time-outline" size={24} color={Colors.accent} />
          <Text style={styles.title}>Godziny otwarcia</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color="#999"
        />
      </TouchableOpacity>

      {/* Collapsible Content */}
      {expanded && (
        <View style={styles.content}>
          {hours.map((hour, index) => (
            <View
              key={index}
              style={[
                styles.row,
                index === hours.length - 1 && styles.lastRow,
              ]}
            >
              <Text style={styles.dayName}>{hour.day_name}</Text>
              {hour.is_closed ? (
                <Text style={styles.closedText}>Zamknięte</Text>
              ) : (
                <Text style={styles.hoursText}>
                  {hour.open_time?.slice(0, 5)} - {hour.close_time?.slice(0, 5)}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  dayName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  hoursText: {
    fontSize: 15,
    color: '#666',
  },
  closedText: {
    fontSize: 15,
    color: '#999',
    fontStyle: 'italic',
  },
});