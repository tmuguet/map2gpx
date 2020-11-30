const localesFr = require('./locales/fr.json');
const localesEn = require('./locales/en.json');

const i18n = {
  set(locale) {
    if (locale === 'fr') {
      Object.assign(this, localesFr);
    } else if (locale === 'en') {
      Object.assign(this, localesEn);
    }
  },
};
Object.assign(i18n, localesEn);

module.exports = i18n;
