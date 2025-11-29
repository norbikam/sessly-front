/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

const light = {
  background: '#FFF6F5',
  primary: '#FF6B35',
  accent: '#FF4C2E',
  gradientStart: '#FF7A59',
  gradientMid: '#FF8A6B',
  gradientEnd: '#FF5E3A',
  text: '#222',
  muted: '#666',
  tint: '#FF6B35',
};

const dark = {
  background: '#1A0F0D',
  primary: '#FF6B35',
  accent: '#FF4C2E',
  gradientStart: '#FF7A59',
  gradientMid: '#FF5E3A',
  gradientEnd: '#FF2E12',
  text: '#fff',
  muted: '#aaa',
  tint: '#FF6B35',
};

const Colors = {
  light,
  dark,
  // convenience shortcuts (optional)
  background: light.background,
  primary: light.primary,
  accent: light.accent,
  gradientStart: light.gradientStart,
  gradientMid: light.gradientMid,
  gradientEnd: light.gradientEnd,
};

export default Colors;
