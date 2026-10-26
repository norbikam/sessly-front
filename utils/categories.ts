import type { AppLanguage } from '../i18n/translations';
import { translate } from '../i18n/translations';

const CATEGORY_VALUES = [
  'all',
  'hairdresser',
  'doctor',
  'beauty',
  'spa',
  'aesthetic',
  'massage',
  'fitness',
  'other',
] as const;

export type CategoryValue = (typeof CATEGORY_VALUES)[number];

export function categoryLabel(
  value: string | null | undefined,
  language: AppLanguage,
  fallback?: string,
): string {
  if (!value) return translate(language, 'category.fallback', fallback);
  const key = `category.${value}`;
  const translated = translate(language, key);
  if (translated !== key) return translated;
  return fallback || value;
}
