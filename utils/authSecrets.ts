import { Platform } from 'react-native';

export type AuthSecretParams = {
  email?: string;
  code?: string;
  token?: string;
};

const VERIFY_HANDOFF_KEY = 'sessly_auth_verify_handoff';
const RESET_HANDOFF_KEY = 'sessly_auth_reset_handoff';

function webGet(key: string): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function webSet(key: string, value: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

function webDel(key: string): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function takeAuthSecrets(params: AuthSecretParams): {
  email: string;
  code: string;
  token: string;
} {
  return {
    email: (params.email || '').toString().trim(),
    code: (params.code || '').toString().trim(),
    token: (params.token || '').toString().trim(),
  };
}

/** Remove token/code from the browser address bar so they leave history/Referer. */
export function scrubAuthSecretsFromBrowserUrl(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of ['token', 'code']) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Capture secrets from deep-link params into sessionStorage (web), then scrub the URL.
 * On remount without query secrets, restore from the handoff bag.
 */
export function captureAndScrubAuthSecrets(
  params: AuthSecretParams,
  kind: 'verify' | 'reset',
): { email: string; code: string; token: string } {
  const key = kind === 'verify' ? VERIFY_HANDOFF_KEY : RESET_HANDOFF_KEY;
  const fromParams = takeAuthSecrets(params);

  if (fromParams.token || fromParams.code) {
    if (Platform.OS === 'web') {
      webSet(key, JSON.stringify(fromParams));
      scrubAuthSecretsFromBrowserUrl();
    }
    return fromParams;
  }

  if (Platform.OS === 'web') {
    try {
      const raw = webGet(key);
      if (raw) {
        const parsed = JSON.parse(raw) as AuthSecretParams;
        return takeAuthSecrets(parsed);
      }
    } catch {
      /* ignore */
    }
  }

  return fromParams;
}

export function clearAuthSecretHandoff(kind: 'verify' | 'reset'): void {
  webDel(kind === 'verify' ? VERIFY_HANDOFF_KEY : RESET_HANDOFF_KEY);
}
