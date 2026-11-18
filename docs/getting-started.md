# Getting started

> Install, run, build and use the start page.

**On this page:** [Requirements](#requirements) · [Development](#development) · [Production build](#production-build) ·
[Use it as a home page](#use-it-as-a-home-page) · [Using the page](#using-the-page) · [Moving from the old version](#moving-from-the-old-no-build-version)

## Requirements

Node.js **20.19+** or **22.12+** (required by Vite 7) and npm.

## Development

```sh
npm install
npm run dev
```

The dev server runs at `http://localhost:2784` with hot module replacement. The port is fixed and `strictPort` is on: if it
is busy, Vite stops instead of choosing another port. This matters because `localStorage` (your bookmarks and settings)
belongs to the address; a different port would show an empty page.

## Production build

```sh
npm run build      # output goes to dist/
npm run preview    # serves dist/ at http://localhost:2783
```

`start.sh` does all of it: it runs `npm install` if `node_modules` is missing, `npm run build` if `dist` is missing, and
then starts the preview server. After you change the code, run `npm run build` again (or delete `dist/`).

`dist/` is static and uses relative paths (`base: './'`), so you can copy it to any static host or serve it with any web
server, for example `python3 -m http.server 2783 -d dist`. Some features need the same-origin proxies that only the Vite
servers provide; without them, search suggestions are not shown and GitHub pinned repositories use a public proxy (see
[Architecture](architecture.md#same-origin-proxies)).

## Use it as a home page

Set the address as the home page in your browser settings, for example `http://localhost:2783`. In Firefox open
`about:preferences#home` and choose "Custom URLs". To start the server automatically on login, run `start.sh` from your
system's startup programs.

## Using the page

| Action | How |
| --- | --- |
| Search | Type; use the arrow keys to pick a row; change the engine with the button on the left of the field |
| Add a bookmark | `+` (top right) or `Shift` + `+`. Only `http(s)` addresses are accepted. Delete with the cross (always visible on touch screens) |
| Add a widget | The `+` at the end of the widget list. The minus button next to a widget collapses it into a bar with *Show* and *Delete* |
| Connect a module | The button in the bottom-left corner ([Modules](modules.md)) |
| Settings | The gear button (top left) |
| Reorder | Drag with the mouse. On touch screens, drag a widget by its handle and a bookmark after a long press |
| Close a dialog or menu | `Esc` |

## Moving from the old (no-build) version

Your data is kept in `localStorage` under the same key (`startpage:v1`) and the format is unchanged. It is bound to the
origin, so keep using the **same address** as before. If the old version ran from another address or from a file, export the
data there (see [Customization](customization.md#backup-and-reset)) and import it at the new address.

---

**Next:** [Customization](customization.md) · [Architecture](architecture.md)
