# Testing and CI

## Running the tests

Unit tests use [Vitest](https://vitest.dev) with jsdom and `@vue/test-utils`. Everything lives in `tests/`, mirroring `src/`.

```sh
npm install
npm test               # run once
npm run test:watch     # re-run on change
npm run coverage       # run once and print coverage; HTML-ready lcov report in coverage/
```

## What is covered

| Area            | Tests                                                                                                                                                                      |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/`        | `url.js` (only http(s) is accepted), `misc.js`, `cache.js` (TTL, corrupted or full storage), `net.js` (the fallback chain), `feed.js` (RSS / Atom parsing)                 |
| `state.js`      | Loading, repairing corrupted data, migration of the old `language` field, saving on every change                                                                           |
| `i18n/`         | Language detection, fallbacks, `{param}` formatting, relative dates, and a guard that **every language has the same keys as English (UK)** for the app and for each widget |
| `composables/`  | Bookmarks (title lookup), widgets, drag and drop (mouse and touch), the "after load" flag                                                                                  |
| `modules/`      | Module protocol and UI validation, the connection (handshake, requests, reconnect), the runtime (actions, saved values) and an end-to-end run against `examples/module-server.mjs` (Node 22+; skipped without a built-in `WebSocket`) |
| `widgets/`      | Registry discovery and order, widget definitions and summaries                                                                                                             |
| `components/`   | Cactus, News, To-do, Notes, Bookmark grid, Bookmark and Widget dialogs                                                                                                     |
| `vite-plugins/` | The `/feed-proxy` middleware against real local HTTP servers (Node environment)                                                                                            |

Not covered yet: `App.vue`, `SearchBox`, `SettingsModal`, `WidgetList` and the Weather, GitHub, Rates and Calendar widgets.

## Writing tests

- Files are named `tests/**/*.test.js`; import helpers from `vitest` explicitly (no globals).
- `@` points to `src`, as in the app.
- Code that keeps state at module level (`state.js`, `i18n`, `afterLoad.js`) is imported fresh per test with `vi.resetModules()`.
- Mock the network: `vi.mock('@/utils/net', ...)` for components, `vi.stubGlobal('fetch', ...)` for `net.js`.
- A test that needs real Node (HTTP servers) starts with `// @vitest-environment node`.

## Continuous integration

`.github/workflows/ci.yml` runs on every pull request and on every push to `main`:

1. **Test** on Node 20 and 22: `npm ci`, then `npm run coverage`. The coverage report is attached to the run as an artifact.
2. **Build**: `npm run build`, then checks that `dist/` has an `index.html` and JavaScript.
3. **All checks passed**: a single job that fails if either of the above failed.

Commit `package-lock.json` after changing dependencies: CI installs with `npm ci`, which fails when the lock file and `package.json` disagree.
