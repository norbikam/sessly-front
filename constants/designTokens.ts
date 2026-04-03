/**
 * Sessly Design Tokens
 * Unified design system for consistent UI across mobile and web
 */

import { Platform } from 'react-native';

// Color Palette - Lavender/Purple Theme
const tintColorLight = '#8B5CF6'; // Main lavender/purple
const tintColorDark = '#A78BFA';

export const Colors = {
  // Primary brand colors
  primary: tintColorLight,
  primaryDark: tintColorDark,

  // Semantic colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Light theme
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
    tabIconDefault: '#9CA3AF',
    tabIconSelected: tintColorLight,
  },

  // Dark theme
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
    tabIconDefault: '#475569',
    tabIconSelected: tintColorDark,
  },
};

// Spacing scale (4px grid system)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border radius scale
export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Shadow system
export const Shadows = {
  sm: {
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#4C1D95',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Typography scale
export const Typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Z-index scale
export const ZIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modal: 1040,
  popover: 1050,
  tooltip: 1060,
  toast: 1070,
};

// Animation timings
export const Animations = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeOut: 'ease-out',
    easeIn: 'ease-in',
  },
};

// Platform-specific adjustments
export const PlatformStyles = {
  web: Platform.OS === 'web' ? {
    cursor: 'pointer',
    userSelect: 'none',
  } : {},
  mobile: Platform.OS !== 'web' ? {} : {},
};

// Breakpoints for responsive design
export const Breakpoints = {
  mobile: 0,
  tablet: 640,
  desktop: 1024,
  wide: 1280,
};

// Utility functions
export const getResponsiveValue = (values: { mobile?: any; tablet?: any; desktop?: any; wide?: any }) => {
  // This would be used with a hook like useResponsive
  return values;
};

export const getColor = (theme: 'light' | 'dark', colorKey: keyof typeof Colors.light) => {
  return Colors[theme][colorKey];
};

export const getSpacing = (size: keyof typeof Spacing) => Spacing[size];
export const getBorderRadius = (size: keyof typeof BorderRadius) => BorderRadius[size];
export const getShadow = (size: keyof typeof Shadows) => Shadows[size];
export const getFontSize = (size: keyof typeof Typography.fontSize) => Typography.fontSize[size];
export const getFontWeight = (weight: keyof typeof Typography.fontWeight) => Typography.fontWeight[weight];