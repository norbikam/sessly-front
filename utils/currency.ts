export type AppCurrency = 'PLN' | 'EUR';

export const EUR_TO_PLN = 4.3;
export const SUPPORTED_CURRENCIES: AppCurrency[] = ['PLN', 'EUR'];

export function roundUpToFive(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.ceil(amount / 5) * 5;
}

export function convertCurrency(
  amount: number,
  from: AppCurrency,
  to: AppCurrency,
): number {
  if (from === to) return amount;
  const converted = from === 'EUR' ? amount * EUR_TO_PLN : amount / EUR_TO_PLN;
  return roundUpToFive(converted);
}

export function resolveDualPrices(pricePln?: number | null, priceEur?: number | null) {
  let pln = pricePln != null && !Number.isNaN(pricePln) ? pricePln : null;
  let eur = priceEur != null && !Number.isNaN(priceEur) ? priceEur : null;
  if (pln == null && eur != null) pln = convertCurrency(eur, 'EUR', 'PLN');
  if (eur == null && pln != null) eur = convertCurrency(pln, 'PLN', 'EUR');
  return { pln, eur };
}

type Priced = {
  price_amount?: number | string | null;
  price_amount_eur?: number | string | null;
  promotional_price_amount?: number | string | null;
  promotional_price_amount_eur?: number | string | null;
  promotion_valid_until?: string | null;
};

const toNumber = (value?: number | string | null) => {
  if (value == null || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

export function getServicePrice(
  service: Priced | null | undefined,
  currency: AppCurrency,
  options?: { preferPromo?: boolean },
): number | null {
  if (!service) return null;
  const preferPromo = options?.preferPromo !== false;
  const hasPromo = toNumber(service.promotional_price_amount) != null
    || toNumber(service.promotional_price_amount_eur) != null;
  const promoStillValid = !service.promotion_valid_until
    || new Date(`${service.promotion_valid_until}T23:59:59`) >= new Date();
  const promoActive = preferPromo && hasPromo && promoStillValid;

  const regular = resolveDualPrices(
    toNumber(service.price_amount),
    toNumber(service.price_amount_eur),
  );
  const promo = resolveDualPrices(
    toNumber(service.promotional_price_amount),
    toNumber(service.promotional_price_amount_eur),
  );

  const amount = currency === 'EUR'
    ? (promoActive && promo.eur != null ? promo.eur : regular.eur)
    : (promoActive && promo.pln != null ? promo.pln : regular.pln);

  return amount;
}

export function formatMoney(
  amount: number | string | null | undefined,
  currency: AppCurrency = 'PLN',
): string {
  const value = toNumber(amount);
  if (value == null) return currency === 'EUR' ? '— €' : '— zł';
  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
  return currency === 'EUR' ? `${rounded} €` : `${rounded} zł`;
}

type PricedWithOptions = Priced & {
  price_is_indicative?: boolean;
  options?: Array<Priced & { is_active?: boolean }> | null;
};

/** True when salon marks price as set only after consultation (no amount shown). */
export function isIndividuallyPriced(service: PricedWithOptions | null | undefined): boolean {
  if (!service?.price_is_indicative) return false;
  const activeOptions = (service.options || []).filter((item) => item.is_active !== false);
  const optionHasPrice = activeOptions.some(
    (item) => getServicePrice(item, 'PLN') != null || getServicePrice(item, 'EUR') != null,
  );
  if (optionHasPrice) return false;
  return getServicePrice(service, 'PLN') == null && getServicePrice(service, 'EUR') == null;
}

export function formatServicePrice(
  service: PricedWithOptions | null | undefined,
  currency: AppCurrency,
  options?: { preferPromo?: boolean; individuallyPricedLabel?: string },
): string {
  if (isIndividuallyPriced(service)) {
    return options?.individuallyPricedLabel || 'Wyceniane indywidualnie';
  }
  const activeOptions = (service?.options || []).filter((item) => item.is_active !== false);
  if (activeOptions.length > 0) {
    const amounts = activeOptions
      .map((item) => getServicePrice(item, currency, options))
      .filter((amount): amount is number => amount != null);
    if (amounts.length) {
      const lowest = Math.min(...amounts);
      return `od ${formatMoney(lowest, currency)}`;
    }
  }
  return formatMoney(getServicePrice(service, currency, options), currency);
}
