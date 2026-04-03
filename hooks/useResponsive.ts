import { useWindowDimensions } from 'react-native';
import { Breakpoints } from '../constants/designTokens';

export type ScreenSize = 'mobile' | 'tablet' | 'desktop' | 'wide';

export const useResponsive = () => {
  const { width } = useWindowDimensions();

  const getScreenSize = (): ScreenSize => {
    if (width < Breakpoints.tablet) return 'mobile';
    if (width < Breakpoints.desktop) return 'tablet';
    if (width < Breakpoints.wide) return 'desktop';
    return 'wide';
  };

  const screenSize = getScreenSize();

  return {
    screenSize,
    width,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    isDesktop: screenSize === 'desktop',
    isWide: screenSize === 'wide',
    // Helper functions for conditional rendering
    whenMobile: (mobileValue: any, otherValue: any = null) =>
      screenSize === 'mobile' ? mobileValue : otherValue,
    whenTablet: (tabletValue: any, otherValue: any = null) =>
      screenSize === 'tablet' ? tabletValue : otherValue,
    whenDesktop: (desktopValue: any, otherValue: any = null) =>
      screenSize === 'desktop' ? desktopValue : otherValue,
    whenWide: (wideValue: any, otherValue: any = null) =>
      screenSize === 'wide' ? wideValue : otherValue,
  };
};