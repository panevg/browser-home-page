/** A short random identifier for new bookmarks, widgets and modules. */
export const uid = () => Math.random().toString(36).slice(2, 9);
/** The favicon address of a host (DuckDuckGo icon service). */
export const icon = host => `https://icons.duckduckgo.com/ip3/${host}.ico`;
/** The first character of a title, shown when an icon fails to load. */
export const initial = s => [...String(s || '')][0] || '?'; // first character (safe for emoji / surrogate pairs)

/**
 * Bookmarks whose title, host or address contains `query` (case-insensitive), best first: a title or host that starts
 * with the query ranks above one that merely contains it, then address matches.
 * @param {import('@/types').Bookmark[]} list
 * @param {string} query
 * @param {number} [limit]
 * @returns {import('@/types').Bookmark[]}
 */
export function matchBookmarks(list, query, limit = 3) {
	const q = String(query || '').trim().toLowerCase();
	if (!q) return [];
	const score = b => {
		const title = b.title.toLowerCase(), host = b.host.toLowerCase().replace(/^www\./, '');
		if (title.startsWith(q) || host.startsWith(q)) return 0;
		if (title.includes(q) || host.includes(q)) return 1;
		return b.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').includes(q) ? 2 : 3;
	};
	return list.map((b, i) => /** @type {[number, number, import('@/types').Bookmark]} */ ([score(b), i, b])).filter(x => x[0] < 3).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, limit).map(x => x[2]);
}