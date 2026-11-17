# Widgets

A widget is a folder in `src/widgets/` with a Vue single-file component, a small metadata file and language packs. Adding one never requires touching `App.vue`, `registry.js` or any other shared file: the registry discovers it automatically.

```
src/widgets/hello/
  index.js              metadata
  HelloWidget.vue       the component (+ its CSS)
  lang/en-GB.js         language packs
  lang/uk.js
```

The folder name is the widget **type** (stored in the saved state, so do not rename it later).

## 1. `index.js`: metadata

```js
export default {
  order: 90,                                                  // position in the picker (default 100)
  fields: [{ key: 'who', labelKey: 'whoLabel', placeholder: 'world', required: true }], // inputs of the "new widget" dialog
  summary: c => c.who,                                        // short text of the collapsed (hidden) widget
  prepare: c => ({ ...c, who: c.who.toUpperCase() }),         // optional: adjust the config before it is saved
  component: () => import('./HelloWidget.vue'),               // lazy: loaded when first rendered
};
```

A field has `key` (stored in `config`), `labelKey` (a key in the language pack), `placeholder` and `required`. Use `fields: []` for widgets without settings. Empty optional values are not stored.

## 2. Component

```vue
<!-- src/widgets/hello/HelloWidget.vue -->
<script setup>
import { wt } from '@/i18n';

const props = defineProps({ config: { type: Object, required: true } });
const tr = (key, params) => wt('hello', key, params);
</script>

<template>
  <div class="hello">{{ tr('greeting', { who: config.who }) }}</div>
</template>

<style>
.hello{height:100%;display:grid;place-items:center;font:500 28px var(--serif)}
</style>
```

Notes:

- The component receives its settings as the `config` prop.
- Each widget is its own ES module, so top-level names (`const css`, `const fmt`, ...) never clash with other widgets.
- The `<style>` block is global and ends up in the widget's own CSS chunk. Prefix your classes (`.hello`, `.wx-`, `.gh-`) or use `<style scoped>`.
- The widget root must fill the box (`height:100%`).

## 3. Language packs

```js
// src/widgets/hello/lang/en-GB.js
export default {
  name: 'Hello',                  // required: shown in the picker
  description: 'Greets someone',  // required
  whoLabel: 'Who to greet',       // one key per field labelKey
  greeting: 'Hello, {who}!',
};
```

Create the same file for every language (`uk.js`, ...). `en-GB` is the fallback, and a missing pack file is not an error.

## Widget API cheat sheet

| Need | How |
| --- | --- |
| Settings entered by the user | `props.config.<key>` (`config.<key>` in the template) |
| Persistent data | Mutate `props.config` (`props.config.items.push(...)`). It is saved instantly. Set defaults at the top of `<script setup>` (`props.config.items ||= []`) and never replace `config` itself. |
| Translations | `wt(type, key, params)` from `@/i18n`; `{name}` placeholders. Reads the current language reactively. |
| Relative time | `ago(date)` from `@/i18n` (returns `''` for an invalid date) |
| Date and number formatting | `Intl.*` with `data.lang` (`import { data } from '@/i18n'`) |
| Timers | Create them in `<script setup>`, clear them in `onBeforeUnmount` |
| Network data | `fetch` the API directly if it allows CORS, otherwise use `proxied(url)` from `@/utils/net`. Cache with `cached(key, ttlMs, fetcher, isValid?)` from `@/utils/cache`. |
| Scrolling list | Add `class="scroll"` for the thin themed scrollbar, and make the list `flex:1; min-height:0; overflow-y:auto` |
| Links from external data | Open with `target="_blank" rel="noopener"` and accept only `http(s)` URLs |

`cached()` stores the result in `localStorage` (`startpage:cache:<key>`) and never throws because of a full storage. Pass `isValid` to skip caching empty results.

## Layout and theme

The widget box is 60% of the screen width and one third of its height on desktop, and full width on phones. The component fills it. Use the theme variables so dark mode works: `--bg`, `--card`, `--text`, `--muted`, `--line`, `--soft`, `--accent`, `--accent-d`, `--serif`, `--sans`. On narrow screens add a rule such as `@media(max-width:620px){ ... }` to your widget CSS.

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
| `farm` | none | A small farm game on a canvas. See below. |

### Cactus rules

The cactus grows with real time, even while the page is closed. Its growth is `hours since planting + bonus`. The three actions (water, sunlight, fertiliser) can each be used once per hour and add a bonus of 0.25, 0.25 and 0.5 hours of growth. Using every action every hour at most doubles the speed. Stages start at 0, 1, 24, 72, 168 and 336 growth hours. Arms appear at 72 and 168 hours, and a flower at 336. State is stored in `config.planted`, `config.bonus` and `config.last`. The constants are at the top of `src/widgets/cactus/CactusWidget.vue`.

### Farm rules

A canvas game. Click an **empty spot** to buy the chosen animal, a **grown animal** (it has a gold dot) to sell it, and the dashed **+** tile to build another pen. Everything is computed from timestamps, so animals grow and coins arrive while the page is closed (hiding the widget pauses nothing except the display). The state is `config.farm`; the rules are pure functions in `src/widgets/farm/game.js`, the geometry is in `layout.js`, the drawing in `render.js`. All numbers are constants at the top of `game.js`.

| Rule | Value |
| --- | --- |
| Hourly income | `20 + 8 × (level − 1)` coins, paid automatically every hour; at most 24 missed hours are paid when you come back |
| Start | 40 coins, level 1, one pen (4 places); more pens cost 60, 150, 320 and 600 (5 pens at most) |
| Growth | An animal is fully grown after **10 minutes**; only grown animals can be sold |
| Animals (base price) | Chicken 10 (level 1), Pig 30 (level 2), Sheep 60 (level 4), Cow 120 (level 7) |
| Selling | A grown animal sells for 60% of its price: a small amount |
| Quota | To reach the next level you must sell a quota of animals, for example level 1: 2 chickens, level 2: 2 pigs, level 4: 3 chickens and 2 sheep. Only animals of the quota count |
| Price tiers | Every 5 levels (5, 10, 15, ...) all prices rise by another 40% of the base price |
| Lucky animal | The **first animal bought after a new price tier** (so at the raised price) is *lucky*: it grows twice as long (20 minutes) and sells for **twice** as much. It has a gold outline and a star |

Animals only move in a straight line, back and forth inside their own place, at a constant speed; there are no sprites, only flat shapes.
