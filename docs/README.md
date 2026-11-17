# Documentation

Guides for running and extending the start page. The project is a Vue 3 single-page app built with Vite.

| Document | What it covers |
| --- | --- |
| [Getting started](getting-started.md) | Requirements, dev server, build, using it as a home page, project layout |
| [Architecture](architecture.md) | Startup sequence, state and storage, lazy widgets, i18n, drag and drop, build output |
| [Widgets](widgets.md) | Adding a widget, the widget API, built-in widgets |
| [Search history](history.md) | What is remembered for 30 days, the dropdown priority (bookmarks > history > suggestions), the security measures |
| [Modules](modules.md) | Server-driven panels over WebSocket: the protocol, the abstract UI, actions, writing a server, extending the client |
| [Localization](localization.md) | Adding a language and widget language packs |
| [Customization](customization.md) | Search engines, theme, sizes, backup and reset |
| [Testing and CI](testing.md) | Running the tests, what is covered, GitHub Actions, protecting `main` |

Changes compared with the old no-build version: [../CHANGELOG.md](../CHANGELOG.md).
