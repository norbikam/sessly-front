import { router } from 'expo-router';
import { Platform } from 'react-native';

type AppRouter = Pick<typeof router, 'back' | 'canGoBack' | 'replace'>;

/**
 * After a hard refresh on web, router.canGoBack() can be true from browser
 * history while the in-app stack is empty — back then appears broken.
 * Expo Router stores navigation index on history.state.idx.
 */
function canSafelyGoBack(nav: AppRouter): boolean {
  if (!nav.canGoBack()) return false;
  if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
  const idx = (window.history.state as { idx?: number } | null)?.idx;
  if (typeof idx === 'number') return idx > 0;
  return false;
}

/** Back if in-app history exists; otherwise restore a known screen (keeps nav usable after refresh). */
export function goBackToApp(nav: AppRouter = router, fallback: string = '/(tabs)') {
  if (canSafelyGoBack(nav)) {
    nav.back();
    return;
  }
  nav.replace(fallback as any);
}
