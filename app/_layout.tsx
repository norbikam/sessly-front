import React from 'react';
import { Slot } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  // od razu renderujemy Slot — bez sprawdzania stanu
  return (
    <AuthProvider>
      <Slot />
    </AuthProvider>
  );
}