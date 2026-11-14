export const uid = () => Math.random().toString(36).slice(2, 9);
export const icon = host => `https://icons.duckduckgo.com/ip3/${host}.ico`;
export const initial = s => [...String(s || '')][0] || '?'; // first character (safe for emoji / surrogate pairs)

// Bookmarks whose title, host or address contains `query` (case-insensitive), best first:
// a title/host that starts with the query ranks above one that merely contains it.
export function matchBookmarks(list, query, limit = 3) {
	const q = String(query || '').trim().toLowerCase();
	if (!q) return [];
	const score = b => {
		const title = b.title.toLowerCase(), host = b.host.toLowerCase().replace(/^www\./, '');
		if (title.startsWith(q) || host.startsWith(q)) return 0;
		if (title.includes(q) || host.includes(q)) return 1;
		return b.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').includes(q) ? 2 : 3;
	};
	return list.map((b, i) => [score(b), i, b]).filter(x => x[0] < 3).sort((a, b) => a[0] - b[0] || a[1] - b[1]).slice(0, limit).map(x => x[2]);
}