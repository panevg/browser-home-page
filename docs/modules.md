# Modules

A **module** is a panel on the page whose content is driven by *your own server* over a WebSocket. The page knows nothing
about what the module does: the server sends an abstract description of a user interface (buttons, text, inputs, ...),
the page draws it with its own fixed look, and user actions are sent back to the server.

```
 browser (start page)                          your server
 ────────────────────                          ───────────
 connect ───────────────────────────────────►  ws://host/path
          ◄──────────────────────────────────  {"type":"ui", ...}          (first message, mandatory)
 click "+" ──{"type":"data","id":"inc"} ────►
          ◄──────────────────────────────────  {"type":"data","id":"count","data":1}
 click "Time" ─{"type":"request",...} ──────►
          ◄──────────────────────────────────  {"type":"data","reply":"c1","data":"12:00"}
```

## Using modules

- The button in the **bottom-left corner** opens the *Modules* dialog.
- **Add module:** enter the server address (`ws://` or `wss://`; no scheme means `wss://`) and an optional name. The
  address is saved first, then the panel is created and connects. It appears below the widgets and behaves like one: it
  can be hidden (−), shown again, deleted and dragged by the ⠿ handle (modules only swap places with modules).
- **Settings of a module** (button *Settings* in the dialog): name, address, *connect automatically*, panel height.
- **Global settings** (gear button, section *Modules*): enable modules at all, reconnect automatically, reconnect delay,
  server response timeout. Module data is stored in `localStorage` with everything else (`modules` in `startpage:v1`).
- **Saving:** modules and their settings are saved on every change. Inputs marked `"persist": true` by the server also
  keep their value between page loads; everything else starts fresh.
- Only **connect to servers you trust**. A module cannot run code in the page or change its styles (see *Security*),
  but the server sees whatever you type into its inputs.

## Protocol (version 1)

### Transport

- WebSocket, **text frames with JSON**. Binary frames and messages larger than 256 KB are protocol errors.
- No sub-protocol is negotiated. Every message sent by the client has `"v": 1`; the server may omit `v`.
- Every message is an object with a `type`. There are exactly three types.

### 1. `ui`: the interface (server → client)

```json
{"type": "ui", "title": "Demo", "root": { "type": "column", "children": [ ... ]}}
```

- **The first message after connecting must be a `ui`.** If something else arrives first, the client closes the
  connection with code `4000` and shows an error. If nothing arrives within the *response timeout*, it closes with `4001`.
  Neither is retried automatically.
- A later `ui` **replaces** the whole interface. Values of inputs whose `id` still exists are kept.
- After a reconnect the server must send a `ui` again (it is the first message of the new connection).
- `title` (optional, up to 80 characters) is shown in the panel's status bar.

### 2. `data`: information transfer (both directions)

```json
{"type": "data", "id": "chat.say", "data": {"msg": "hello"}}
```

- `id` (required): an identifier, 1 to 64 characters of `A-Z a-z 0-9 _ . : -`.
- `data`: any JSON value.
- **Client → server:** produced by the `send` action of a component (see below).
- **Server → client:** stored by the client under `id` in the module's *data store*. Components that use
  `{"bind": "<id>"}` show the stored value and update immediately. The server can push as many updates as it likes.
- A `data` message that has a `reply` field is the **answer to a request** (next section), not an update.

### 3. `request`: asking for information (both directions)

```json
{"type": "request", "id": "time", "rid": "c1", "data": null}
{"type": "data", "reply": "c1", "data": "Server time: 12:00"}
{"type": "data", "reply": "c1", "error": "unknown request"}
```

- `id`: what is asked for. `rid`: a correlation id chosen by the sender; the answer repeats it as `reply`.
- The answer is a `data` message with `reply` and either `data` or `error` (a string). An unanswered request times out.
- **Client → server:** the `request` action of a component. The answer is written to the data store under the key given
  in the action's `into` (if any).
- **Server → client:** the page answers these built-in requests; any other id is answered with
  `error: "unknown request"`.

| Request `id` | `data` | Answer |
| --- | --- | --- |
| `values` | none | An object with the current value of every input: `{"msg": "hi", "agree": true}` |
| `value` | an input id | The value of that input (`error: "unknown component"` if there is none) |
| `client` | none | `{"protocol": 1, "lang": "en-GB", "theme": "auto"}` |

### Limits

Everything from the server is untrusted and is cut to these limits: message 256 KB, depth 8, 400 components, text 4000
characters, 200 list items, 100 select options, 8 steps per event, 50 fields per `from`, 200 keys in the data store.
Components or properties that are not listed below are dropped.

## The abstract UI

A node is an object with a `type` and the properties of that type. **No styles, classes or HTML exist**: text is always
shown as plain text, and the look is fixed by the page (it follows the theme and accent colour). Properties marked
*bindable* accept `{"bind": "key", "default": ...}` instead of a literal.

| `type` | Properties | Notes |
| --- | --- | --- |
| `column`, `row` | `children`, `gap` (`s`/`m`/`l`), `wrap` (row only) | Layout. Rows wrap only if `wrap` is true |
| `divider` | | A horizontal line |
| `heading` | `text` (bindable), `level` (1–3) | |
| `text` | `text` (bindable), `muted`, `mono` | Line breaks are kept |
| `link` | `text` (bindable), `href` | Only `http(s)` links; opens in a new tab |
| `image` | `src`, `alt` | Only `http(s)` sources |
| `progress` | `value` 0–100 (bindable), `label` (bindable) | |
| `list` | `items` (bindable array of strings), `ordered` | |
| `button` | `text` (bindable), `variant` (`primary`/`secondary`/`danger`), `disabled`, `on` | Event `click` |
| `input` | `id`*, `label`, `kind` (`text`/`number`/`password`/`email`/`url`/`search`), `placeholder`, `value`, `persist`, `on` | Events `change`, `submit` (Enter) |
| `textarea` | `id`*, `label`, `placeholder`, `value`, `rows` (1–10), `persist`, `on` | Event `change` |
| `checkbox` | `id`*, `label`, `value` (boolean), `persist`, `on` | Event `change` |
| `select` | `id`*, `label`, `options` (`["a", {"value": "b", "label": "B"}]`), `value`, `persist`, `on` | Event `change` |
| `slider` | `id`*, `label`, `min`, `max`, `step`, `value`, `persist`, `on` | Event `change` |

\* Input components **must** have a unique `id` (a component without one, or with a duplicate, is dropped). Their current
value lives in the page; it is read with `from` in actions or by the `values` / `value` requests. Other components may
have an `id` too, but it is not used.

While a module is not connected, or while it waits for a `ui` (`wait`), its inputs and buttons are disabled.

## Actions

The `on` property maps an event to **one action or a list of steps** that run in order:

```json
{"type": "button", "text": "Send", "on": {"click": [
  {"send": "chat.say", "from": "msg", "clear": ["msg"]}
]}}
```

| Step | Fields | What it does |
| --- | --- | --- |
| **send** | `send` (id), `from`, `value`, `clear` | Sends a `data` message with that `id` |
| **request** | `request` (id), `from`, `value`, `into` | Sends a `request` and waits for the answer; stores it in the data store under `into` |
| **wait** | `"wait": "ui"` | Pauses the steps (and locks the module's controls) until the server sends the next `ui` message; it times out after the *response timeout* |

- `from`: an input `id` (the payload is that input's value) or a list of ids (the payload is an object
  `{"id": value, ...}`). `value`: a literal JSON payload; it wins over `from`. With neither, the payload is `null`.
- `clear`: input ids that are reset to their initial `value` after the message was sent (e.g. to empty a chat field).
- If a step fails (not connected, timeout, error answer) the remaining steps are skipped and the error is shown in the
  panel. The text of an error answer comes from the server and is shown as plain text.

Typical patterns:

```jsonc
// "take values from components and send them with an identifier"
{"send": "settings.save", "from": ["name", "volume", "mute"]}

// "send, then wait until the server answers with a new interface"
[{"send": "login", "from": ["user", "pass"]}, {"wait": "ui"}]

// ask for information and show it
{"request": "weather", "from": "city", "into": "weatherText"}      // text: {"bind": "weatherText"}
```

## Complete example

A server that shows a counter. Run the ready-made demo with `npm run example:module` (it listens on
`ws://localhost:8787`; source: [`examples/module-server.mjs`](../examples/module-server.mjs), no dependencies).

```js
// server.mjs (uses the "ws" package: npm i ws)
import {WebSocketServer} from 'ws';

new WebSocketServer({port: 8787}).on('connection', socket => {
  let count = 0;
  const send = m => socket.send(JSON.stringify(m));

  send({type: 'ui', title: 'Counter', root: {type: 'row', children: [            // 1. the UI first
    {type: 'button', text: '−', on: {click: {send: 'dec'}}},
    {type: 'heading', text: {bind: 'count', default: '0'}},
    {type: 'button', text: '+', variant: 'primary', on: {click: {send: 'inc'}}}
  ]}});

  socket.on('message', raw => {
    const m = JSON.parse(raw);
    if (m.type === 'data' && (m.id === 'inc' || m.id === 'dec')) {                // 2. data from the client
      count += m.id === 'inc' ? 1 : -1;
      send({type: 'data', id: 'count', data: count});                             //    data to the client
    }
  });
});
```

Server checklist: send the `ui` immediately on connection; validate everything you receive (it comes from a browser
the user controls); keep messages small; answer every `request` (with `data` or `error`); expect a new connection after
every page load and every reconnect.

## Security model

- The client only understands the components above. There is no HTML, script, style or event-handler injection: text is
  rendered through Vue's text interpolation, links and images accept `http(s)` only (images are loaded with no referrer),
  and unknown fields are discarded by `sanitizeNode()` in `src/modules/protocol.js`.
- The server can make the page open an outgoing connection only to the address you entered, and send/receive only the
  data described here. It can never read other parts of the page, cookies, bookmarks or other modules.
- Input values are sent to the server only by an action you trigger or by a `values` / `value` request from the
  server, so do not type secrets into modules you do not trust. `password` inputs are not treated specially.
- Use `wss://` for servers on other machines. If the page is served over `https`, browsers may block plain `ws://`
  (mixed content). `ws://localhost` works with the default `http://localhost:2783` setup.

## Troubleshooting

| Status / message | Meaning |
| --- | --- |
| *The server did not send an interface in time* | Connected, but no `ui` arrived within the response timeout (settings) |
| *The first message must be an interface* | The server sent `data` / `request` before the first `ui` |
| *Invalid message from the server* | Not JSON, not an object, unknown `type`, a missing `id`, a binary frame, or too large |
| *The server sent an invalid interface* | The `root` was missing or none of its components are valid (for example an input without an `id`) |
| *Disconnected* | The connection dropped; it is retried automatically if enabled in the settings (doubling delay, up to 16×) |
| *Modules are turned off in the settings* | The *Enable modules* switch is off |

Open the browser's developer tools (Network → WS) to see the raw messages.

## Extending the client

All client code lives in `src/modules/` (no UI) and `src/components/Module*.vue`.

| File | Role |
| --- | --- |
| `src/modules/protocol.js` | Addresses, limits, message parsing, **the list of components (`SPEC`)** and action steps |
| `src/modules/connection.js` | One WebSocket: handshake rule, request/answer matching, timeouts, reconnect |
| `src/modules/runtime.js` | Per-module state (status, UI, data store, input values) and the action runner |
| `src/components/ModuleNode.vue` | Draws one node (recursive) |
| `src/components/ModuleView.vue` | A panel: status bar + the root node; acquires the runtime |
| `src/components/ModulesModal.vue` | The dialog opened by the bottom-left button |
| `src/composables/modules.js` | Add / remove / change address of a module in the state |

**Add a component**

1. `protocol.js`: add an entry to `SPEC` (`property: coercer`). Coercers must return a safe value for any input. If the
   component holds a value, add its type to `INPUTS` and list its events in `EVENTS`.
2. `ModuleNode.vue`: add a `v-else-if="node.type === '...'"` branch (text through `{{ }}`, never `v-html`).
3. `style.css`: style it in the *Modules* section, using the theme variables.
4. Add cases to `tests/modules/protocol.test.js` and `tests/components/modules.test.js`, and a row to the table above.

**Add an action step**: extend `step()` in `protocol.js` (a new `do` value) and the loop in `run()` in `runtime.js`.
**Add a built-in request the server can make**: extend `onRequest()` in `runtime.js` and the table above.
**Change a limit**: `LIMITS` in `protocol.js`. **Change the global settings**: see `src/config/settings.js`
(`modules` group), the labels in `src/locales/*.js` and the rows in `SettingsModal.vue`.
