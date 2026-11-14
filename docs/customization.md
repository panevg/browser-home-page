# Customization

## Search engines

The list is the `ENGINES` array at the top of `js/app.js`:

```js
{ name: 'Ecosia', host: 'ecosia.org', url: 'https://www.ecosia.org/search?q=%s' }
```

`%s` is replaced with the encoded query, and `host` is used to fetch the icon. The saved engine is stored as an index, so append new engines at the end to keep existing choices. Suggestions come from DuckDuckGo regardless of the selected engine (`onInput` in `app.js`).

## Theme

Colors and fonts are CSS variables at the top of `css/style.css`:

```css
:root{--bg:#faf9f5;--card:#fff;--text:#141413;--muted:#73726c;--line:#e6e3d8;--soft:#f0eee6;--accent:#d97757;--accent-d:#c6613f;--serif:...;--sans:...}
```

The dark theme overrides them in the `prefers-color-scheme: dark` block. Change `--accent` to recolor buttons, the heat map, the calendar and the cactus pot.

## Sizes

- Widget width: `grid-template-columns:32px 60vw 32px` in `.wrow`.
- Widget height: `.widget{height:33vh}`.
- Phone layout: the block at the end of `css/style.css` (`max-width:700px`).
- Bookmark grid: `.grid` and `.tile`.

## Bookmark behaviour

Titles are fetched from the page through a CORS proxy when the name is left empty (`fetchTitle` in `app.js`); the hostname is used if that fails. Icons come from `icons.duckduckgo.com`. If an icon fails to load, the first letter of the title is shown instead.

## Backup and reset

Everything is in one `localStorage` key. In the browser console of the page:

```js
copy(localStorage.getItem('startpage:v1'))          // backup (to clipboard)
localStorage.setItem('startpage:v1', '<pasted json>') // restore, then reload
localStorage.removeItem('startpage:v1')              // reset everything
```

Widgets also keep short-lived caches under keys such as `gh-activity:`, `wx:`, `fx:` and `news:`; they can be removed safely.
