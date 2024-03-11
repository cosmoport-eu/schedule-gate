export default class Locale {
  static getLocaleProp(property, locale, uppercase) {
    if (property === undefined || locale === undefined) {
      return '';
    }

    return typeof locale[property] !== 'undefined'
      ? uppercase
        ? locale[property]
          .toUpperCase()
        : locale[property]
      : '';
  }
}
