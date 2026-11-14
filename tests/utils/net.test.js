import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fetchText, proxied} from '@/utils/net';

const URL_ = 'https://example.com/feed.xml?a=1&b=2';
const enc = encodeURIComponent(URL_);
const ok = text => ({ok: true, status: 200, text: async () => text});
const bad = status => ({ok: false, status, text: async () => ''});

let fetchMock;
beforeEach(() => {
	fetchMock = vi.fn();
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

const calledUrls = () => fetchMock.mock.calls.map(c => c[0]);

describe('fetchText', () => {
	it('uses a direct request first', async () => {
		fetchMock.mockResolvedValueOnce(ok('<rss/>'));
		expect(await fetchText(URL_)).toBe('<rss/>');
		expect(calledUrls()).toEqual([URL_]);
	});

	it('falls back to the same-origin proxy when the direct request fails (CORS)', async () => {
		fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(ok('via proxy'));
		expect(await fetchText(URL_)).toBe('via proxy');
		expect(calledUrls()).toEqual([URL_, '/feed-proxy?url=' + enc]);
	});

	it('moves on after an HTTP error', async () => {
		fetchMock.mockResolvedValueOnce(bad(503)).mockResolvedValueOnce(bad(404)).mockResolvedValueOnce(ok('public proxy'));
		expect(await fetchText(URL_)).toBe('public proxy');
		expect(calledUrls()[2]).toContain('api.allorigins.win');
		expect(calledUrls()[2]).toContain(enc);
	});

	it('moves on when the response is rejected by `accept`', async () => {
		fetchMock.mockResolvedValueOnce(ok('<html>error page</html>')).mockResolvedValueOnce(ok('<rss/>'));
		expect(await fetchText(URL_, {accept: t => t.includes('<rss')})).toBe('<rss/>');
		expect(fetchMock).toHaveBeenCalledTimes(2);
	});

	it('tries every route and throws the last error when all fail', async () => {
		fetchMock.mockResolvedValue(bad(500));
		await expect(fetchText(URL_)).rejects.toThrow('HTTP 500');
		expect(fetchMock).toHaveBeenCalledTimes(5); // direct, local proxy, 3 public proxies
		expect(calledUrls()[3]).toContain('corsproxy.io');
		expect(calledUrls()[4]).toContain('codetabs.com');
	});

	it('reports an unaccepted response as an error', async () => {
		fetchMock.mockResolvedValue(ok('junk'));
		await expect(fetchText(URL_, {accept: () => false})).rejects.toThrow('unexpected response');
	});

	it('passes an abort signal to every request', async () => {
		fetchMock.mockResolvedValueOnce(ok('x'));
		await fetchText(URL_, {timeout: 1234});
		expect(fetchMock.mock.calls[0][1].signal).toBeDefined();
	});
});

describe('proxied', () => {
	it('builds an allorigins URL with the target encoded', () => {
		expect(proxied(URL_)).toBe('https://api.allorigins.win/raw?url=' + enc);
	});
});