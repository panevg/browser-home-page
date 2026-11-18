# Architecture

> How the start page is built: structure, startup, state, lazy loading, proxies and the build.

**On this page:** [Project structure](#project-structure) · [Startup sequence](#startup-sequence) ·
[State and storage](#state-and-storage) · [Widgets and lazy loading](#widgets-and-lazy-loading) ·
[Localization](#localization) · [Search and history](#search-and-search-history) · [Modules](#modules) ·
[Drag and drop](#drag-and-drop) · [Components](#components) · [External services](#external-services) ·
[Same-origin proxies](#same-origin-proxies) · [Build output](#build-output)

## Project structure

```
index.html                 entry page: stylesheet + <script type="module" src="/src/main.js">
vite.config.js             Vue plugin, alias @ -> src, ports, proxies, test settings
jsconfig.json              editor support: the @ alias and JSDoc types
vite-plugins/              feed-proxy.js: same-origin fetcher for feeds and page titles
examples/                  module-server.mjs: demo server for modules (no dependencies)
tests/                     unit tests (Vitest), mirroring src/
docs/                      this documentation
start.sh                   build + serve helper
src/
  main.js                  loads the language, then mounts App.vue
  App.vue                  layout, global shortcuts, which single dialog is open
  state.js                 reactive state + localStorage persistence + validation
  history.js               search history: live list, storage, cross-tab sync
  types.js                 JSDoc type definitions (no runtime code)
  components/              SearchBox, BookmarkGrid, WidgetList, ModuleView, ModuleNode and the dialogs
  composables/             state actions (bookmarks, widgets, modules), drag and drop, "after load" flag, appearance
  config/                  engines.js (search engines), settings.js (defaults, options, validation)
  i18n/index.js            translation core
  locales/                 index.js (language list) + one file per language
  modules/                 protocol.js, connection.js, runtime.js: the WebSocket module system
  widgets/                 registry.js + one folder per widget (index.js, <Name>Widget.vue, lang/)
  utils/                   cache, net, feed, url, history rules, misc helpers
  directives/focus.js      v-focus
  styles/style.css         theme variables, layout, mobile rules
```

## Startup sequence

1. `index.html` links `src/styles/style.css` (so the theme applies immediately) and loads `src/main.js` as an ES module.
2. `main.js` imports `state.js`. That module reads and validates `localStorage` and builds the reactive state. It also
   imports the widget registry, which is needed to drop unknown widget types.
3. `main.js` loads the application language (`i18n.use`) **before** mounting, so there is never a flash of untranslated
   text.
4. `App.vue` is mounted. Search, bookmarks and the widget frames render at once.
5. After the window `load` event and an idle callback (`composables/afterLoad.js`), `WidgetList.vue` starts rendering
   the widgets and modules and loads the widget language packs. Until then every slot shows a skeleton.

Everything is an ES module: there is no script load order to maintain and no shared global scope.

## State and storage

All user data is one reactive object (`AppState`, see [API reference](api.md#state)) saved under the `localStorage` key
`startpage:v1`:

```js
{
  engine: 0,                         // index into ENGINES
  lang: 'en-GB',                     // language code, or null before the first visit chose one
  settings: { search, ui, modules }, // src/config/settings.js
  bookmarks: [{ id, url, host, title }],
  widgets: [{ id, type, config, hidden }],
  modules: [{ id, name, url, hidden, autoConnect, size, values }]
}
```

`state.js` watches the whole object with `flush: 'sync'`, so every change is written immediately. On load, `normalize()`
repairs the data: wrong types are replaced by defaults, bookmarks that are not `http(s)` links, modules that are not
`ws(s)` addresses and widgets of unknown types are dropped, and the old `language` field is migrated to `lang`.

Widgets store their own data by mutating their `config` object (see [Widgets](widgets.md)); it is part of the same state
and is saved the same way. Temporary UI state (open dialog, failed icons, suggestions) is **not** persisted.

| `localStorage` key | Holds | Notes |
| --- | --- | --- |
| `startpage:v1` | The state above | Back this up (see [Customization](customization.md#backup-and-reset)) |
| `startpage:history:v1` | The search history | Separate on purpose: a backup of the state never contains it |
| `startpage:cache:*` | Short-lived network caches of widgets | Safe to delete |

## Widgets and lazy loading

`widgets/registry.js` uses `import.meta.glob('./*/index.js')` to find every widget. Each `index.js` describes the widget
(fields, summary) and points to its component with a dynamic `import()`. The registry wraps that in
`defineAsyncComponent`, so Vite emits one JS chunk (with its CSS) per widget type and the browser downloads it only when a
widget of that type is first rendered. While a chunk loads, `WidgetSkeleton.vue` is shown; if it fails, `WidgetError.vue`.

Every widget is a separate ES module with its own scope, which is what lets several widgets of different types live on the
same page without clashing names.

## Localization

`i18n/index.js` keeps a reactive `data` object, so changing the language or loading a pack re-renders every `t()` / `wt()`
call. Application languages (`src/locales/*.js`) are loaded with dynamic `import()`. Widget packs are discovered with
`import.meta.glob('../widgets/*/lang/*.js')` and loaded lazily for the current language and the fallback (`en-GB`).
See [Localization](localization.md).

## Search and search history

`SearchBox.vue` builds the dropdown from three sources, in this fixed priority: matching **bookmarks**, then the
**search history**, then DuckDuckGo **suggestions** (a suggestion already in the history is not repeated). History is not
part of `state`: it has its own `localStorage` key so that backups of the state never contain it. `utils/history.js` holds the
pure rules (what may be stored, 30-day expiry, matching) and `history.js` the live list, saving, cross-tab sync and deletion
when the setting is switched off. Details and the security model: [Search history](history.md).

## Modules

Modules are panels driven by a server over WebSocket (the bottom-left button). `WidgetList` renders them after the
widgets; each `ModuleView` acquires a runtime (`modules/runtime.js`) when it is shown and releases it, closing the socket,
when it is hidden, so hidden modules are disconnected. The server's UI is reduced to a fixed set of components by
`sanitizeNode()` and drawn by `ModuleNode.vue`. The protocol and how to extend it: [Modules](modules.md).

## Drag and drop

`composables/dnd.js` exports `dnd(group, list, id)`, which returns the attributes and event handlers for one item (used with
`v-bind`). Items only move inside their own group (`bookmarks`, `widgets` or `modules`). Mouse input uses HTML5 drag and
drop. Touch input uses touch events: widgets and modules start dragging from the `.handle`, bookmarks after a 350 ms long
press, and the item under the finger is found with `elementFromPoint` using the `data-dnd` and `data-id` attributes.

## Components

| Component | Role |
| --- | --- |
| `App.vue` | Layout, `Esc` and `Shift` + `+` shortcuts, decides which single dialog is open |
| `SearchBox.vue` | Input, the dropdown (bookmarks, history, suggestions), engine menu |
| `BookmarkGrid.vue` | Tiles, icon fallback to the first letter, delete |
| `WidgetList.vue` | Widget and module rows, hide/show/delete, lazy rendering |
| `ModuleView.vue`, `ModuleNode.vue` | A module panel and the recursive renderer of its abstract UI |
| `BaseModal.vue` | Shared backdrop and form of all dialogs |
| `SettingsModal.vue`, `BookmarkModal.vue`, `WidgetModal.vue`, `ModulesModal.vue` | The dialogs |
| `WidgetSkeleton.vue`, `WidgetError.vue` | Placeholders for async widgets |

## External services

| Service | Used for |
| --- | --- |
| `ac.duckduckgo.com` | Search suggestions (through the Vite proxy `/ddg-ac`) |
| `icons.duckduckgo.com` | Bookmark and engine icons |
| `github.com` | Pinned repositories (through the Vite proxy `/gh-profile`, public proxy as fallback) |
| `api.allorigins.win`, `corsproxy.io`, `api.codetabs.com` | Public CORS proxies, the last resort for page titles and RSS feeds (third-party, can be unavailable) |
| `api.github.com` | GitHub widget events |
| `open-meteo.com` | Weather widget (geocoding and forecast) |
| `open.er-api.com` | Exchange rates widget |
| Your module servers | Only the addresses you add yourself ([Modules](modules.md)) |

Widgets cache responses in `localStorage` under `startpage:cache:*` (10 minutes to 1 hour; places are cached permanently)
through `utils/cache.js`, to stay within API limits.

## Same-origin proxies

Some services send no CORS headers, so the browser would block direct requests. `vite.config.js` defines `server.proxy` and
`preview.proxy` (`/ddg-ac` to `ac.duckduckgo.com`, `/gh-profile` to `github.com`); the code calls them with relative URLs. The
same plugin (`vite-plugins/feed-proxy.js`) adds `/feed-proxy?url=...`, a generic fetcher for RSS feeds and page titles: it
answers only requests addressed to `localhost`, only for `http(s)` targets, and caps the response at 3 MB. `utils/net.js`
(`fetchText`) tries a direct request, then `/feed-proxy`, then public proxies. All of this exists only in `npm run dev` and
`npm run preview`. If you host `dist/` on a plain static server, configure equivalent rewrites there; otherwise search
suggestions are not shown and GitHub pinned repositories fall back to the public proxy.

## Build output

`npm run build` produces `dist/`: `index.html`, one hashed main JS and CSS bundle, and one small chunk per widget and per
language. Paths are relative (`base: './'`), so the folder can be served from any location over HTTP.

---

**See also:** [API reference](api.md) · [Widgets](widgets.md) · [Modules](modules.md)
