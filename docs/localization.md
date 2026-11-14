# Localization

Two kinds of texts exist: application texts (`src/locales/`) and widget texts (`src/widgets/<type>/lang/`). Both are ES modules whose **default export** is an object of strings, and both are loaded on demand (one small chunk per file).

## Language selection

- First visit: the first entry of `navigator.languages` that matches a registered language is used. An exact match wins (`uk`), then the base language (`uk-UA` matches `uk`). Otherwise `en-GB` is used.
- The choice is saved in the state (`lang`) and can be changed in the settings dialog.
- Missing keys fall back to `en-GB`, and then to the key itself.
- The language code is also used for `Intl` date and number formatting, so use valid BCP 47 codes (`de`, `pt-BR`, ...).

## Add a language

1. Register it in `src/locales/index.js`. The name is shown as written, without a flag:

   ```js
   { code: 'de', name: 'Deutsch', load: () => import('./de.js') },
   ```

2. Copy `src/locales/en-GB.js` to `src/locales/de.js` and translate the values. Keep the keys.
3. For each widget, copy `src/widgets/<type>/lang/en-GB.js` to `de.js` and translate it. Nothing needs to be registered: packs are discovered by their path.

The language appears in the settings dialog automatically.

## Strings with parameters

Use `{name}` placeholders and pass an object: `t('key', { name: 'x' })` in the application or `wt(type, 'key', { name: 'x' })` in widgets (both from `@/i18n`). Unknown placeholders are left as they are.

## Widget packs

Packs are loaded after the page has loaded, for the current language and for `en-GB`, and again when the language changes. The "new widget" dialog also makes sure they are loaded. A widget pack must contain `name`, `description` and one key for every field `labelKey`. Everything else is up to the widget.

## Application keys

`pageTitle`, `settings`, `addBookmark`, `searchTitle`, `search`, `delete`, `addWidget`, `drag`, `hide`, `show`, `newBookmark`, `url`, `name`, `optionalTitle`, `cancel`, `add`, `newWidget`, `language`, `done`, `invalidUrl`, `widgetLoadError`.
