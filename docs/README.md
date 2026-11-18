# Documentation

> Guides for using, extending and understanding the start page. English; the application itself is multilingual.

## Where to start

| You want to | Start here |
| --- | --- |
| **Use** the page | [Getting started](getting-started.md), then [Customization](customization.md) |
| **Extend** it | [API reference](api.md) for the extension points, then the guide for what you build: [Widgets](widgets.md), [Localization](localization.md), [Modules](modules.md) |
| **Understand** it | [Architecture](architecture.md), [Search history](history.md) |
| **Contribute** | [Testing](testing.md) and [CHANGELOG](../CHANGELOG.md) |

## All documents

| Document | Contents |
| --- | --- |
| [Getting started](getting-started.md) | Requirements, running, building, using the page as a home page, moving from the old version |
| [Customization](customization.md) | Search engines, settings, theme, sizes, bookmarks, backup and reset |
| [Widgets](widgets.md) | Writing a widget step by step, the built-in widgets and the rules of the games |
| [Localization](localization.md) | Language selection and adding a language |
| [Modules](modules.md) | Server-driven panels over WebSocket: protocol, abstract UI, actions, security, extending the client |
| [Search history](history.md) | What is remembered, how it ranks, the security model |
| [API reference](api.md) | Every extension point, function and type that you are meant to use |
| [Architecture](architecture.md) | Project structure, startup, state, lazy loading, proxies, build |
| [Testing](testing.md) | Running and writing tests, continuous integration |

## Glossary

| Term | Meaning |
| --- | --- |
| **State** | Everything the user has set up (bookmarks, widgets, settings, ...), one reactive object saved in `localStorage` |
| **Widget** | A box on the page with a Vue component of its own, found automatically in `src/widgets/<type>/`. Its **type** is the folder name |
| **Config** | A widget's own settings and saved data (`config`), part of the state |
| **Language pack** | The strings of one language: for the application (`src/locales/`) or for one widget (`src/widgets/<type>/lang/`) |
| **Module** | A panel whose interface is sent by *your* WebSocket server using the [module protocol](modules.md). Not the same as a JavaScript module |
| **Abstract UI** | The limited, style-free description of an interface that a module server sends |
| **Pack / chunk** | A separately downloaded piece of the build: one per widget and per language |
