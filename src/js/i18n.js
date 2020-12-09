/* eslint-disable import/prefer-default-export */
import localesFr from './locales/fr.json';
import localesEn from './locales/en.json';

export const i18n = {
  set(locale) {
    if (locale === 'fr') {
      Object.assign(this, localesFr);
    } else if (locale === 'en') {
      Object.assign(this, localesEn);
    }
  },
};
Object.assign(i18n, localesEn);
