import { Platform } from 'react-native';
import Constants from 'expo-constants';

import apiClient from '../api/client';

type PurchasesModule = typeof import('react-native-purchases');

let Purchases: PurchasesModule['default'] | null = null;
let sdkConfigured = false;
let loggedInAs: string | null = null;

function apiKeyForPlatform(): string {
  const extra = (Constants.expoConfig?.extra || {}) as Record<string, string | undefined>;
  if (Platform.OS === 'ios') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ||
      extra.revenueCatIosKey ||
      ''
    );
  }
  if (Platform.OS === 'android') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ||
      extra.revenueCatAndroidKey ||
      ''
    );
  }
  return '';
}

export function isStoreBillingAvailable(): boolean {
  return Platform.OS === 'ios' || Platform.OS === 'android';
}

export function hasRevenueCatKey(): boolean {
  return Boolean(apiKeyForPlatform());
}

async function loadPurchases(): Promise<PurchasesModule['default'] | null> {
  if (!isStoreBillingAvailable()) return null;
  if (Purchases) return Purchases;
  try {
    const mod = await import('react-native-purchases');
    Purchases = mod.default;
    return Purchases;
  } catch {
    return null;
  }
}

/** Log into RevenueCat as loc_<businessId> for 1:1 location billing. */
export async function prepareLocationPurchase(businessId: string): Promise<{
  appUserId: string;
  productId: string;
  packageToBuy: import('react-native-purchases').PurchasesPackage | null;
  offeringError?: string;
}> {
  const { data } = await apiClient.get<any>(
    `/payments/location-subscriptions/${businessId}/offer/`
  );
  const offer = data?.data || data;
  const appUserId: string = offer.revenuecat_app_user_id;
  const productId: string = offer.product_id;

  const RC = await loadPurchases();
  const key = apiKeyForPlatform();
  if (!RC || !key) {
    return {
      appUserId,
      productId,
      packageToBuy: null,
      offeringError: 'Brak klucza RevenueCat w buildzie (EXPO_PUBLIC_REVENUECAT_*_KEY).',
    };
  }

  if (!sdkConfigured) {
    RC.configure({ apiKey: key });
    sdkConfigured = true;
  }
  if (loggedInAs !== appUserId) {
    await RC.logIn(appUserId);
    loggedInAs = appUserId;
  }

  try {
    await RC.setAttributes({ business_id: businessId });
  } catch {
    // optional
  }

  const offerings = await RC.getOfferings();
  const current = offerings.current;
  let packageToBuy =
    current?.availablePackages.find(
      (p) => p.product.identifier === productId
    ) || null;
  if (!packageToBuy && current?.availablePackages?.length) {
    packageToBuy =
      current.availablePackages.find((p) => p.identifier === '$rc_monthly') ||
      current.availablePackages[0];
  }

  return {
    appUserId,
    productId,
    packageToBuy,
    offeringError: packageToBuy
      ? undefined
      : `Brak pakietu w RevenueCat Offering (szukano product_id=${productId}).`,
  };
}

export async function purchaseLocationSubscription(businessId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isStoreBillingAvailable()) {
    return {
      ok: false,
      message: 'Zakupy w sklepie działają tylko w aplikacji iOS / Android.',
    };
  }

  const prepared = await prepareLocationPurchase(businessId);
  const RC = await loadPurchases();
  if (!RC || !prepared.packageToBuy) {
    return {
      ok: false,
      message: prepared.offeringError || 'Nie udało się przygotować zakupu.',
    };
  }

  try {
    const { customerInfo } = await RC.purchasePackage(prepared.packageToBuy);
    const entitlementId =
      process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'location_access';
    const active = Boolean(customerInfo.entitlements.active[entitlementId]);
    return {
      ok: active || true,
      message: active
        ? 'Subskrypcja aktywna. Status zaktualizuje się za chwilę.'
        : 'Zakup przyjęty. Status zaktualizuje webhook RevenueCat.',
    };
  } catch (e: any) {
    if (e?.userCancelled) {
      return { ok: false, message: 'Anulowano.' };
    }
    return {
      ok: false,
      message: e?.message || 'Nie udało się dokończyć zakupu.',
    };
  }
}

export async function restoreLocationPurchases(businessId: string): Promise<{
  ok: boolean;
  message: string;
}> {
  if (!isStoreBillingAvailable()) {
    return { ok: false, message: 'Restore tylko na iOS / Android.' };
  }
  const prepared = await prepareLocationPurchase(businessId);
  const RC = await loadPurchases();
  if (!RC) {
    return { ok: false, message: prepared.offeringError || 'SDK niedostępne.' };
  }
  try {
    const info = await RC.restorePurchases();
    const entitlementId =
      process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'location_access';
    const active = Boolean(info.entitlements.active[entitlementId]);
    return {
      ok: active,
      message: active
        ? 'Przywrócono zakup.'
        : 'Nie znaleziono aktywnej subskrypcji dla tej lokalizacji.',
    };
  } catch (e: any) {
    return { ok: false, message: e?.message || 'Restore nieudany.' };
  }
}
