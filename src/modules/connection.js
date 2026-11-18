// One WebSocket connection to a module server. It enforces the protocol (the first message must be `ui`),
// matches replies to requests, applies timeouts and reconnects. `WS` can be replaced in tests.
import {LIMITS, parseMessage, dataMsg, requestMsg, replyMsg} from './protocol';

/**
 * Creates the connection to one module server. Nothing happens until `connect()` is called.
 *
 * Statuses reported to `handlers.onStatus(status, detail)`:
 *  - `connecting`, then `waiting` (socket open, no interface yet), then `ready` (the first `ui` arrived);
 *  - `closed`: the connection ended; it is retried when `getOptions().reconnect` is on;
 *  - `failed`: a protocol violation or a bad address, never retried. `detail` is `noUi`, `firstNotUi`, `protocol`, `ui` or `badUrl`.
 *
 * @param {object} config
 * @param {string} config.url                    A `ws://` or `wss://` address.
 * @param {() => {reconnect?: boolean, reconnectDelay?: number, requestTimeout?: number}} [config.getOptions]
 *        Read whenever a setting is needed, so changes apply at once. Delays are in seconds.
 * @param {{onStatus?: Function, onUi?: Function, onData?: Function, onRequest?: Function}} config.handlers
 *        `onUi(msg)`, `onData(msg)` and `onRequest(msg)` receive validated messages.
 * @param {typeof WebSocket} [config.WS]         The WebSocket class (replaced in tests).
 * @returns {{connect: () => void, close: () => void, ready: boolean,
 *            send: (id: string, data?: *) => boolean,
 *            request: (id: string, data?: *) => Promise<*>,
 *            reply: (rid: string, data?: *, error?: string) => void}}
 */
export function createConnection({url, getOptions, handlers, WS = globalThis.WebSocket}) {
	let ws = null, timer = null, firstTimer = null, tries = 0, seq = 0;
	let gotUi = false, stopped = true, fatal = false;
	const pending = new Map();
	const opts = () => ({reconnect: true, reconnectDelay: 5, requestTimeout: 10, ...getOptions?.()});
	const status = (s, detail = '') => handlers.onStatus?.(s, detail);
	const ready = () => !!ws && gotUi && ws.readyState === 1;

	function rejectAll(why) {
		for (const p of pending.values()) {
			clearTimeout(p.timer);
			p.reject(new Error(why));
		}
		pending.clear();
	}

	function fail(sock, detail, code = 4000) {
		fatal = true;
		status('failed', detail);
		try {
			sock.close(code, detail);
		} catch { /* already closed */
		}
	}

	function settle(m) {
		const p = pending.get(m.reply);
		if (!p) return;
		pending.delete(m.reply);
		clearTimeout(p.timer);
		m.error ? p.reject(new Error(m.error)) : p.resolve(m.data);
	}

	function connect() {
		stopped = false;
		fatal = false;
		gotUi = false;
		clearTimeout(timer);
		clearTimeout(firstTimer);
		status('connecting');
		let sock;
		try {
			sock = ws = new WS(url);
		} catch {
			fatal = true;
			status('failed', 'badUrl');
			return;
		}
		firstTimer = setTimeout(() => !gotUi && fail(sock, 'noUi', 4001), opts().requestTimeout * 1000);
		sock.onopen = () => sock === ws && status('waiting');
		sock.onmessage = ev => {
			if (sock !== ws) return;
			const r = parseMessage(ev.data);
			if (r.error) return fail(sock, r.error === 'ui' ? 'ui' : 'protocol');
			const m = r.msg;
			if (!gotUi) {
				if (m.type !== 'ui') return fail(sock, 'firstNotUi'); // the first message must be the interface
				gotUi = true;
				tries = 0;
				clearTimeout(firstTimer);
				status('ready');
			}
			if (m.type === 'ui') handlers.onUi?.(m);
			else if (m.type === 'request') handlers.onRequest?.(m);
			else if (m.reply != null) settle(m);
			else handlers.onData?.(m);
		};
		sock.onclose = () => {
			if (sock !== ws) return;
			clearTimeout(firstTimer);
			ws = null;
			rejectAll('closed');
			if (fatal) return; // status is already `failed`
			status('closed');
			const o = opts();
			if (!stopped && o.reconnect) timer = setTimeout(connect, o.reconnectDelay * 1000 * 2 ** Math.min(tries++, 4));
		};
	}

	const put = s => {
		if (s.length > LIMITS.message) throw new Error('size');
		ws.send(s);
	};

	return {
		connect,
		get ready() {
			return ready();
		},
		close() {
			stopped = true;
			clearTimeout(timer);
			clearTimeout(firstTimer);
			rejectAll('closed');
			const s = ws;
			ws = null;
			try {
				s?.close(1000);
			} catch { /* already closed */
			}
			status('closed');
		},
		send(id, data) {
			if (!ready()) return false;
			put(dataMsg(id, data));
			return true;
		},
		request(id, data) {
			return new Promise((resolve, reject) => {
				if (!ready()) return reject(new Error('offline'));
				const rid = 'c' + ++seq;
				const t = setTimeout(() => {
					pending.delete(rid);
					reject(new Error('timeout'));
				}, opts().requestTimeout * 1000);
				pending.set(rid, {resolve, reject, timer: t});
				try {
					put(requestMsg(id, rid, data));
				} catch (e) {
					clearTimeout(t);
					pending.delete(rid);
					reject(e);
				}
			});
		},
		reply(rid, data, error) {
			if (ready()) put(replyMsg(rid, data, error));
		}
	};
}
