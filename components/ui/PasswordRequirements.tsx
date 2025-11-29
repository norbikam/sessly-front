import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PasswordRequirementsProps {
  password: string;
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({ password }) => {
  const requirements = [
    { text: 'Minimum 8 znaków', test: (p: string) => p.length >= 8 },
    { text: 'Przynajmniej jedna wielka litera', test: (p: string) => /[A-Z]/.test(p) },
    { text: 'Przynajmniej jedna cyfra', test: (p: string) => /[0-9]/.test(p) },
    { text: 'Przynajmniej jeden znak specjalny', test: (p: string) => /[!@#$%^&*]/.test(p) },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Wymagania hasła:</Text>
      {requirements.map((req, index) => {
        const isValid = req.test(password);
        return (
          <View key={index} style={styles.requirement}>
            <Ionicons
              name={isValid ? 'checkmark-circle' : 'close-circle'}
              size={16}
              color={isValid ? '#4CAF50' : '#999'}
            />
            <Text style={[styles.text, isValid && styles.validText]}>
              {req.text}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
    color: '#999',
    marginLeft: 8,
  },
  validText: {
    color: '#4CAF50',
  },
});
