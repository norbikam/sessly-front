/**
 * Lavender-Purple Theme
 * Paleta lawendowo-fioletowa dla aplikacji Sessly
 */

import { Platform } from 'react-native';

const tintColorLight = '#8B7AB8';
const tintColorDark = '#B8A3E0';

export const Colors = {
  light: {
    text: '#2D2438',              // Ciemny fioletowy tekst
    background: '#FAF8FF',        // Bardzo jasny lawendowy
    tint: tintColorLight,         // Fioletowy tint
    icon: '#6B5B87',              // Fioletowe ikony
    tabIconDefault: '#9D8AC7',    // Przygaszony fiolet dla nieaktywnych
    tabIconSelected: tintColorLight, // Aktywny tab
  },
  dark: {
    text: '#F5F3FF',              // Prawie biały tekst
    background: '#1A1425',        // Ciemny fioletowy
    tint: tintColorDark,          // Jasny lawendowy tint
    icon: '#9D8AC7',              // Fioletowe ikony
    tabIconDefault: '#6B5B87',    // Przygaszony dla nieaktywnych
    tabIconSelected: tintColorDark, // Aktywny tab
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
