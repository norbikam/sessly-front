import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import type { Business } from '../../types/api';

interface BusinessHeaderProps {
  business: Business;
  address: string;
  phone?: string;
  website?: string;
  favorite: boolean;
  favoriteScale: Animated.Value;
  onBack: () => void;
  onToggleFavorite: () => void;
  onShare: () => void;
  openPhone: (phone: string) => void;
  openWebsite: (url: string) => void;
}

export default function BusinessHeader({
  business,
  address,
  phone,
  website,
  favorite,
  favoriteScale,
  onBack,
  onToggleFavorite,
  onShare,
  openPhone,
  openWebsite,
}: BusinessHeaderProps) {
  return (
    <LinearGradient colors={[Colors.gradientStart, Colors.gradientEnd]} style={styles.header}>
      {/* Top buttons row */}
      <View style={styles.topButtons}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.rightButtons}>
          <TouchableOpacity onPress={onToggleFavorite} style={styles.iconButton}>
            <Animated.View style={{ transform: [{ scale: favoriteScale }] }}>
              <Ionicons 
                name={favorite ? "heart" : "heart-outline"} 
                size={24} 
                color={favorite ? "#e74c3c" : "#fff"} 
              />
            </Animated.View>
          </TouchableOpacity>

          <TouchableOpacity onPress={onShare} style={styles.iconButton}>
            <Ionicons name="share-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.headerContent}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="business" size={32} color="#fff" />
          </View>
        </View>

        <View style={styles.headerText}>
          <Text numberOfLines={2} style={styles.name}>
            {business.name}
          </Text>
          {address ? (
            <Text numberOfLines={2} style={styles.small}>
              {address}
            </Text>
          ) : null}
          <View style={styles.row}>
            {phone ? (
              <TouchableOpacity style={styles.chip} onPress={() => openPhone(phone)}>
                <Ionicons name="call" size={14} color={Colors.primary} />
                <Text style={styles.chipText} numberOfLines={1}>{phone}</Text>
              </TouchableOpacity>
            ) : null}
            {website ? (
              <TouchableOpacity style={styles.chip} onPress={() => openWebsite(website)}>
                <Ionicons name="globe" size={14} color={Colors.primary} />
                <Text style={styles.chipText} numberOfLines={1}>Strona WWW</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 60, // Dostosuj jeśli na web to inaczej wygląda
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  topButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  small: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  chipText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
});