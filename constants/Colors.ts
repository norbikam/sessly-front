const tintColorLight = '#8B5CF6'; // Główny lawendowy / fiolet
const tintColorDark = '#A78BFA';

export default {
  // ✅ Wystawione na zewnątrz dla kompatybilności ze starszymi komponentami (jak BookingModal)
  accent: tintColorLight,
  
  // ✅ Struktura dla nowych/zaktualizowanych ekranów
  light: {
    text: '#1E293B',
    textSecondary: '#64748B',
    background: '#F8FAFC',
    card: '#FFFFFF',
    tint: tintColorLight,
    accent: tintColorLight,
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
    border: '#E2E8F0',
    error: '#EF4444',
    success: '#10B981',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0F172A',
    card: '#1E293B',
    tint: tintColorDark,
    accent: tintColorDark,
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
    border: '#334155',
    error: '#F87171',
    success: '#34D399',
  },
  shadows: {
    sm: { 
      shadowColor: '#4C1D95', 
      shadowOffset: { width: 0, height: 4 }, 
      shadowOpacity: 0.06, 
      shadowRadius: 10, 
      elevation: 4 
    },
    md: { 
      shadowColor: '#4C1D95', 
      shadowOffset: { width: 0, height: 6 }, 
      shadowOpacity: 0.1, 
      shadowRadius: 15, 
      elevation: 6 
    }
  }
};