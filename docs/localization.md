# Localization

Two kinds of texts exist: application texts (`js/locales/`) and widget texts (`js/widgets/<type>/lang/`). Both use plain scripts that register strings, and both are loaded on demand.

## Language selection

- First visit: the first entry of `navigator.languages` that matches a registered language is used. An exact match wins (`uk`), then the base language (`uk-UA` matches `uk`). Otherwise `en-GB` is used.
- The choice is saved in the state (`lang`) and can be changed in the settings dialog.
- Missing keys fall back to `en-GB`, and then to the key itself.
- The language code is also used for `Intl` date and number formatting, so use valid BCP 47 codes (`de`, `pt-BR`, ...).

## Add a language

1. Register it in `js/locales/index.js`. The name is shown as written, without a flag:

   ```js
   I18n.addLang('de', 'Deutsch', 'js/locales/de.js');
   ```

2. Copy `js/locales/en-GB.js` to `js/locales/de.js`, change the code in `I18n.define('de', { ... })` and translate the values. Keep the keys.
3. For each widget, copy `js/widgets/<type>/lang/en-GB.js` to `de.js`, change the code in `I18n.defineWidget('<type>', 'de', { ... })` and translate it.

The language appears in the settings dialog automatically.

## Strings with parameters

Use `{name}` placeholders and pass an object: `I18n.t('key', { name: 'x' })` in the app or `I18n.wt(type, 'key', { name: 'x' })` in widgets. Unknown placeholders are left as they are.

## Widget packs

A widget declares the folder of its packs in the registry (`lang`). Packs are loaded after the page has loaded, for the current language and for `en-GB`, and again when the language changes. A widget pack must contain `name`, `description` and one key for every field `labelKey`. Everything else is up to the widget.

## Application keys

`pageTitle`, `settings`, `addBookmark`, `searchTitle`, `search`, `delete`, `addWidget`, `drag`, `hide`, `show`, `newBookmark`, `url`, `name`, `optionalTitle`, `cancel`, `add`, `newWidget`, `language`, `done`.
