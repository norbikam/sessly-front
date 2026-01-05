/**
 * Lavender-Purple Theme Colors
 * Piękna paleta lawendowo-fioletowa dla aplikacji Sessly
 */

const tintColorLight = '#8B7AB8';
const tintColorDark = '#B8A3E0';

const light = {
  background: '#FAF8FF',        // Bardzo jasny lawendowy
  primary: '#8B7AB8',           // Główny fiolet
  accent: '#9D8AC7',            // Jaśniejszy akcent
  gradientStart: '#B8A3E0',     // Jasny lawendowy
  gradientMid: '#9D8AC7',       // Średni fiolet
  gradientEnd: '#7B68A6',       // Głęboki fiolet
  text: '#2D2438',              // Ciemny fioletowy tekst
  muted: '#6B5B87',             // Przygaszony fiolet
  tint: '#8B7AB8',              // Tint color
  card: '#FFFFFF',              // Białe karty
  border: '#E5DFF5',            // Jasna lawendowa ramka
  success: '#7DB88E',           // Zielony sukces
  error: '#D98BA6',             // Różowy błąd
  warning: '#E5C07B',           // Pomarańczowe ostrzeżenie
};

const dark = {
  background: '#1A1425',        // Ciemny fioletowy
  primary: '#B8A3E0',           // Jasny lawendowy w dark mode
  accent: '#9D8AC7',            // Akcent
  gradientStart: '#9D8AC7',     // Gradient start
  gradientMid: '#8B7AB8',       // Gradient mid
  gradientEnd: '#6B5B87',       // Gradient end
  text: '#F5F3FF',              // Prawie biały tekst
  muted: '#9D8AC7',             // Przygaszony jasny fiolet
  tint: '#B8A3E0',              // Tint color
  card: '#2D2438',              // Ciemna karta
  border: '#3D3450',            // Ciemna ramka
  success: '#7DB88E',           // Zielony sukces
  error: '#D98BA6',             // Różowy błąd
  warning: '#E5C07B',           // Pomarańczowe ostrzeżenie
};

const Colors = {
  light,
  dark,
  // convenience shortcuts (używane domyślnie light mode)
  background: light.background,
  primary: light.primary,
  accent: light.accent,
  gradientStart: light.gradientStart,
  gradientMid: light.gradientMid,
  gradientEnd: light.gradientEnd,
  text: light.text,
  muted: light.muted,
  card: light.card,
  border: light.border,
  success: light.success,
  error: light.error,
  warning: light.warning,
};

export default Colors;
