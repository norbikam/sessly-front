/**
 * Allowlist helpers for opening external payment / return URLs.
 */

const CHECKOUT_HOST_SUFFIXES = [
  'checkout.stripe.com',
  'stripe.com',
  'payu.com',
  'secure.payu.com',
  'merch-prod.snd.payu.com',
];

export function isAllowedCheckoutUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return CHECKOUT_HOST_SUFFIXES.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}
