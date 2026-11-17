// The live state of one module: connection status, the UI tree, server data, input values, and the action runner.
// A runtime exists only while the module is shown (ModuleView acquires it on mount and releases it on unmount).
import {reactive} from 'vue';
import {state} from '@/state';
import {data as i18nData} from '@/i18n';
import {createConnection} from './connection';
import {INPUTS, PROTOCOL} from './protocol';

export const runtimes = reactive({}); // moduleId -> runtime (the modules dialog reads the status from here)
const MAX_DATA_KEYS = 200;

const defaults = () => ({
	getSettings: () => state.settings.modules,
	getClient: () => ({lang: i18nData.lang, theme: document.documentElement.dataset.theme || 'auto'})
});

function inputsOf(node, out = []) {
	if (INPUTS.has(node.type)) out.push(node);
	node.children?.forEach(c => inputsOf(c, out));
	return out;
}

export function createRuntime(mod, {getSettings, getClient, WS} = defaults()) {
	// status: idle | disabled | connecting | waiting | ready | closed | failed
	const rt = reactive({status: 'idle', detail: '', title: '', root: null, data: {}, values: {}, pending: false, error: ''});
	const persist = new Set(), initial = {};
	let conn = null, waiter = null;

	const timeout = () => (getSettings().requestTimeout || 10) * 1000;
	const has = (o, k) => Object.hasOwn(o, k);

	function dropWaiter(err) {
		if (!waiter) return;
		clearTimeout(waiter.t);
		err ? waiter.rej(new Error(err)) : waiter.res();
		waiter = null;
		rt.pending = false;
	}

	function onStatus(s, detail) {
		rt.status = s;
		rt.detail = detail;
		if (s !== 'ready') dropWaiter('closed');
	}

	// A new ui replaces the old one. Values of inputs that still exist are kept; `persist` inputs are saved with the module.
	function onUi(m) {
		rt.title = m.title;
		rt.root = m.root;
		rt.error = '';
		const next = {}, keep = {};
		persist.clear();
		for (const n of inputsOf(m.root)) {
			const ok = x => x !== undefined && typeof x === typeof n.value;
			initial[n.id] = n.value;
			let v = rt.values[n.id];
			if (!ok(v)) v = n.persist && ok(mod.values?.[n.id]) ? mod.values[n.id] : n.value;
			next[n.id] = v;
			if (n.persist) {
				persist.add(n.id);
				keep[n.id] = v;
			}
		}
		rt.values = next;
		mod.values = keep;
		dropWaiter();
	}

	function onData(m) {
		if (has(rt.data, m.id) || Object.keys(rt.data).length < MAX_DATA_KEYS) rt.data[m.id] = m.data;
	}

	// Requests from the server. Built in: `values`, `value` (data: component id), `client`.
	function onRequest(m) {
		const reply = (d, e) => conn?.reply(m.rid, d, e);
		if (m.id === 'values') reply({...rt.values});
		else if (m.id === 'value') typeof m.data === 'string' && has(rt.values, m.data) ? reply(rt.values[m.data]) : reply(null, 'unknown component');
		else if (m.id === 'client') reply({protocol: PROTOCOL, ...getClient()});
		else reply(null, 'unknown request');
	}

	function setValue(id, v) {
		if (!has(rt.values, id)) return;
		rt.values[id] = v;
		if (persist.has(id)) mod.values[id] = v;
	}

	const payload = s => s.value !== undefined ? s.value
		: typeof s.from === 'string' ? rt.values[s.from] ?? null
			: Array.isArray(s.from) ? Object.fromEntries(s.from.filter(id => has(rt.values, id)).map(id => [id, rt.values[id]])) : null;

	function waitUi() {
		rt.pending = true;
		dropWaiter();
		return new Promise((res, rej) => {
			waiter = {res, rej, t: setTimeout(() => dropWaiter('timeout'), timeout())};
		});
	}

	async function run(steps) {
		try {
			for (const s of steps) {
				if (s.do === 'send') {
					if (!conn?.send(s.id, payload(s))) throw new Error('offline');
					for (const id of s.clear) if (has(initial, id)) setValue(id, initial[id]);
				} else if (s.do === 'request') {
					const r = await conn.request(s.id, payload(s));
					if (s.into) onData({id: s.into, data: r});
				} else await waitUi();
			}
			rt.error = '';
		} catch (e) {
			rt.error = e?.message || 'error';
		}
	}

	function connect() {
		conn?.close();
		conn = null;
		if (!getSettings().enabled) {
			rt.status = 'disabled';
			return;
		}
		conn = createConnection({url: mod.url, getOptions: getSettings, WS, handlers: {onStatus, onUi, onData, onRequest}});
		conn.connect();
	}

	return Object.assign(rt, {
		start() {
			mod.autoConnect === false ? (rt.status = 'idle') : connect();
		},
		connect() {
			rt.root = null;
			connect();
		},
		stop() {
			dropWaiter('closed');
			conn?.close();
			conn = null;
		},
		run, setValue
	});
}

export function acquire(mod, deps) {
	release(mod.id);
	const rt = createRuntime(mod, deps);
	runtimes[mod.id] = rt;
	rt.start();
	return runtimes[mod.id];
}

export function release(id) {
	runtimes[id]?.stop();
	delete runtimes[id];
}
