// Shared localisation API. Widget packs are loaded from each widget's own locale namespace.
window.I18n = {
  languageCode(language) { return window.LocalePacks?.[language] ? language : 'en'; },
  app(language, key) { return window.LocalePacks?.[this.languageCode(language)]?.app?.[key] ?? key; },
  widget(language, widget, key) { return window.LocalePacks?.[this.languageCode(language)]?.widgets?.[widget]?.[key] ?? key; },
  pack(language, widget) { return window.LocalePacks?.[this.languageCode(language)]?.widgets?.[widget] ?? {}; }
};
