import type { Router } from 'expo-router';

/** Back if history exists; otherwise restore the tab shell (keeps bottom nav on web). */
export function goBackToApp(router: Router, fallback: string = '/(tabs)') {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(fallback as any);
}
