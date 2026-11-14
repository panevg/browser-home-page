# Getting started

## Run it

Open `index.html` directly in a browser, or serve the folder:

```sh
python3 -m http.server 2783   # or ./start.sh (edit the path inside first)
```

Then open `http://localhost:2783`. Serving over `http://localhost` is recommended: `localStorage` behaves the same in every browser, and `file://` pages can be treated as separate origins per file.

## Use it as a home page

Set the page address as the home page in your browser settings, for example `http://localhost:2783` or `file:///path/to/index.html`. In Firefox, open `about:preferences#home` and choose "Custom URLs".

## Offline use

Vue is loaded from jsDelivr (`index.html`). To work offline, download `https://cdn.jsdelivr.net/npm/vue@3.5.13/dist/vue.global.prod.js` into `js/` and change the `<script src>` accordingly. The full build (with the template compiler) is required, because widgets use string templates.

## Project layout

```
index.html           page template (Vue in-DOM template, modals)
css/style.css        theme variables, layout, mobile rules
js/store.js          localStorage persistence
js/i18n.js           translation core
js/locales/          index.js (language list) + one file per language
js/widgets/          registry.js, <widget>.js and <widget>/lang/<code>.js
js/app.js            search, bookmarks, widgets, settings, drag and drop
docs/                this documentation
```

## Using the page

- Search: type a query, pick suggestions with the arrow keys, change the search engine with the button on the left of the field.
- Bookmarks: `+` (top right) or `Shift` + `+`. Hover (or tap, on touch screens) the cross to delete.
- Widgets: the `+` at the end of the widget list opens the picker. The minus button next to a widget collapses it into a grey bar with Show and Delete buttons.
- Reorder: drag bookmarks and widgets with the mouse. On touch screens, drag a widget by its handle and a bookmark after a long press.
- `Esc` closes any dialog.
