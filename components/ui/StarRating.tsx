import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  rating: number;
  max?: number;
  size?: number;
  color?: string;
  style?: ViewStyle;
};

/** Read-only star row — Ionicons only, no emoji/glyphs. */
export function StarRating({
  rating,
  max = 5,
  size = 16,
  color = '#F59E0B',
  style,
}: Props) {
  const filled = Math.max(0, Math.min(max, Math.round(Number(rating) || 0)));
  return (
    <View style={[styles.row, style]} accessibilityLabel={`${filled} z ${max} gwiazdek`}>
      {Array.from({ length: max }, (_, i) => (
        <Ionicons
          key={i}
          name={i < filled ? 'star' : 'star-outline'}
          size={size}
          color={color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
