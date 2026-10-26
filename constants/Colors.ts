/**
 * Sessly color palette — default and named export are the same object.
 */

const tintColorLight = '#8B5CF6';
const tintColorDark = '#A78BFA';

const AppPalette = {
  accent: tintColorLight,
  primary: tintColorLight,
  primaryDark: tintColorDark,
  gradientStart: '#8B5CF6',
  gradientEnd: '#7C3AED',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  light: {
    text: '#1E293B',
    textSecondary: '#64748B',
    textTertiary: '#94A3B8',
    background: '#F8FAFC',
    backgroundSecondary: '#F1F5F9',
    card: '#FFFFFF',
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    tint: tintColorLight,
    accent: tintColorLight,
    icon: '#64748B',
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    textTertiary: '#64748B',
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    card: '#1E293B',
    border: '#334155',
    borderLight: '#475569',
    tint: tintColorDark,
    accent: tintColorDark,
    icon: '#94A3B8',
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
  },
  shadows: {
    sm: {
      shadowColor: '#4C1D95',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 4,
    },
    md: {
      shadowColor: '#4C1D95',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 15,
      elevation: 6,
    },
  },
};

export default AppPalette;
