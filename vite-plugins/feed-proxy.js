// Generic same-origin fetcher for RSS feeds and page titles: GET /feed-proxy?url=<encoded http(s) url>.
// The request is made by Node, so CORS does not apply. Only answers to this machine's own origin (anti DNS-rebinding)
// and only to http(s) targets; the response is capped at 3 MB.
export function feedProxy() {
	const handler = async (req, res, next) => {
		if (!req.url.startsWith('/feed-proxy')) return next();
		const fail = (code, msg) => {
			res.statusCode = code;
			res.setHeader('Content-Type', 'text/plain; charset=utf-8');
			res.end(msg);
		};
		try {
			const host = (req.headers.host || '').replace(/:\d+$/, '');
			if (!['localhost', '127.0.0.1', '[::1]'].includes(host)) return fail(403, 'forbidden');
			const target = new URL(req.url, 'http://x').searchParams.get('url') || '';
			if (!/^https?:\/\//i.test(target)) return fail(400, 'bad url');
			const r = await fetch(target, {
				redirect: 'follow',
				signal: AbortSignal.timeout(8000),
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; StartPage/2.0)',
					Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.8, */*;q=0.5'
				}
			});
			const buf = Buffer.from(await r.arrayBuffer());
			if (buf.length > 3e6) return fail(502, 'too large');
			res.statusCode = r.status;
			res.setHeader('Content-Type', r.headers.get('content-type') || 'text/plain; charset=utf-8');
			res.end(buf);
		} catch (e) {
			fail(502, 'upstream error: ' + (e.message || e));
		}
	};
	return {
		name: 'feed-proxy',
		// Block bodies on purpose: Vite treats a returned function as a "post" hook and would call it without arguments.
		configureServer(server) {
			server.middlewares.use(handler);
		},
		configurePreviewServer(server) {
			server.middlewares.use(handler);
		}
	};
}