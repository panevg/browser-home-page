// Network helpers for pages and feeds that browsers cannot fetch directly (no CORS headers).
// Order of attempts: direct request -> same-origin proxy `/feed-proxy` (Vite dev/preview, see vite.config.js)
// -> public CORS proxies. A response is accepted only if `accept(text)` returns true (a proxy may answer 200 with junk).

const PUBLIC = [
  url => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url),
  url => 'https://corsproxy.io/?url=' + encodeURIComponent(url),
  url => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url),
];

// Kept for callers that need a single proxied URL.
export const proxied = PUBLIC[0];

export async function fetchText(url, { timeout = 8000, accept = () => true } = {}) {
  const routes = [url, '/feed-proxy?url=' + encodeURIComponent(url), ...PUBLIC.map(p => p(url))];
  let last;
  for (const u of routes) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(timeout) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const text = await r.text();
      if (accept(text)) return text;
      throw new Error('unexpected response');
    } catch (e) { last = e; }
  }
  throw last || new Error('fetch failed');
}
