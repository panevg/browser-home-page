/**
 * Shared type definitions. This file has no runtime code: it only describes the shapes that the extension points use,
 * so that editors can offer completion and checking. Refer to a type from any file with
 * `@type {import('@/types').WidgetDefinition}`. The same shapes are described in prose in docs/api.md.
 *
 * @module types
 */

// ---- Widgets ---------------------------------------------------------------------------------------------------

/**
 * One input of the "new widget" dialog. The entered value is stored in the widget's `config` under `key`.
 * @typedef {object} WidgetField
 * @property {string} key          Name of the property in `config`.
 * @property {string} labelKey     Key of the label in the widget's language pack.
 * @property {string} [placeholder] Example value shown in the empty input (not translated).
 * @property {boolean} [required]  The dialog cannot be submitted while a required field is empty.
 */

/**
 * What `src/widgets/<type>/index.js` exports by default. The widget's language packs must define `name` and
 * `description` and one key for every `labelKey`.
 * @typedef {object} WidgetDefinition
 * @property {number} [order]      Position in the "new widget" picker; lower comes first. Default 100.
 * @property {WidgetField[]} fields Inputs of the "new widget" dialog. Use `[]` for a widget without settings.
 * @property {(config: object) => string} summary
 *           Short text shown on the collapsed (hidden) widget. Must cope with an incomplete `config`.
 * @property {(config: object) => object} [prepare]
 *           Adjusts the entered values before the widget is saved (for example, strips a leading `@`).
 * @property {() => Promise<{default: import('vue').Component}>} component
 *           Lazy loader of the Vue component: `() => import('./MyWidget.vue')`. The component receives one prop, `config`.
 */

/**
 * A widget on the page, as saved in the state.
 * @typedef {object} WidgetInstance
 * @property {string} id
 * @property {string} type    Folder name under `src/widgets/`.
 * @property {object} config  The widget's settings and its own saved data. Mutate it to save (it is reactive).
 * @property {boolean} hidden
 */

// ---- Application data ------------------------------------------------------------------------------------------

/**
 * @typedef {object} Bookmark
 * @property {string} id
 * @property {string} url     Always an `http(s)` address.
 * @property {string} host
 * @property {string} title
 */

/**
 * A search engine. `%s` in `url` is replaced with the encoded query and `%l` with the base language of the interface.
 * @typedef {object} Engine
 * @property {string} name
 * @property {string} host    Used to fetch the icon.
 * @property {string} url
 */

/**
 * An interface language.
 * @typedef {object} Language
 * @property {string} code    BCP 47 code, for example `en-GB`. Also used for date and number formatting.
 * @property {string} name    Shown in the language list, in the language itself and without a flag.
 * @property {() => Promise<{default: Record<string, string>}>} load  Lazy loader of the strings file.
 */

/**
 * @typedef {object} SearchSettings
 * @property {'self'|'blank'} openIn
 * @property {boolean} suggestions
 * @property {number} suggestionsMax
 * @property {boolean} bookmarkSuggestions
 * @property {boolean} history
 * @property {boolean} autofocus
 * @property {boolean} directUrls
 */

/**
 * @typedef {object} UiSettings
 * @property {'auto'|'light'|'dark'} theme
 * @property {string} accent         A key of `ACCENTS`.
 * @property {boolean} showTitle
 * @property {'s'|'m'|'l'} searchWidth
 * @property {'pill'|'round'|'square'} searchShape
 * @property {'s'|'m'|'l'} tileSize
 * @property {boolean} tileLabels
 * @property {'self'|'blank'} bookmarksOpenIn
 */

/**
 * @typedef {object} ModuleSettings
 * @property {boolean} enabled
 * @property {boolean} reconnect
 * @property {number} reconnectDelay   Seconds.
 * @property {number} requestTimeout   Seconds.
 */

/**
 * @typedef {object} Settings
 * @property {SearchSettings} search
 * @property {UiSettings} ui
 * @property {ModuleSettings} modules
 */

/**
 * A module: a panel driven by a WebSocket server (docs/modules.md).
 * @typedef {object} ModuleEntry
 * @property {string} id
 * @property {string} name
 * @property {string} url             A `ws://` or `wss://` address.
 * @property {boolean} hidden
 * @property {boolean} autoConnect
 * @property {'s'|'m'|'l'} size
 * @property {Record<string, string|number|boolean>} values  Saved values of inputs marked `persist`.
 */

/**
 * Everything that is saved under the `startpage:v1` key of `localStorage`.
 * @typedef {object} AppState
 * @property {number} engine          Index into `ENGINES`.
 * @property {string|null} lang       Language code, or `null` until the first visit has chosen one.
 * @property {Settings} settings
 * @property {Bookmark[]} bookmarks
 * @property {WidgetInstance[]} widgets
 * @property {ModuleEntry[]} modules
 */

/**
 * One remembered search. The history lives under its own key, not in {@link AppState}.
 * @typedef {object} HistoryEntry
 * @property {string} q               The search text.
 * @property {number} t               Time of the last use, in ms since the epoch.
 * @property {number} n               How many times it was used.
 */

// ---- Module protocol (docs/modules.md) -------------------------------------------------------------------------

/**
 * A step of an action. `send` and `request` carry a payload taken from components (`from`) or given literally (`value`).
 * @typedef {{send: string, from?: string|string[], value?: *, clear?: string[]}
 *         | {request: string, from?: string|string[], value?: *, into?: string}
 *         | {wait: 'ui'}} ActionStep
 */

/**
 * A node of the abstract UI that a server sends. `type` is one of the components listed in docs/modules.md.
 * @typedef {object} UiNode
 * @property {string} type
 * @property {string} [id]            Required for input components (`input`, `textarea`, `checkbox`, `select`, `slider`).
 * @property {UiNode[]} [children]    For `column` and `row`.
 * @property {Record<string, ActionStep|ActionStep[]>} [on]  Event name to action.
 */

/**
 * The three kinds of message. A reply to a request is a `data` message with `reply`.
 * @typedef {{type: 'ui', title?: string, root: UiNode}
 *         | {type: 'data', id?: string, data?: *, reply?: string, error?: string}
 *         | {type: 'request', id: string, rid: string, data?: *}} ProtocolMessage
 */

export {}; // makes this file a module
