# Customization

After editing the code, `npm run dev` reloads automatically; for the production build run `npm run build` again.

## Search engines

The list is the `ENGINES` array in `src/config/engines.js`:

```js
{ name: 'Ecosia', host: 'ecosia.org', url: 'https://www.ecosia.org/search?q=%s' }
```

`%s` is replaced with the encoded query, `%l` with the base language of the interface (`en`, `uk`, ...; used by Wikipedia), and `host` is used to fetch the icon. The saved engine is stored as an index, so append new engines at the end to keep existing choices. Suggestions come from DuckDuckGo regardless of the selected engine (`onInput` in `src/components/SearchBox.vue`).

## Theme

Colors and fonts are CSS variables at the top of `src/styles/style.css`:

```css
:root{--bg:#faf9f5;--card:#fff;--text:#141413;--muted:#73726c;--line:#e6e3d8;--soft:#f0eee6;--accent:#d97757;--accent-d:#c6613f;--serif:...;--sans:...}
```

The dark theme overrides them in the `prefers-color-scheme: dark` block. Change `--accent` to recolor buttons, the heat map, the calendar and the cactus pot.

## Sizes

- Widget width: `grid-template-columns:32px 60vw 32px` in `.wrow`.
- Widget height: `.widget{height:33vh}`.
- Phone layout: the block at the end of `src/styles/style.css` (`max-width:700px`).
- Bookmark grid: `.grid` and `.tile`.

## Bookmark behaviour

Titles are fetched from the page through a CORS proxy when the name is left empty (`fetchTitle` in `src/composables/bookmarks.js`); the hostname is used if that fails. Icons come from `icons.duckduckgo.com`; if an icon fails to load, the first letter of the title is shown instead (this is not saved, so the icon is tried again on the next visit). Only `http(s)` addresses are accepted (`src/utils/url.js`).

## Backup and reset

Everything important is in one `localStorage` key. In the browser console of the page:

```js
copy(localStorage.getItem('startpage:v1'))          // backup (to clipboard)
localStorage.setItem('startpage:v1', '<pasted json>') // restore, then reload
localStorage.removeItem('startpage:v1')              // reset everything
```

Widgets also keep short-lived caches under keys starting with `startpage:cache:`; they can be removed safely. The data lives in the browser profile and origin, so the address (host and port) must stay the same.
