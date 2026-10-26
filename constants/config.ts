import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra || {}) as Record<string, string | undefined>;

/** Public marketing / legal site (privacy, terms). */
export const WEB_BASE_URL = (
  process.env.EXPO_PUBLIC_WEB_URL ||
  extra.webBaseUrl ||
  'https://sessly.pl'
).replace(/\/+$/, '');

export const PRIVACY_POLICY_URL =
  process.env.EXPO_PUBLIC_PRIVACY_URL || `${WEB_BASE_URL}/privacy`;

export const TERMS_URL =
  process.env.EXPO_PUBLIC_TERMS_URL || `${WEB_BASE_URL}/terms`;

export const SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL ||
  extra.supportEmail ||
  'support@sessly.com';

/** Hide phone verify UI until Twilio (or other SMS) is live. */
export const PHONE_VERIFY_ENABLED =
  String(
    process.env.EXPO_PUBLIC_PHONE_VERIFY_ENABLED ?? extra.phoneVerifyEnabled ?? 'false'
  ).toLowerCase() === 'true';

export const APP_STORE_SUPPORT_URL =
  process.env.EXPO_PUBLIC_SUPPORT_URL || `mailto:${SUPPORT_EMAIL}`;
