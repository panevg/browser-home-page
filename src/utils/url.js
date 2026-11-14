// Turns user input into { url, host } or returns null. Only http(s) addresses are accepted,
// so `javascript:` / `data:` links can never end up in a bookmark.
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