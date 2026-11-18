// Network helpers for pages and feeds that browsers cannot fetch directly (no CORS headers).

const PUBLIC = [
	url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
	url => 'https://corsproxy.io/?url=' + encodeURIComponent(url),
	url => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url)
];

/**
 * A public CORS proxy address for `url`. Prefer `fetchText()`, which tries several routes; use this only when a single URL
 * is needed.
 * @type {(url: string) => string}
 */
export const proxied = PUBLIC[0];

/**
 * Fetches a text resource that may not allow cross-origin requests. Routes, in order: a direct request, the same-origin
 * `/feed-proxy` (Vite dev and preview servers, see vite.config.js), then several public CORS proxies. A response is
 * accepted only when `accept(text)` returns true, because a proxy may answer 200 with an error page.
 * @param {string} url
 * @param {{timeout?: number, accept?: (text: string) => boolean}} [options]  `timeout` per attempt in ms (default 8000).
 * @returns {Promise<string>} The response text; rejects with the last error when every route failed.
 */
export async function fetchText(url, {timeout = 8000, accept = () => true} = {}) {
	const routes = [url, '/feed-proxy?url=' + encodeURIComponent(url), ...PUBLIC.map(p => p(url))];
	let last;
	for (const u of routes) {
		try {
			const r = await fetch(u, {signal: AbortSignal.timeout(timeout)});
			if (!r.ok) throw new Error('HTTP ' + r.status);
			const text = await r.text();
			if (accept(text)) return text;
			throw new Error('unexpected response');
		} catch (e) {
			last = e;
		}
	}
	throw last || new Error('fetch failed');
}