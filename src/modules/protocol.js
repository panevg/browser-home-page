/**
 * Client side of the module protocol, version 1: validation of incoming messages and of the abstract UI, and builders for
 * outgoing messages. Everything that comes from a server is untrusted: it is parsed, cut to the limits below and reduced
 * to known fields, so a server can only ever produce the components listed in `SPEC`.
 * The wire format for server authors: docs/modules.md
 */

/** Protocol version, sent as `v` in every client message. */
export const PROTOCOL = 1;

/** Hard limits for everything a server sends. */
export const LIMITS = {message: 256 * 1024, depth: 8, nodes: 400, text: 4000, items: 200, options: 100, steps: 8, fields: 50};

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const RESERVED = ['__proto__', 'constructor', 'prototype'];
/** Whether `v` is a valid identifier: 1 to 64 characters of `A-Z a-z 0-9 _ . : -`, and not a name that could pollute objects. */
export const isId = v => typeof v === 'string' && /^[\w.:-]{1,64}$/.test(v) && !RESERVED.includes(v);

// ---- Addresses ----
/**
 * Normalises a server address. Only `ws://` and `wss://` are accepted; no scheme means `wss://`.
 * @param {string} input
 * @returns {{url: string, host: string}|null} `null` when the input is not a usable address.
 */
export function parseWsUrl(input) {
	let u = String(input || '').trim();
	if (!u) return null;
	if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = 'wss://' + u;
	try {
		const x = new URL(u);
		if (!/^wss?:$/.test(x.protocol) || !x.hostname) return null;
		return {url: x.href, host: x.host};
	} catch {
		return null;
	}
}

// ---- Value coercers: always return a safe value, never throw ----
const text = v => (typeof v === 'string' ? v.slice(0, LIMITS.text) : typeof v === 'number' && Number.isFinite(v) ? String(v) : '');
const bool = v => v === true;
const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const oneOf = (list, d) => v => (list.includes(v) ? v : d);
const strings = v => (Array.isArray(v) ? v.slice(0, LIMITS.items).map(text) : []);
const bind = fn => v => (isObj(v) && isId(v.bind) ? {bind: v.bind, default: fn(v.default)} : fn(v)); // {"bind": "key", "default": ...}
const httpUrl = v => {
	try {
		const x = new URL(String(v));
		return /^https?:$/.test(x.protocol) ? x.href : '';
	} catch {
		return '';
	}
};
const options = v => (Array.isArray(v) ? v : []).slice(0, LIMITS.options).map(o => (isObj(o) ? {value: text(o.value), label: text(o.label ?? o.value)} : {value: text(o), label: text(o)}));

const gap = oneOf(['s', 'm', 'l'], 'm');
const KINDS = ['text', 'number', 'password', 'email', 'url', 'search'];

// The complete list of components and of their properties. Nothing about colours, sizes or CSS can be set.
const SPEC = {
	column: {gap},
	row: {gap, wrap: bool},
	divider: {},
	heading: {text: bind(text), level: oneOf([1, 2, 3], 2)},
	text: {text: bind(text), muted: bool, mono: bool},
	link: {text: bind(text), href: httpUrl},
	image: {src: httpUrl, alt: text},
	progress: {value: bind(v => clamp(num(v), 0, 100)), label: bind(text)},
	list: {items: bind(strings), ordered: bool},
	button: {text: bind(text), variant: oneOf(['primary', 'secondary', 'danger'], 'secondary'), disabled: bool},
	input: {label: text, kind: oneOf(KINDS, 'text'), placeholder: text, value: text, persist: bool},
	textarea: {label: text, placeholder: text, value: text, rows: v => clamp(Math.round(num(v, 3)), 1, 10), persist: bool},
	checkbox: {label: text, value: bool, persist: bool},
	select: {label: text, options, value: text, persist: bool},
	slider: {label: text, min: num, max: v => num(v, 100), step: v => num(v, 1), value: num, persist: bool}
};
/** Components that hold a value; each needs a unique `id`. */
export const INPUTS = new Set(['input', 'textarea', 'checkbox', 'select', 'slider']); // these need a unique `id`
const EVENTS = {button: ['click'], input: ['change', 'submit'], textarea: ['change'], checkbox: ['change'], select: ['change'], slider: ['change']};

// ---- Actions: what a component does on an event. Steps run in order. ----
//  {"send": id, "from": "compId" | ["compId", ...], "value": <json>, "clear": ["compId"]}   data message to the server
//  {"request": id, "from": ..., "value": ..., "into": "dataKey"}                           request, answer goes to data[into]
//  {"wait": "ui"}                                                                          block until the next ui message
const from = v => (isId(v) ? v : Array.isArray(v) ? v.filter(isId).slice(0, LIMITS.fields) : null);

function step(s) {
	if (!isObj(s)) return null;
	if (isId(s.send)) return {do: 'send', id: s.send, from: from(s.from), value: s.value, clear: Array.isArray(s.clear) ? s.clear.filter(isId) : []};
	if (isId(s.request)) return {do: 'request', id: s.request, from: from(s.from), value: s.value, into: isId(s.into) ? s.into : null};
	if (s.wait === 'ui') return {do: 'wait'};
	return null;
}

function actions(raw, events) {
	const out = {};
	if (!isObj(raw)) return out;
	for (const ev of events) {
		const list = (Array.isArray(raw[ev]) ? raw[ev] : raw[ev] ? [raw[ev]] : []).slice(0, LIMITS.steps).map(step).filter(Boolean);
		if (list.length) out[ev] = list;
	}
	return out;
}

// ---- UI tree ----
/**
 * Reduces an untrusted UI node (and its children) to the known components and properties: unknown types and fields are
 * dropped, values are coerced to safe ones, limits are applied, and inputs without a unique `id` are removed.
 * @param {*} raw  Anything: it comes from outside and is not trusted.
 * @param {{nodes: number, ids: Set<string>}} [ctx]  Counters shared by the whole tree (internal: leave it out).
 * @param {number} [depth]  Current depth (internal: leave it out).
 * @returns {import('@/types').UiNode|null} `null` when the node is not a usable component.
 */
export function sanitizeNode(raw, ctx = {nodes: 0, ids: new Set()}, depth = 0) {
	if (!isObj(raw) || depth > LIMITS.depth || ++ctx.nodes > LIMITS.nodes) return null;
	if (!Object.hasOwn(SPEC, raw.type)) return null;
	const node = {type: raw.type};
	for (const [k, fn] of Object.entries(SPEC[raw.type])) node[k] = fn(raw[k]);
	if (INPUTS.has(raw.type)) {
		if (!isId(raw.id) || ctx.ids.has(raw.id)) return null; // inputs are identified by their id
		ctx.ids.add(raw.id);
	}
	if (isId(raw.id)) node.id = raw.id;
	if (EVENTS[raw.type]) node.on = actions(raw.on, EVENTS[raw.type]);
	if (raw.type === 'column' || raw.type === 'row') {
		node.children = (Array.isArray(raw.children) ? raw.children : []).map(c => sanitizeNode(c, ctx, depth + 1)).filter(Boolean);
	}
	if (node.type === 'slider') {
		if (node.max <= node.min) node.max = node.min + 100;
		if (!(node.step > 0)) node.step = 1;
		node.value = clamp(node.value, node.min, node.max);
	}
	if (node.type === 'select' && !node.options.some(o => o.value === node.value)) node.value = node.options[0]?.value ?? '';
	return node;
}

// ---- Messages ----
/**
 * Parses and validates one text frame from the server. Types: `ui` (server to client), `data` and `request` (both
 * directions). A reply to a request is a `data` message with `reply` = the request's `rid` (and `error` when it failed).
 * @param {unknown} raw  The frame; anything but a string (a binary frame) is an error.
 * @returns {{msg?: import('@/types').ProtocolMessage, error?: 'json'|'size'|'shape'|'type'|'id'|'ui'}} Exactly one of `msg` (valid) and `error` (why not).
 */
export function parseMessage(raw) {
	if (typeof raw !== 'string') return {error: 'json'};
	if (raw.length > LIMITS.message) return {error: 'size'};
	let m;
	try {
		m = JSON.parse(raw);
	} catch {
		return {error: 'json'};
	}
	if (!isObj(m)) return {error: 'shape'};
	switch (m.type) {
		case 'ui': {
			const root = sanitizeNode(m.root);
			return root ? {msg: {type: 'ui', title: text(m.title).slice(0, 80), root}} : {error: 'ui'};
		}
		case 'data':
			if (m.reply != null) return isId(String(m.reply)) ? {msg: {type: 'data', reply: String(m.reply), data: m.data, error: typeof m.error === 'string' ? m.error.slice(0, 200) : ''}} : {error: 'id'};
			return isId(m.id) ? {msg: {type: 'data', id: m.id, data: m.data, reply: null}} : {error: 'id'};
		case 'request':
			return isId(m.id) && isId(m.rid) ? {msg: {type: 'request', id: m.id, rid: m.rid, data: m.data}} : {error: 'id'};
		default:
			return {error: 'type'};
	}
}

/** A `data` message for the server, as JSON text. */
export const dataMsg = (id, data) => JSON.stringify({v: PROTOCOL, type: 'data', id, data});
/** A `request` message for the server, as JSON text. `rid` correlates the reply. */
export const requestMsg = (id, rid, data) => JSON.stringify({v: PROTOCOL, type: 'request', id, rid, data});
/** The answer to a server's request, as JSON text: `data`, or an `error` message when `error` is given. */
export const replyMsg = (rid, data, error) => JSON.stringify(error ? {v: PROTOCOL, type: 'data', reply: rid, error: String(error)} : {v: PROTOCOL, type: 'data', reply: rid, data});
