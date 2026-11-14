# Custom Start Page

A personal start page for your browser: search, bookmarks and widgets in one place. It is a static single-page app built with **Vue 3 + Vite**. There is no backend and no accounts: everything runs in your browser and your data is stored in its `localStorage`.

## Features

- **Search:** suggestions (like Google) and a choice of search engines (similar to Tor Browser).
- **Bookmarks:** a grid of icons. Add one with the `+` button in the top-right corner or with `Shift` + `+`. If no name is given, the page title is used.
- **Widgets:** loaded lazily after the page opens (each widget is its own code chunk). They can be hidden, removed and rearranged. Built in: GitHub (activity and pinned repositories), clock and weather, calendar, to-do list, notes, exchange rates, news (RSS/Atom) and a virtual cactus. Any number of widgets, of any mix of types, can be on the page.
- **Drag and drop:** move bookmarks and widgets with the mouse or a touch screen (drag widgets by the ⠿ handle, bookmarks after a long press).
- **Languages:** English (United Kingdom) and Ukrainian. The language is picked from your system settings and the list can be extended.
- **Light and dark themes:** follows your system; works on mobile.

## Quick start

Requires **Node.js 20.19+** (or 22.12+).

```sh
npm install
npm run dev        # development server with hot reload: http://localhost:2783
```

To use it day to day, build once and serve the result:

```sh
npm run build      # creates dist/
npm run preview    # serves dist/ at http://localhost:2783
# or simply: ./start.sh   (installs, builds and serves as needed)
```

Then set `http://localhost:2783` as your browser home page (Firefox: `about:preferences#home`, "Custom URLs").

> The port is fixed (`strictPort`) because `localStorage` belongs to the origin: a different address means an empty page. The built `dist/` must be served over HTTP; opening `dist/index.html` from disk does not work because browsers block ES modules on `file://`.

## Tests

```sh
npm test            # unit tests (Vitest + jsdom)
npm run coverage    # the same, with a coverage report
```

GitHub Actions (`.github/workflows/ci.yml`) runs the tests and the build on every pull request and every push to `main`. See [docs/testing.md](docs/testing.md), including how to make the checks mandatory for `main`.

## Data and privacy

Bookmarks, widgets, the language and the selected search engine are stored in `localStorage` under the key `startpage:v1` and saved on every change. Short-lived network caches use keys starting with `startpage:cache:`. External services are called directly from the browser: suggestions and icons (DuckDuckGo); page titles and RSS feeds (directly, then through the local `/feed-proxy` of the Vite server, then through public CORS proxies as a last resort); pinned repositories (local `/gh-profile` proxy); and the widget APIs (GitHub, Open-Meteo, open.er-api.com).

## Project structure

```
index.html              entry page (loads src/main.js)
vite.config.js          Vite config (alias @ -> src, fixed port 2783, tests)
vite-plugins/           Vite plugin: /feed-proxy
tests/                  unit tests
.github/workflows/      CI
package.json
start.sh                build + serve helper
src/
  main.js               loads the language, mounts the app
  App.vue               layout, global shortcuts, dialogs
  state.js              the persisted reactive state (localStorage)
  components/           UI pieces: SearchBox, BookmarkGrid, WidgetList, dialogs
  composables/          bookmarks, widgets, drag and drop, "after page load"
  config/engines.js     search engines
  i18n/                 translation core
  locales/              application languages
  widgets/              registry.js + one folder per widget
  utils/ directives/    helpers (cache, URL parsing, v-focus, ...)
  styles/style.css      theme and layout
docs/                   documentation
```

## Documentation

See [docs/](docs/README.md): [getting started](docs/getting-started.md), [architecture](docs/architecture.md), [widgets](docs/widgets.md), [localization](docs/localization.md), [customization](docs/customization.md), [testing and CI](docs/testing.md). Notable changes from the previous no-build version are listed in [CHANGELOG.md](CHANGELOG.md).
