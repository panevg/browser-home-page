/**
 * Turns user input into a normalised address. Only `http(s)` addresses are accepted, so `javascript:` and `data:` links
 * can never end up in a bookmark. Input without a scheme gets `https://`.
 * @param {string} input
 * @returns {{url: string, host: string}|null} `null` when the input is not a usable address.
 * @example parseHttpUrl('example.com/a') // {url: 'https://example.com/a', host: 'example.com'}
 */
export function parseHttpUrl(input) {
	let u = String(input || '').trim();
	if (!u) return null;
	if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = 'https://' + u;
	try {
		const x = new URL(u);
		if (!/^https?:$/.test(x.protocol) || !x.hostname) return null;
		return {url: x.href, host: x.hostname};
	} catch {
		return null;
	}
}