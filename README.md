# Custom Start Page

> A personal start page for your browser: search, bookmarks and widgets in one place.
> A static app (**Vue 3 + Vite**) with no backend and no accounts. Everything runs in your browser.

## Highlights

| | |
| --- | --- |
| **Search** | Suggestions as you type and a choice of search engines. The dropdown is ordered **bookmarks → history → suggestions**. |
| **Bookmarks** | A grid of icons. Add one with `+` (top right) or `Shift` + `+`; without a name, the page title is used. |
| **Widgets** | GitHub activity, clock and weather, calendar, to-do list, notes, exchange rates, news (RSS/Atom), a virtual cactus and more. Loaded lazily, one code chunk each. Hide, remove and reorder them. |
| **Modules** | Panels driven by **your own server over WebSocket**: the server sends an abstract UI, the page draws it, actions go back as messages. [Learn more](docs/modules.md) |
| **Search history** | Searches are remembered for 30 days. Secrets and personal data are never stored; it can be cleared or switched off. [Learn more](docs/history.md) |
| **Personal** | Light, dark or system theme, accent colours, English, Ukrainian and German (more can be added), drag and drop on mouse and touch, mobile layout. |

## Quick start

Requires **Node.js 20.19+** (or 22.12+).

```sh
npm install
npm run dev        # development server with hot reload: http://localhost:2784
```

For everyday use, build once and serve the result:

```sh
npm run build      # creates dist/
npm run preview    # serves dist/ at http://localhost:2783
# or just: ./start.sh   (installs, builds and serves as needed)
```

Then set `http://localhost:2783` as your browser's home page (Firefox: `about:preferences#home`, "Custom URLs").

> **Keep the address the same.** `localStorage` belongs to the origin, so a different host or port is an empty page.
> The port is fixed for this reason. Serve `dist/` over HTTP: opening `dist/index.html` from disk does not work, because
> browsers block ES modules on `file://`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload (port 2784) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serves `dist/` (port 2783) |
| `npm test` | Unit tests (Vitest + jsdom) |
| `npm run coverage` | Tests with a coverage report |
| `npm run example:module` | Demo server for [modules](docs/modules.md) on `ws://localhost:8787` |

## Documentation

Start with the [documentation index](docs/README.md).

| I want to... | Read |
| --- | --- |
| install, run and use it | [Getting started](docs/getting-started.md) |
| add a widget | [Widgets](docs/widgets.md) |
| add a language | [Localization](docs/localization.md) |
| change engines, theme or settings | [Customization](docs/customization.md) |
| connect my own server | [Modules](docs/modules.md) |
| look up a function, type or extension point | [API reference](docs/api.md) |
| understand how it works | [Architecture](docs/architecture.md) |
| run or write tests | [Testing](docs/testing.md) |

Changes between versions are listed in [CHANGELOG.md](CHANGELOG.md).

## Data and privacy

Bookmarks, widgets, modules, settings, the language and the search engine are stored in your browser's `localStorage`
(key `startpage:v1`) and saved on every change. The [search history](docs/history.md) has its own key, so backups of the
state never contain it. Nothing is sent to a server of ours: there is none. External services are called directly from
your browser (search suggestions and icons from DuckDuckGo, widget APIs, and CORS proxies for page titles and feeds);
the full list is in the [architecture](docs/architecture.md#external-services).

## Project structure

```
src/             application code (see docs/architecture.md for the full tree)
  widgets/       one folder per widget: the registry discovers them
  locales/       interface languages
  modules/       the WebSocket module protocol and runtime
docs/            documentation
examples/        demo module server
tests/           unit tests, mirroring src/
```

Continuous integration (`.github/workflows/ci.yml`) runs the tests and the build on every pull request; see
[Testing](docs/testing.md).
