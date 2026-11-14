# Widgets

A widget is a Vue component with its own script, optional CSS and language packs. Adding one never requires touching `app.js` or `index.html`.

## The three parts

1. **A registry entry** in `js/widgets/registry.js`.
2. **A component file** that calls `Widgets.define(type, component, css)`.
3. **Language packs** in `js/widgets/<type>/lang/<code>.js`.

### 1. Registry entry

```js
hello: W('hello',
  [{ key: 'who', labelKey: 'whoLabel', placeholder: 'world', required: true }], // input fields of the "add widget" dialog
  c => c.who),                                                                  // short text for the collapsed placeholder
```

`W(name, fields, summary)` expects the files `js/widgets/<name>.js` and `js/widgets/<name>/lang/`. A field has `key` (stored in `config`), `labelKey` (a key in the language pack), `placeholder` and `required`. Use `[]` for widgets without settings.

### 2. Component file

```js
// js/widgets/hello.js
const css = `.hello{height:100%;display:grid;place-items:center;font:500 28px var(--serif)}`;

Widgets.define('hello', {
  props: ['config'],
  template: `<div class="hello">{{tr('greeting', { who: config.who })}}</div>`,
  methods: { tr: (key, params) => I18n.wt('hello', key, params) },
}, css);
```

Notes:

- The component receives its fields as the `config` prop.
- The templates are strings compiled in the browser, so no build tools are needed.
- Prefix your CSS classes (`.hello`, `.wx-`, `.gh-`) because the CSS is global.

### 3. Language packs

```js
// js/widgets/hello/lang/en-GB.js
I18n.defineWidget('hello', 'en-GB', {
  name: 'Hello',                         // required: shown in the picker
  description: 'Greets someone',         // required
  whoLabel: 'Who to greet',              // one key per field labelKey
  greeting: 'Hello, {who}!',
});
```

Create the same file for every language (`uk.js`, ...). `en-GB` is the fallback. A missing pack file is not an error.

## Widget API cheat sheet

| Need | How |
| --- | --- |
| Settings entered by the user | `this.config.<key>` |
| Persistent data | Mutate `this.config` (`this.config.items.push(...)`). It is saved instantly. Initialise defaults in `created()` (`this.config.items ||= []`) and never replace `this.config` itself. |
| Translations | `I18n.wt(type, key, params)`; `{name}` placeholders. Reads the current language reactively. |
| Relative time | `I18n.ago(date)` |
| Date and number formatting | `Intl.*` with `I18n.data.lang` |
| Timers | Start in `created()`, clear in `beforeUnmount()` |
| Network data | `fetch` the API directly if it allows CORS, otherwise use `https://api.allorigins.win/raw?url=`. Cache in `localStorage` with a timestamp. |
| Scrolling list | Add `class="scroll"` for the thin themed scrollbar, and make the list `flex:1; min-height:0; overflow-y:auto` |
| Links from external data | Open with `target="_blank" rel="noopener"` and accept only `http(s)` URLs |

## Layout and theme

The widget box is 60% of the screen width and one third of its height on desktop, and full width on phones. The component fills it (`height:100%`). Use the theme variables so dark mode works: `--bg`, `--card`, `--text`, `--muted`, `--line`, `--soft`, `--accent`, `--accent-d`, `--serif`, `--sans`.

On narrow screens add a rule for your layout, for example `@media(max-width:620px){ ... }` inside the widget CSS.

## Built-in widgets

| Type | Settings | Notes |
| --- | --- | --- |
| `github` | username | Heat map of public events (last 90 days). Pinned repositories come from the profile page; if they cannot be loaded, recent activity is shown instead. |
| `weather` | city | Clock in the city's time zone and weather from Open-Meteo, with a 3-day forecast. |
| `calendar` | none | Month view, week starts on Monday. |
| `todo` | none | Items are stored in `config.items`. |
| `notes` | optional title | Text is stored in `config.text`. |
| `rates` | base, targets | Exchange rates with a converter. |
| `news` | feed URL, optional title | RSS or Atom headlines through the CORS proxy. |
| `cactus` | optional name | See below. |

### Cactus rules

The cactus grows with real time, even while the page is closed. Its growth is `hours since planting + bonus`. The three actions (water, sunlight, fertiliser) can each be used once per hour and add a bonus of 0.25, 0.25 and 0.5 hours of growth. Using every action every hour at most doubles the speed. Stages start at 0, 1, 24, 72, 168 and 336 growth hours. Arms appear at 72 and 168 hours, and a flower at 336. State is stored in `config.planted`, `config.bonus` and `config.last`. The constants are at the top of `js/widgets/cactus.js`.
