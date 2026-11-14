// @vitest-environment node
import http from 'node:http';
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {feedProxy} from '../../vite-plugins/feed-proxy.js';

const RSS = '<rss><channel><item><title>T</title><link>http://a.b/1</link></item></channel></rss>';
const listen = server => new Promise(r => server.listen(0, '127.0.0.1', () => r(server.address().port)));
const close = server => new Promise(r => server.close(r));

let upstream, upPort, proxy, proxyPort, deadPort;

beforeAll(async () => {
	upstream = http.createServer((req, res) => {
		if (req.url === '/rss') {
			res.setHeader('Content-Type', 'application/rss+xml');
			return res.end(RSS);
		}
		if (req.url === '/missing') {
			res.statusCode = 404;
			return res.end('nope');
		}
		if (req.url === '/huge') return res.end(Buffer.alloc(3_100_000, 'a'));
		if (req.url === '/echo-headers') return res.end(JSON.stringify(req.headers));
		res.end('plain');
	});
	upPort = await listen(upstream);

	// a port that nothing listens on
	const tmp = http.createServer();
	deadPort = await listen(tmp);
	await close(tmp);

	let handler;
	feedProxy().configureServer({
		middlewares: {
			use: fn => {
				handler = fn;
			}
		}
	});
	proxy = http.createServer((req, res) => handler(req, res, () => {
		res.statusCode = 404;
		res.end('next');
	}));
	proxyPort = await listen(proxy);
});

afterAll(async () => {
	await close(upstream);
	await close(proxy);
});

const ask = (target, {host} = {}) => new Promise((resolve, reject) => {
	const path = '/feed-proxy?url=' + encodeURIComponent(target);
	http.get({host: '127.0.0.1', port: proxyPort, path, headers: host ? {Host: host} : {}}, res => {
		const chunks = [];
		res.on('data', c => chunks.push(c));
		res.on('end', () => resolve({
			status: res.statusCode,
			type: res.headers['content-type'],
			body: Buffer.concat(chunks).toString()
		}));
	}).on('error', reject);
});

describe('feedProxy plugin', () => {
	it('registers middleware in dev and preview, and returns nothing from either hook', () => {
		// Vite calls any function returned from these hooks as a "post" hook, so they must return undefined.
		const used = [];
		const server = {
			middlewares: {
				use: fn => {
					used.push(fn);
					return () => {
						throw new Error('must not be called');
					};
				}
			}
		};
		const plugin = feedProxy();
		expect(plugin.name).toBe('feed-proxy');
		expect(plugin.configureServer(server)).toBeUndefined();
		expect(plugin.configurePreviewServer(server)).toBeUndefined();
		expect(used).toHaveLength(2);
	});

	it('returns the upstream body with its content type', async () => {
		const r = await ask(`http://127.0.0.1:${upPort}/rss`);
		expect(r.status).toBe(200);
		expect(r.type).toBe('application/rss+xml');
		expect(r.body).toBe(RSS);
	});

	it('passes the upstream status through', async () => {
		const r = await ask(`http://127.0.0.1:${upPort}/missing`);
		expect(r.status).toBe(404);
		expect(r.body).toBe('nope');
	});

	it('sends a browser-like User-Agent upstream', async () => {
		const r = await ask(`http://127.0.0.1:${upPort}/echo-headers`);
		expect(JSON.parse(r.body)['user-agent']).toMatch(/Mozilla/);
	});

	it('rejects non-http(s) targets and a missing url', async () => {
		expect((await ask('file:///etc/passwd')).status).toBe(400);
		expect((await ask('javascript:alert(1)')).status).toBe(400);
		expect((await ask('')).status).toBe(400);
	});

	it('refuses requests addressed to a foreign host name (DNS rebinding)', async () => {
		expect((await ask(`http://127.0.0.1:${upPort}/rss`, {host: 'evil.example'})).status).toBe(403);
		expect((await ask(`http://127.0.0.1:${upPort}/rss`, {host: 'localhost:2783'})).status).toBe(200);
	});

	it('answers 502 when the upstream is unreachable', async () => {
		const r = await ask(`http://127.0.0.1:${deadPort}/`);
		expect(r.status).toBe(502);
		expect(r.body).toMatch(/upstream error/);
	});

	it('answers 502 when the upstream response is larger than 3 MB', async () => {
		const r = await ask(`http://127.0.0.1:${upPort}/huge`);
		expect(r.status).toBe(502);
		expect(r.body).toBe('too large');
	});

	it('leaves every other URL to the next middleware', async () => {
		const r = await new Promise(resolve => http.get({
			host: '127.0.0.1',
			port: proxyPort,
			path: '/index.html'
		}, res => {
			let b = '';
			res.on('data', c => (b += c));
			res.on('end', () => resolve({status: res.statusCode, body: b}));
		}));
		expect(r).toEqual({status: 404, body: 'next'});
	});
});