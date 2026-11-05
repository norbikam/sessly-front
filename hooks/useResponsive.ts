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

  const isDesktopUp = width >= Breakpoints.desktop;

  return {
    screenSize,
    width,
    isMobile: screenSize === 'mobile',
    isTablet: screenSize === 'tablet',
    /** Desktop band only (1024–1279). Prefer `isDesktopUp` for layout shells. */
    isDesktop: screenSize === 'desktop',
    isWide: screenSize === 'wide',
    isTabletUp: width >= Breakpoints.tablet,
    /** True from desktop breakpoint up (includes wide). */
    isDesktopUp,
    // Helper functions for conditional rendering
    whenMobile: (mobileValue: any, otherValue: any = null) =>
      screenSize === 'mobile' ? mobileValue : otherValue,
    whenTablet: (tabletValue: any, otherValue: any = null) =>
      screenSize === 'tablet' ? tabletValue : otherValue,
    whenDesktop: (desktopValue: any, otherValue: any = null) =>
      isDesktopUp ? desktopValue : otherValue,
    whenWide: (wideValue: any, otherValue: any = null) =>
      screenSize === 'wide' ? wideValue : otherValue,
  };
};