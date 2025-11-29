import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  icon,
  isPassword = false,
  style,
  ...props
}: InputProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);
  const lastFocusAt = useRef<number>(0);
  const isProgrammaticRefocus = useRef(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        error && styles.inputContainerError,
      ]}>
        {icon && (
          <Ionicons
            name={icon}
            size={20}
            color={error ? '#FF3B30' : isFocused ? '#FF6B35' : '#999'}
            style={styles.icon}
          />
        )}
        
        <TextInput
          ref={inputRef}
          style={[styles.input, style]}
          placeholderTextColor="#999"
          secureTextEntry={isPassword && !isPasswordVisible}
          onFocus={() => {
            // ignore duplicate focus events
            if (isFocused) return;
            // if this focus was triggered by our programmatic refocus, accept and clear flag
            if (isProgrammaticRefocus.current) {
              isProgrammaticRefocus.current = false;
            }
            lastFocusAt.current = Date.now();
            setIsFocused(true);
          }}
          onBlur={() => {
            const now = Date.now();
            const delta = now - (lastFocusAt.current || 0);
            // if blur happens immediately after focus, refocus once (workaround)
            if (delta < 120 && !isProgrammaticRefocus.current) {
              isProgrammaticRefocus.current = true;
              setTimeout(() => inputRef.current?.focus(), 60);
              return;
            }
            setIsFocused(false);
          }}
          autoComplete='off' autoCorrect={false} textContentType={isPassword ? 'none' : undefined}
          importantForAutofill='no'
          {...props}
        />
        
        {isPassword && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={isFocused ? '#FF6B35' : '#999'}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={14} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    paddingHorizontal: 16,
    height: 52,
  },
  inputContainerFocused: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF',
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputContainerError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  icon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    minHeight: 52,
    paddingVertical: Platform.OS === 'ios' ? 16 : 12,
  },
  eyeIcon: {
    padding: 4,
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
    marginLeft: 4,
  },
});