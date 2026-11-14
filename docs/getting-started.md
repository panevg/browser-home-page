# Getting started

## Requirements

Node.js **20.19+** or **22.12+** (required by Vite 7) and npm.

## Development

```sh
npm install
npm run dev
```

The dev server runs at `http://localhost:2783` with hot module replacement. The port is fixed and `strictPort` is on: if it is busy, Vite stops instead of choosing another port. This matters because `localStorage` (your bookmarks and widgets) belongs to the origin, so a different port would show an empty page.

## Production build

```sh
npm run build      # output goes to dist/
npm run preview    # serves dist/ at http://localhost:2783
```

`start.sh` does all of it: it runs `npm install` if `node_modules` is missing, `npm run build` if `dist` is missing, and then starts the preview server. After you change the code, run `npm run build` again (or delete `dist/`).

`dist/` is static and uses relative paths (`base: './'`), so you can also copy it to any static host or serve it with any web server, for example `python3 -m http.server 2783 -d dist`. Search suggestions and GitHub pinned repositories need the proxies from `vite.config.js` (see [Architecture](architecture.md)), which exist only under `npm run dev` / `npm run preview`. `dist/` cannot be opened from disk (`file://`): browsers block ES modules there.

## Use it as a home page

Set the address as the home page in your browser settings, for example `http://localhost:2783`. In Firefox open `about:preferences#home` and choose "Custom URLs". To start the server automatically on login, run `start.sh` from your system's autostart.

## Moving from the old (no-build) version

Your data is kept in `localStorage` under the same key (`startpage:v1`) and the format is unchanged. It is bound to the origin, so keep using the **same address** (for example `http://localhost:2783`) as before. If the old version ran on another port, copy the data once: in the old page's console run `copy(localStorage.getItem('startpage:v1'))`, then in the new page run `localStorage.setItem('startpage:v1', '<paste>')` and reload.

## Project layout

```
index.html                entry page: stylesheet + <script type="module" src="/src/main.js">
vite.config.js            Vue plugin, alias @ -> src, port 2783, relative base
package.json
start.sh
src/
  main.js                 loads the language, then mounts App.vue
  App.vue                 layout, global keyboard shortcuts, which dialog is open
  state.js                reactive state + localStorage persistence + validation
  components/
    SearchBox.vue         search field, engine menu, suggestions
    BookmarkGrid.vue      bookmark tiles
    WidgetList.vue        widget rows (show/hide/delete/reorder)
    BaseModal.vue         backdrop + form shared by the dialogs
    SettingsModal.vue  BookmarkModal.vue  WidgetModal.vue
    WidgetSkeleton.vue  WidgetError.vue   placeholders for async widgets
  composables/
    bookmarks.js  widgets.js              state actions
    dnd.js                                drag and drop handlers
    afterLoad.js                          "page loaded and browser idle" flag
  config/engines.js       search engines
  i18n/index.js           translation core
  locales/                index.js (language list) + one file per language
  widgets/
    registry.js           discovers widgets, wraps them in async components
    <type>/index.js       widget metadata (fields, summary, lazy component)
    <type>/<Name>Widget.vue
    <type>/lang/<code>.js
  utils/                  cache.js, net.js, url.js, misc.js
  directives/focus.js     v-focus
  styles/style.css        theme variables, layout, mobile rules
docs/                     this documentation
```

## Using the page

- **Search:** type a query, pick suggestions with the arrow keys, change the search engine with the button on the left of the field.
- **Bookmarks:** `+` (top right) or `Shift` + `+`. Hover (or tap, on touch screens) the cross to delete. Only `http(s)` addresses are accepted.
- **Widgets:** the `+` at the end of the widget list opens the picker. The minus button next to a widget collapses it into a grey bar with Show and Delete buttons.
- **Reorder:** drag with the mouse. On touch screens, drag a widget by its handle and a bookmark after a long press.
- `Esc` closes any dialog or menu.
