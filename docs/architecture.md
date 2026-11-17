# Architecture

## Startup sequence

1. `index.html` links `src/styles/style.css` (so the theme applies immediately) and loads `src/main.js` as an ES module.
2. `main.js` imports `state.js`. That module reads and validates `localStorage` and builds the reactive state. It also
   imports the widget registry, which is needed to drop unknown widget types.
3. `main.js` loads the application language (`i18n.use`) **before** mounting, so there is never a flash of untranslated
   text.
4. `App.vue` is mounted. Search, bookmarks and the widget frames render at once.
5. After the window `load` event and an idle callback (`composables/afterLoad.js`), `WidgetList.vue` starts rendering
   the widgets and loads the widget language packs. Until then every widget slot shows a skeleton.

Modules replace the old global scripts: there is no load order to maintain and no shared global scope.

## State and storage

All user data is one reactive object saved under the `localStorage` key `startpage:v1`:

```js
{
	engine: 0,                       // index into ENGINES (src/config/engines.js)
	lang: 'en-GB',                   // language code
	settings:
	{
		search: {...},
		ui: {...}
	},
 // see src/config/settings.js
	bookmarks: [{id, url, host, title}],
	widgets: [{id, type, config, hidden}]
}
```

`state.js` watches the whole object with `flush: 'sync'`, so every change is written immediately. On load, `normalize()`
repairs the data: wrong types are replaced by defaults, bookmarks that are not `http(s)` links and widgets of unknown
types are dropped, and the old `language` field is migrated to `lang`.

Widgets store their own data by mutating their `config` object (see [Widgets](widgets.md)); it is part of the same state
and is saved the same way.

Temporary UI state (open dialog, failed icons, search suggestions) is **not** persisted.

## Widgets and lazy loading

`widgets/registry.js` uses `import.meta.glob('./*/index.js')` to find every widget. Each `index.js` describes the widget
(fields, summary) and points to its component with a dynamic `import()`. The registry wraps that in
`defineAsyncComponent`, so Vite emits one JS chunk (with its CSS) per widget type and the browser downloads it only when
a widget of that type is first rendered.

Every widget is a separate ES module with its own scope. This is what makes several widgets of different types work on
the same page: the old version used classic scripts with top-level `const` declarations, which collided in the shared
global scope.

While a chunk loads, `WidgetSkeleton.vue` is shown; if it fails to load, `WidgetError.vue` is shown.

## Modules

Modules are panels driven by a server over WebSocket (bottom-left button). `state.modules` holds `{ id, name, url, hidden, autoConnect, size, values }`
per module and is validated on load (`ws://` / `wss://` only). `WidgetList` renders them after the widgets; each `ModuleView` acquires a runtime
(`src/modules/runtime.js`) on mount and releases it (closing the socket) on unmount, so hidden modules are disconnected. The server's UI is
reduced to a fixed set of components by `sanitizeNode()` and drawn by `ModuleNode.vue`. The protocol and how to extend it: [Modules](modules.md).

## Localization

`i18n/index.js` keeps a reactive `data` object, so changing the language or loading a pack re-renders every `t()` /
`wt()` call. Application languages (`src/locales/*.js`) are loaded with dynamic `import()`. Widget packs are discovered
with `import.meta.glob('../widgets/*/lang/*.js')` and loaded lazily for the current language and the fallback (`en-GB`).
See [Localization](localization.md).

## Drag and drop

`composables/dnd.js` exports `dnd(group, list, id)`, which returns the attributes and event handlers for one item (used
with `v-bind`). Items only move inside their own group (`bookmarks` or `widgets`). Mouse input uses HTML5 drag and drop.
Touch input uses touch events: widgets start dragging from the `.handle`, bookmarks after a 350 ms long press, and the
item under the finger is found with `elementFromPoint` using the `data-dnd` and `data-id` attributes.

## Components

| Component                                                   | Role                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `App.vue`                                                   | Layout, `Esc` and `Shift` + `+` shortcuts, decides which single dialog is open |
| `SearchBox.vue`                                             | Input, DuckDuckGo suggestions, engine menu                                     |
| `BookmarkGrid.vue`                                          | Tiles, icon fallback to the first letter, delete                               |
| `WidgetList.vue`                                            | Widget rows, hide/show/delete, lazy rendering                                  |
| `BaseModal.vue`                                             | Shared backdrop and form of all dialogs                                        |
| `SettingsModal.vue`, `BookmarkModal.vue`, `WidgetModal.vue` | The three dialogs                                                              |

## External services

| Service                                                  | Used for                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ac.duckduckgo.com`                                      | Search suggestions (through the Vite proxy `/ddg-ac`)                                                |
| `icons.duckduckgo.com`                                   | Bookmark and engine icons                                                                            |
| `github.com`                                             | Pinned repositories (through the Vite proxy `/gh-profile`, public proxy as fallback)                 |
| `api.allorigins.win`, `corsproxy.io`, `api.codetabs.com` | Public CORS proxies, the last resort for page titles and RSS feeds (third-party, can be unavailable) |
| `api.github.com`                                         | GitHub widget events                                                                                 |
| `open-meteo.com`                                         | Weather widget (geocoding + forecast)                                                                |
| `open.er-api.com`                                        | Exchange rates widget                                                                                |

Widgets cache responses in `localStorage` under `startpage:cache:*` (10 minutes to 1 hour; places are cached
permanently) through `utils/cache.js`, to stay within API limits.

## Same-origin proxies

Some services send no CORS headers, so the browser would block direct requests. `vite.config.js` defines `server.proxy`
and `preview.proxy` (`/ddg-ac` -> `ac.duckduckgo.com`, `/gh-profile` -> `github.com`); the code calls them with relative
URLs. The same plugin (`vite-plugins/feed-proxy.js`) adds `/feed-proxy?url=...`, a generic fetcher for RSS feeds and
page titles: it answers only requests addressed to `localhost`, only for `http(s)` targets, and caps the response at 3
MB. `utils/net.js` (`fetchText`) tries a direct request, then `/feed-proxy`, then public proxies. All of this exists
only in `npm run dev` and `npm run preview`. If you host `dist/` on a plain static server, configure equivalent rewrites
there; otherwise search suggestions are simply not shown and GitHub pinned repositories fall back to the public proxy.

## Build output

`npm run build` produces `dist/`: `index.html`, one hashed main JS and CSS bundle, and one small chunk per widget and
per language. Paths are relative (`base: './'`), so the folder can be served from any location over HTTP.
