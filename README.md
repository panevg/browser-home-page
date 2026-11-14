# Custom Start Page

A personal start page for your browser: search, bookmarks, and widgets all in one place. No server, no build process, and no accounts required—everything runs entirely within your browser, and your settings are stored locally.

## Features

- **Search:** Includes suggestions (like Google) and a choice of search engines (similar to Tor Browser).
- **Bookmarks:** Displayed as a grid of icons. Add new ones using the `+` button in the top-right corner or by pressing `Shift` + `+`. If no name is provided, the page title is used automatically.
- **Widgets:** Loaded asynchronously after the page opens. They can be hidden, removed, or rearranged. Options include:
  GitHub (activity and pinned repositories), time and weather, a calendar, a to-do list, notes, currency exchange rates, the latest news (via RSS/Atom), and even a virtual cactus.
- **Drag-and-Drop:** Move bookmarks and widgets using your mouse or touchscreen (drag widgets via the ⠿ icon; move bookmarks via a long press).
- **Languages:** English (United Kingdom) and Ukrainian. The language is selected automatically based on your system settings, and the list can be expanded.
- **Light and Dark Themes:** Automatically adapts to your system settings; fully optimized for mobile devices.

## Getting Started

All you need is a web browser:

1. Open `index.html` directly, or launch a local server (e.g., run `python3 -m http.server 2783` in your terminal) and then navigate to `http://localhost:2783`.
2. To set it as your homepage, specify the address in your browser settings (e.g., in Firefox: `about:preferences#home`, "Custom URLs").

Vue is loaded via a CDN (jsDelivr), so an internet connection is required. For offline use, download `vue.global.prod.js` into the `js/` directory and update the `src` attribute in `index.html`.

## Data and Privacy

Bookmarks, widgets, language settings, and your selected search engine are stored in the browser's `localStorage` (under the key `startpage:v1`) and are updated whenever a change is made. External services are accessed directly from the browser: suggestions and icons (DuckDuckGo); page titles and pinned repositories (via the `allorigins.win` CORS proxy); and various widget APIs (GitHub, Open-Meteo, open.er-api.com).

## Structure

```
index.html        page template (Vue)
css/style.css     styles
js/app.js         main logic
js/store.js       data storage
js/i18n.js        localization
js/locales/       application languages
js/widgets/       widgets and their language packs
docs/             documentation (in English)
```

Instructions on how to add widgets, languages, and search engines can be found in [docs/](docs/README.md).
