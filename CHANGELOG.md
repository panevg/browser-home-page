# Changelog

## Unreleased
 
### Fixed

- **News widget did not load.** It depended on a single public CORS proxy (`allorigins.win`) that is often down or
  rate-limited. Feeds (and bookmark page titles) are now fetched by `fetchText()` in `src/utils/net.js`: directly, then
  through the new same-origin `/feed-proxy` (Vite dev/preview), then through several public proxies. A response is
  accepted only if it really is a feed, so a proxy returning an error page no longer breaks the widget. A UTF-8 BOM
  before the XML is tolerated.

### Added

- **Search history.** Searches are remembered for 30 days (at most 300) and used to improve the dropdown, which now has the
  priority bookmarks, then history (instant, works offline), then DuckDuckGo suggestions (a suggestion already in the history
  is not repeated). History is ranked by how it matches and by how often and how recently it was used. Security: text that
  looks like a secret or personal data (addresses, e-mails, `password:`/`token=` assignments, keys, JWTs, IBANs, long digit
  strings, long mixed letter-digit words) is never stored and such old entries are removed on load; invisible and
  direction-override characters are stripped; history has its own `localStorage` key so backups of the state do not contain
  it; it is rendered as plain text; other tabs stay in sync. Controls: a setting (on by default; switching it off deletes the
  history), a **Clear** button with the number of saved searches, a **×** on each history row and Shift+Delete. See `docs/history.md`.
- **Farm widget.** A small canvas game: coins arrive every hour, you build pens and buy animals (chicken, pig, sheep, cow),
  they are fully grown after 10 minutes and can be sold for a small amount. Selling a quota of animals raises the level,
  which raises the hourly income; every 5 levels all prices rise, and the first animal bought at the raised price is a
  *lucky* one that grows twice as long and sells for twice as much. Animals only move linearly, there are no sprites.
  Rules and numbers: `docs/widgets.md`, `src/widgets/farm/game.js`.
- **Modules.** The bottom-left button opens a dialog where a module is added by the address of a WebSocket server
  (`ws://` / `wss://`, saved before the panel is created). The panel looks like a widget (hide, show, delete, drag by the
  handle; modules only swap with modules) and is driven by the server through a small protocol with three message types:
  `ui` (the abstract interface, always the first message), `data` (information in both directions) and `request`
  (asking for information in both directions; the answer is a `data` message with `reply`). The interface is limited to
  a fixed set of components with a fixed look (`src/modules/protocol.js`); components can send input values to the
  server under a chosen identifier, request information, or wait for the next `ui`. Settings: per module (name, address,
  connect automatically, height) and global (enable, reconnect, delay, timeout); inputs marked `persist` are saved.
  See `docs/modules.md`, the zero-dependency demo server `examples/module-server.mjs` (`npm run example:module`) and the
  tests in `tests/modules/`.
- **Bookmarks in search.** Up to 3 bookmarks whose title or address contains the typed text are shown first in the
  dropdown (favicon on the left, bookmark mark on the right, arrow keys / Enter / click open them; `matchBookmarks()` in
  `src/utils/misc.js`). Can be switched off in the settings.
- **More settings** (gear button): search engine, open results in the same or a new tab, suggestions on/off and how
  many, focus on load, open typed addresses directly; theme (auto/light/dark), accent colour, heading, search field
  width and shape; bookmark size, names and open-in. Stored as `settings` in `localStorage` and validated on load
  (`src/config/settings.js`); older saves load unchanged. Sizes only affect the desktop layout.
- Unit tests (Vitest, jsdom, `@vue/test-utils`) for utilities, state, i18n (including a translation-completeness guard),
  composables, widgets, dialogs and the `/feed-proxy` plugin: `npm test`, `npm run coverage`.
- GitHub Actions workflow `.github/workflows/ci.yml`: tests (Node 20 and 22) and build on every pull request and push to
  `main`, with one "All checks passed" job to require in branch protection. See `docs/testing.md`.

### Changed

- RSS parsing moved to `src/utils/feed.js` and the proxy plugin to `vite-plugins/feed-proxy.js` so they can be tested on
  their own (no behaviour change).
- The bookmarks grid uses the shared thin site scrollbar (`.scroll`) instead of the browser default.
- Emoji in the cactus widget (actions and hidden-widget summary) were replaced with SVG icons in the style of the
  settings icon. The weather widget keeps its emoji.

> Run `npm run build` again (or restart `npm run dev`) so `dist/` and the proxy pick up these changes.

## 2.0.0 — Vite + Vue SFC

### Architecture

- The project is now a Vite build with Vue 3 single-file components (`.vue`). Vue is a regular dependency and the
  runtime-only build is used (no in-browser template compiler, no CDN).
- Global scripts (`window.Widgets`, `I18n`, `Store`) were replaced with ES modules.
- Widgets are discovered automatically: a folder `src/widgets/<type>/` with an `index.js` is all that is needed. Fields
  and summary moved from `registry.js` into the widget's own `index.js`.
- Widget code and CSS are split into chunks by Vite and loaded on demand (`defineAsyncComponent`).
- `app.js` was split into components and composables.
- Stored data is unchanged: the `startpage:v1` key and its format are compatible with the old version, so bookmarks and
  widgets carry over (same origin required, see the README).

### Fixed

- **Only one widget type loaded when several different types were on the page.** Every widget file was a classic script
  with top-level `const` declarations (`css`, `fmt`, ...). Classic scripts share one global scope, so the second widget
  script failed with `Identifier 'css' has already been declared` and its widget stayed a skeleton forever. Widgets are
  now modules with their own scope.
- `Ctrl` + `+` (browser zoom in) was swallowed by the "new bookmark" shortcut; only a plain `Shift` + `+` opens the
  dialog now.
- Deleting a bookmark or widget with an unknown id removed the last item (`splice(-1, 1)`).
- A bookmark icon that failed to load once (for example while offline) was marked broken **permanently** in
  `localStorage`. This is now kept in memory only.
- Invalid bookmark addresses closed the dialog silently; an error message is shown instead. Only `http(s)` addresses are
  accepted, which also blocks `javascript:` links. Stored bookmarks are validated on load.
- Corrupted or incomplete `localStorage` data (wrong types, missing `config`) no longer breaks the page.
- Suggestions could reappear after the field had been cleared (a late response); requests are now cancelled.
- Pressing `Enter` to confirm an IME composition started a search.
- In the "new widget" dialog every field grabbed focus, so the last one won; now the first field is focused.
- A touch drag could swallow the next tap.
- An unparsable date in an RSS feed threw an error and broke the whole news widget.
- Atom feeds with several `<link>` elements could pick the wrong link; the `alternate` link is preferred.
- A full `localStorage` made a successful widget request look like a load error. Cache writes are now safe.
- GitHub widget: errors other than "user not found" showed raw browser messages; `@name` input is accepted; an empty
  result now shows the "no pinned repositories" text.
- Weather widget: the cached place name stayed in the language of the first visit; the cache is now per language.
- The Wikipedia search engine always used the Ukrainian edition; it now follows the interface language (`%l` in the
  URL).
- CORS errors: search suggestions (DuckDuckGo) and GitHub pinned repositories now go through same-origin Vite proxies
  (`/ddg-ac`, `/gh-profile`) instead of a public proxy that returned 502.
- Port mismatch in the docs and `start.sh` (2083 vs 2783) and the hard-coded path in `start.sh`.

### Notes

- Widget network caches moved to the `startpage:cache:` key prefix. Old cache keys (`gh-activity:`, `wx:`, `fx:`,
  `news:`) are no longer used and can be removed.
- Two new interface strings were added to every language: `invalidUrl` and `widgetLoadError`.