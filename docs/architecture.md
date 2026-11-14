# Architecture

## Load order

`index.html` loads scripts in this order, and each one relies on the previous ones:

1. Vue (global build, CDN)
2. `js/store.js` defines `Store`
3. `js/i18n.js` defines `I18n`
4. `js/locales/index.js` registers the available languages
5. `js/widgets/registry.js` defines `Widgets` (the widget catalog)
6. `js/app.js` builds the state, loads the language, and mounts the app

## State and storage

All user data is one reactive object saved under the `localStorage` key `startpage:v1`:

```js
{
  engine: 0,                       // index into ENGINES in app.js
  lang: 'en-GB',                   // language code
  bookmarks: [{ id, url, host, title, bad? }],
  widgets:   [{ id, type, config, hidden }]
}
```

`app.js` watches the whole object with `flush: 'sync'`, so every change is written immediately. Widgets can store their own data by mutating their `config` object (see [Widgets](widgets.md)); it is part of the same state and saved the same way. Widgets with unknown types are dropped on load.

## Lazy widget loading

The page, language and layout load first. After the window `load` event (and an idle callback), `app.js` injects a `<script>` for each widget on the page and for each widget language pack. Until a widget script has loaded, its slot shows a skeleton. Widgets added later are loaded immediately. Each script calls `Widgets.define(type, component, css)`, and the component is rendered with `<component :is>`.

## Localization

`I18n.data` is reactive, so changing the language re-renders everything. Language files and widget packs are plain scripts loaded on demand. See [Localization](localization.md).

## Drag and drop

`dnd(group, list, id)` in `app.js` returns the event handlers for one item. Items only move inside their own group (`bookmarks` or `widgets`), so a widget can never swap with a bookmark. Mouse input uses HTML5 drag and drop. Touch input uses touch events: widgets start dragging from the `.handle`, bookmarks after a 350 ms long press, and the item under the finger is found with `elementFromPoint` using the `data-dnd` and `data-id` attributes.

## External services

| Service | Used for |
| --- | --- |
| `ac.duckduckgo.com` | Search suggestions |
| `icons.duckduckgo.com` | Bookmark and engine icons |
| `api.allorigins.win` | CORS proxy for page titles, GitHub pinned repositories, RSS feeds |
| `api.github.com` | GitHub widget events |
| `open-meteo.com` | Weather widget (geocoding + forecast) |
| `open.er-api.com` | Exchange rates widget |

Widgets cache responses in `localStorage` (10 minutes to 1 hour) to stay within API limits.
