import type { AppLanguage } from '../i18n/translations';

type LocalizedEntity = {
  name?: string;
  localized_name?: string;
  description?: string;
  localized_description?: string;
  name_i18n?: Record<string, string>;
  description_i18n?: Record<string, string>;
  promotion_title?: string;
  localized_promotion_title?: string;
  promotion_title_i18n?: Record<string, string>;
  promotion_description?: string;
  localized_promotion_description?: string;
  promotion_description_i18n?: Record<string, string>;
  caption?: string;
  localized_caption?: string;
  caption_i18n?: Record<string, string>;
  category_label?: string;
};

function fromMap(map: Record<string, string> | undefined, language: AppLanguage, fallback = '') {
  if (!map) return fallback;
  return map[language] || (language !== 'pl' ? map.en : '') || map.pl || fallback;
}

export function localizedName(entity: LocalizedEntity | null | undefined, language: AppLanguage) {
  if (!entity) return '';
  return entity.localized_name
    || fromMap(entity.name_i18n, language, entity.name || '');
}

export function localizedDescription(entity: LocalizedEntity | null | undefined, language: AppLanguage) {
  if (!entity) return '';
  return entity.localized_description
    || fromMap(entity.description_i18n, language, entity.description || '');
}

export function localizedPromotionTitle(entity: LocalizedEntity | null | undefined, language: AppLanguage) {
  if (!entity) return '';
  return entity.localized_promotion_title
    || fromMap(entity.promotion_title_i18n, language, entity.promotion_title || '');
}

export function localizedPromotionDescription(entity: LocalizedEntity | null | undefined, language: AppLanguage) {
  if (!entity) return '';
  return entity.localized_promotion_description
    || fromMap(entity.promotion_description_i18n, language, entity.promotion_description || '');
}

export function localizedCaption(entity: LocalizedEntity | null | undefined, language: AppLanguage) {
  if (!entity) return '';
  return entity.localized_caption
    || fromMap(entity.caption_i18n, language, entity.caption || '');
}
