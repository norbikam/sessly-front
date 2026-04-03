import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Colors, Spacing, BorderRadius, Typography, Shadows } from '../../constants/designTokens';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const isDark = useThemeColor({}, 'background') === Colors.dark.background;
  const theme = isDark ? 'dark' : 'light';
  const isDisabled = disabled || loading;

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: BorderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      ...Shadows.sm,
    };

    const sizeStyles: Record<ButtonSize, ViewStyle> = {
      sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 36 },
      md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 44 },
      lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, minHeight: 52 },
    };

    const variantStyles: Record<ButtonVariant, ViewStyle> = {
      primary: {
        backgroundColor: isDisabled ? Colors[theme].border : Colors.primary,
      },
      secondary: {
        backgroundColor: isDisabled ? Colors[theme].borderLight : Colors[theme].card,
        borderWidth: 1,
        borderColor: Colors.primary,
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: isDisabled ? Colors[theme].border : Colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
        shadowOpacity: 0,
        elevation: 0,
      },
      danger: {
        backgroundColor: isDisabled ? Colors[theme].border : Colors.error,
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(isDisabled && { opacity: 0.5 }),
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontWeight: Typography.fontWeight.medium,
      textAlign: 'center',
    };

    const sizeTextStyles: Record<ButtonSize, TextStyle> = {
      sm: { fontSize: Typography.fontSize.sm },
      md: { fontSize: Typography.fontSize.md },
      lg: { fontSize: Typography.fontSize.lg },
    };

    const variantTextStyles: Record<ButtonVariant, TextStyle> = {
      primary: { color: Colors.light.card },
      secondary: { color: isDisabled ? Colors[theme].textSecondary : Colors.primary },
      outline: { color: isDisabled ? Colors[theme].textSecondary : Colors.primary },
      ghost: { color: isDisabled ? Colors[theme].textSecondary : Colors.primary },
      danger: { color: Colors.light.card },
    };

    return {
      ...baseTextStyle,
      ...sizeTextStyles[size],
      ...variantTextStyles[variant],
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityLabel={accessibilityLabel || title}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      activeOpacity={0.8}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'danger' ? Colors.light.card : Colors.primary}
          style={{ marginRight: Spacing.sm }}
        />
      )}
      <Text style={getTextStyle()}>
        {loading ? 'Loading...' : title}
      </Text>
    </TouchableOpacity>
  );
}