import type { AppLanguage } from './translations';

let currentLanguage: AppLanguage = 'pl';

export function setApiLanguage(language: AppLanguage) {
  currentLanguage = language;
}

export function getApiLanguage(): AppLanguage {
  return currentLanguage;
}
