import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { useThemeColor } from '../../hooks/useThemeColor';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/designTokens';
import { Ionicons } from '@expo/vector-icons';

interface FormInputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  secureTextEntry,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const textColor = useThemeColor({}, 'text');
  const backgroundColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');

  // ✅ Zastosowanie typu wyciągniętego wprost z TextInputProps
  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setIsFocused(true);
    textInputProps.onFocus?.(e);
  };

  // ✅ Zastosowanie typu wyciągniętego wprost z TextInputProps
  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setIsFocused(false);
    textInputProps.onBlur?.(e);
  };

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };

  const getBorderColor = () => {
    if (error) return Colors.error;
    if (isFocused) return Colors.primary;
    return borderColor;
  };

  const getRightIcon = () => {
    if (rightIcon) return rightIcon;
    if (secureTextEntry) {
      return isPasswordVisible ? 'eye-off' : 'eye';
    }
    return undefined;
  };

  const handleRightIconPress = () => {
    if (onRightIconPress) {
      onRightIconPress();
    } else if (secureTextEntry) {
      togglePasswordVisibility();
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, { color: textColor }, labelStyle]}>
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor,
            borderColor: getBorderColor(),
            borderWidth: isFocused || error ? 2 : 1,
          },
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? Colors.primary : Colors.light.textSecondary}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          {...textInputProps}
          style={[
            styles.input,
            {
              color: textColor,
              paddingLeft: leftIcon ? Spacing.xl : Spacing.md,
              paddingRight: getRightIcon() ? Spacing.xl : Spacing.md,
            },
            inputStyle,
          ]}
          placeholderTextColor={Colors.light.textSecondary}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {getRightIcon() && (
          <TouchableOpacity
            onPress={handleRightIconPress}
            style={styles.rightIconContainer}
            accessibilityLabel={secureTextEntry ? 'Toggle password visibility' : undefined}
          >
            <Ionicons
              name={getRightIcon() as keyof typeof Ionicons.glyphMap}
              size={20}
              color={Colors.light.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {(error || helperText) && (
        <Text
          style={[
            styles.helperText,
            { color: error ? Colors.error : Colors.light.textSecondary },
          ]}
        >
          {error || helperText}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.md,
    minHeight: 48,
  },
  leftIcon: {
    marginLeft: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    paddingVertical: Spacing.sm,
  },
  rightIconContainer: {
    padding: Spacing.sm,
    marginRight: Spacing.xs,
  },
  helperText: {
    fontSize: Typography.fontSize.xs,
    marginTop: Spacing.xs,
  },
});