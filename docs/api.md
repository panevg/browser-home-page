# API reference

> The extension points of the start page: what you write to add something, and the functions you may call. Types are
> defined once in [`src/types.js`](../src/types.js) (JSDoc, with editor support through `jsconfig.json`); every exported
> function listed here also has JSDoc in its source file.

**On this page:** [Widgets](#widgets) · [Helpers for widgets](#helpers-for-widgets) · [Localization](#localization) ·
[Settings](#settings) · [Search engines](#search-engines) · [State](#state) · [Search history](#search-history) ·
[Module protocol](#module-protocol) · [Styling](#styling)

Imports use the `@` alias for `src/`.

---

## Widgets

A widget is the folder `src/widgets/<type>/`. The folder name is the **type**; it is saved in the state, so never rename it
later. Nothing needs to be registered: the registry finds every folder that contains an `index.js`.

```
src/widgets/hello/
  index.js           the definition (below)
  HelloWidget.vue    the component
  lang/en-GB.js      language packs (one per language)
```

### `index.js`: `WidgetDefinition`

```js
/** @type {import('@/types').WidgetDefinition} */
export default {
  order: 90,
  fields: [{ key: 'who', labelKey: 'whoLabel', placeholder: 'world', required: true }],
  summary: c => c.who || '',
  prepare: c => ({ ...c, who: c.who.trim() }),
  component: () => import('./HelloWidget.vue'),
};
```

| Property | Type | Required | Description |
| --- | --- | --- | --- |
| `fields` | `WidgetField[]` | yes | Inputs of the "new widget" dialog. Use `[]` for a widget without settings. Empty optional values are not stored. |
| `summary` | `(config) => string` | yes | Short text of the collapsed (hidden) widget. It must cope with an incomplete `config`. |
| `component` | `() => Promise<{default: Component}>` | yes | Lazy loader: `() => import('./HelloWidget.vue')`. Loaded as its own chunk when first rendered. |
| `order` | `number` | no | Position in the picker; lower first. Default `100`. Ties are sorted by name. |
| `prepare` | `(config) => object` | no | Adjusts the entered values before the widget is saved (for example, strips a leading `@`). |

`WidgetField`: `key` (property name in `config`), `labelKey` (key in the widget's language pack), `placeholder` (an example,
not translated), `required`.

### The component

It receives one prop, **`config`**: the widget's settings and its own saved data. `config` is part of the reactive state, so
**mutating it saves it immediately**. Never replace `config` itself.

```vue
<script setup>
import { wt } from '@/i18n';

const props = defineProps({ config: { type: Object, required: true } });
props.config.visits ||= 0;            // defaults: set them here, once
props.config.visits++;                // saved at once
const tr = (key, params) => wt('hello', key, params);
</script>

<template>
  <div class="hello">{{ tr('greeting', { who: config.who }) }}</div>
</template>

<style>
.hello { height: 100%; display: grid; place-items: center; font: 500 28px var(--serif); }
</style>
```

- The root must fill the box (`height: 100%`).
- `<style>` is global: prefix your classes, or use `<style scoped>`.
- Create timers in `<script setup>` and clear them in `onBeforeUnmount`; a hidden widget is unmounted.

### Language pack

```js
// src/widgets/hello/lang/en-GB.js
export default {
  name: 'Hello',                  // required: shown in the picker
  description: 'Greets someone',  // required
  whoLabel: 'Who to greet',       // one key per field labelKey
  greeting: 'Hello, {who}!',
};
```

Add the same file for every language. Tests fail if a language is missing keys that `en-GB` has.

### Registry (`@/widgets/registry`)

| Export | Description |
| --- | --- |
| `widgetMeta` | `Record<type, WidgetDefinition>` |
| `components` | `Record<type, Component>`: async components with a skeleton and an error placeholder |
| `widgetTypes` | `string[]`: the types in picker order |

---

## Helpers for widgets

| Import | Signature | Description |
| --- | --- | --- |
| `@/i18n` | `wt(type, key, params?)` | Translate from the widget's pack |
| `@/i18n` | `ago(date)` | "5 minutes ago" in the current language; `''` for an invalid date |
| `@/i18n` | `data.lang` | The current language code, for `Intl.*` |
| `@/utils/cache` | `cached(key, ttl, fetcher, isValid?)` | Fresh cached data, or run `fetcher` and cache the result under `startpage:cache:<key>`. Never fails because of a full storage |
| `@/utils/net` | `fetchText(url, {timeout?, accept?})` | Fetch text that may lack CORS headers: direct, then `/feed-proxy`, then public proxies. `accept(text)` rejects junk answers |
| `@/utils/net` | `proxied(url)` | A public CORS proxy address for a single URL (prefer `fetchText`) |
| `@/utils/url` | `parseHttpUrl(input)` | `{url, host}` for a usable `http(s)` address, else `null` |
| `@/utils/feed` | `parseFeed(text)`, `isFeed(text)` | RSS/Atom items (max 30, `http(s)` links only) / feed check |
| `@/utils/misc` | `uid()`, `icon(host)`, `initial(text)`, `matchBookmarks(list, query, limit?)` | Small helpers |
| `@/state` | `state` | The whole live state (see [State](#state)) |

```js
import { cached } from '@/utils/cache';
import { fetchText } from '@/utils/net';

const xml = await cached(`news:${url}`, 10 * 60e3, () => fetchText(url), t => t.length > 0);
```

Rules for data from outside: render it as text, open links with `target="_blank" rel="noopener"`, and accept only `http(s)`
addresses.

---

## Localization

```js
import { t, wt, ago, use, detect, data, languages, FALLBACK, loadWidgetPacks } from '@/i18n';
```

| Export | Description |
| --- | --- |
| `t(key, params?)` | Translate an application string |
| `wt(type, key, params?)` | Translate a widget string |
| `ago(date)` | Relative time in the current language |
| `use(code)` | Switch language; resolves to the language actually used (unknown codes select the fallback) |
| `detect()` | The best language for the system (exact code, then base language, else `en-GB`) |
| `data` | Reactive `{ lang, app, widget }`; `data.lang` is the current code |
| `languages` | `Language[]`: `{ code, name, load }` |
| `FALLBACK` | `'en-GB'`, used for every missing key |
| `loadWidgetPacks()` | Load the packs of every widget for the fallback and the current language |

Placeholders are `{name}`. All functions read the current language reactively, so templates re-render on a language change.

**Add an application language:** add `{ code, name, load: () => import('./xx.js') }` to `src/locales/index.js` and create
`src/locales/xx.js` with a default-exported object of strings. See [Localization](localization.md).

---

## Settings

`src/config/settings.js`: defaults, allowed values and validation of the settings, in the groups `search`, `ui` and
`modules`.

| Export | Description |
| --- | --- |
| `DEFAULTS` | Default of every setting, by group. The type of a default decides how a value is validated (boolean, or one of `OPTIONS`) |
| `OPTIONS` | Allowed values of settings that are a list of choices |
| `ACCENTS` | Accent colours: `{ name: [normal, hover] }` |
| `normalizeSettings(raw)` | A complete, valid `Settings` object from anything |

Read a setting with `state.settings.<group>.<key>`.

**Add a setting:**

1. Add it to `DEFAULTS` (and to `OPTIONS` for a list of choices).
2. Use it where it is needed.
3. Add the labels to every `src/locales/*.js`: `set.<key>` and, for choices, `opt.<key>.<value>`.
4. Add a row to the `sections` list in `src/components/SettingsModal.vue`. Row types: `seg` (buttons), `switch`, `select`,
   `accent`, `action` (a button). `dep: '<key>'` greys a row out while another setting is off.

---

## Search engines

`ENGINES` in `src/config/engines.js` is an array of `{ name, host, url }`. In `url`, `%s` is the encoded query and `%l` the
base language of the interface. The selected engine is saved as an **index**, so append new engines at the end.

```js
{ name: 'Ecosia', host: 'ecosia.org', url: 'https://www.ecosia.org/search?q=%s' }
```

---

## State

```js
import { state, STORAGE_KEY } from '@/state';
```

`state` is one reactive object (`AppState`) saved to `localStorage` under `STORAGE_KEY` (`startpage:v1`) at every change and
validated when it is read.

| Property | Type | Description |
| --- | --- | --- |
| `engine` | `number` | Index into `ENGINES` |
| `lang` | `string \| null` | Language code |
| `settings` | `Settings` | `{ search, ui, modules }` |
| `bookmarks` | `Bookmark[]` | `{ id, url, host, title }`; `http(s)` only |
| `widgets` | `WidgetInstance[]` | `{ id, type, config, hidden }` |
| `modules` | `ModuleEntry[]` | `{ id, name, url, hidden, autoConnect, size, values }`; `ws(s)` only |

The state actions are in `src/composables/`: `addBookmark`, `removeBookmark`, `addWidget(type, config)`, `removeWidget(id)`,
`addModule({url, name})`, `removeModule(id)`, `setModuleUrl(module, input)`.

---

## Search history

```js
import { history, record, forget, clearHistory, HISTORY_KEY } from '@/history';
```

| Export | Description |
| --- | --- |
| `history` | The live list, newest first: `{ q, t, n }` |
| `record(text)` | Remember a search (ignored when switched off or when the text looks sensitive). Call it for real searches only |
| `forget(q)` | Remove one entry |
| `clearHistory()` | Delete everything, including the saved copy |
| `HISTORY_KEY` | `startpage:history:v1` |

The pure rules are in `@/utils/history`: `cleanQuery`, `isSensitive`, `normalizeHistory`, `addEntry`, `removeEntry`,
`matchHistory` and the constants `HISTORY_DAYS`, `MAX_ENTRIES`, `MAX_LENGTH`. Details: [Search history](history.md).

---

## Module protocol

The wire format that a **server** implements (three message types: `ui`, `data`, `request`), the components and the actions
are specified in [Modules](modules.md). The client API:

| Import | Export | Description |
| --- | --- | --- |
| `@/modules/protocol` | `parseWsUrl(input)` | Normalise a `ws://` / `wss://` address (`null` if invalid) |
| | `parseMessage(text)` | Validate one frame: `{ msg }` or `{ error }` |
| | `sanitizeNode(raw)` | Reduce an untrusted UI node to the known components |
| | `dataMsg`, `requestMsg`, `replyMsg` | Build outgoing messages |
| | `isId`, `LIMITS`, `INPUTS`, `PROTOCOL` | Identifier check, limits, components that hold a value, version |
| `@/modules/connection` | `createConnection({ url, getOptions, handlers, WS })` | One WebSocket connection: handshake, request/answer matching, timeouts, reconnect |
| `@/modules/runtime` | `createRuntime`, `acquire(module)`, `release(id)`, `runtimes` | The live state of a module and its action runner |

**Add a component or an action step:** see [Modules, extending the client](modules.md#extending-the-client).

---

## Styling

Use the theme variables so light and dark themes (and accent colours) work everywhere.

| Variable | Meaning |
| --- | --- |
| `--bg`, `--card` | Page and card backgrounds |
| `--text`, `--muted` | Text and secondary text |
| `--line`, `--soft` | Borders, and subtle fills |
| `--accent`, `--accent-d` | Accent colour and its hover shade |
| `--serif`, `--sans` | Font stacks |

Ready-made classes: `.btn`, `.btn.primary`, `.btn.danger`, `.icon-btn`, `.scroll` (thin themed scrollbar for a scrolling
list), `.skeleton` (loading placeholder), `.hint` (secondary text), `.form-error` (error line) and `.widget-msg` (centered
message inside a widget). A widget's box is 60% of the screen width and a third of its height on desktop, and full width on
phones.

---

**See also:** [Widgets](widgets.md) · [Localization](localization.md) · [Modules](modules.md) · [Architecture](architecture.md)
