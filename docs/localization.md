# Localization

> How the language is chosen and how to add a language to the application and to its widgets.

**On this page:** [How it works](#how-it-works) · [Add a language](#add-a-language) · [Strings with parameters](#strings-with-parameters) ·
[Widget packs](#widget-packs) · [Keys](#keys)

## How it works

There are two kinds of texts: **application texts** (`src/locales/`) and **widget texts** (`src/widgets/<type>/lang/`). Both
are ES modules whose **default export** is an object of strings, and both are loaded on demand, one small chunk per file.

- **First visit:** the first entry of `navigator.languages` that matches an available language is used. An exact match wins
  (`de-DE`), then the base language (`de-AT` finds `de-DE`). Otherwise `en-GB` is used.
- The choice is saved in the state (`lang`) and can be changed in the settings dialog.
- **Fallback:** a missing key falls back to `en-GB`, and then to the key itself. A missing file is not an error.
- The code is also used for `Intl` date and number formatting, so use valid BCP 47 codes (`de`, `pt-BR`, ...).
- Language names are written in the language itself and are shown without flags.

## Add a language

1. Register it in `src/locales/index.js`:

   ```js
   { code: 'fr', name: 'Français', load: () => import('./fr.js') },
   ```

2. Copy `src/locales/en-GB.js` to `src/locales/fr.js` and translate the values. **Keep the keys.**
3. For each widget, copy `src/widgets/<type>/lang/en-GB.js` to `fr.js` and translate it. Nothing needs to be registered:
   packs are discovered by their path.

The language then appears in the settings dialog. A test checks that every language has exactly the same keys as
English (UK), for the application and for every widget, so a missing or extra key fails `npm test`.

## Strings with parameters

Use `{name}` placeholders and pass an object:

```js
import { t, wt } from '@/i18n';

t('set.clearHistory', { n: 3 });   // application string
wt('farm', 'level', { n: 5 });     // widget string: wt(type, key, params)
```

Unknown placeholders are left as they are.

## Widget packs

Packs are loaded after the page has loaded, for the current language and for `en-GB`, and again when the language changes.
The "new widget" dialog also makes sure they are loaded. A widget pack must contain `name`, `description` and one key for
every field `labelKey`; everything else is up to the widget.

## Keys

`src/locales/en-GB.js` is the list of application keys. They are grouped by prefix:

| Prefix | Used for |
| --- | --- |
| *(plain)* | General labels and buttons: `settings`, `add`, `cancel`, `done`, `delete`, ... |
| `sec…` | Section headings of the settings dialog |
| `set.<key>` | Labels of settings (`set.history`, `set.reconnectDelay`, ...) |
| `opt.<key>.<value>` | Labels of the choices of a setting (`opt.theme.dark`) |
| `mod.…` | The modules dialog and the module panel (`mod.status.*`, `mod.err.*`) |

---

**See also:** [API reference: localization](api.md#localization) · [Widgets](widgets.md)
