import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Colors, Spacing, BorderRadius, Shadows } from '../../constants/designTokens';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: keyof typeof Spacing;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  borderRadius?: keyof typeof BorderRadius;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'md',
  shadow = 'sm',
  borderRadius = 'md',
}) => {
  const backgroundColor = useThemeColor({}, 'card');

  const cardStyle: ViewStyle = {
    backgroundColor,
    borderRadius: BorderRadius[borderRadius],
    padding: Spacing[padding],
    ...(shadow !== 'none' && Shadows[shadow]),
    ...style,
  };

  return <View style={cardStyle}>{children}</View>;
};