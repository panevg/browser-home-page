// RSS / Atom parsing for the news widget (kept separate from the component so it can be tested on its own).

/**
 * Parses text as an XML document.
 * @param {string} text A leading UTF-8 byte-order mark is ignored.
 * @returns {Document}
 * @throws {Error} When the text is not well-formed XML.
 */
export function parseDoc(text) {
	const doc = new DOMParser().parseFromString(String(text).replace(/^\uFEFF/, '').trim(), 'text/xml');
	if (doc.querySelector('parsererror')) throw new Error('not a valid feed');
	return doc;
}

/**
 * Tells a real feed from anything else (for example an error page returned by a proxy).
 * @param {string} text
 * @returns {boolean} `true` only for well-formed XML that contains at least one `<item>` or `<entry>`.
 */
export const isFeed = text => {
	try {
		return parseDoc(text).querySelector('item, entry') !== null;
	} catch {
		return false;
	}
};

/**
 * Reads the items of an RSS or Atom feed. Only `http(s)` links are kept, because the data comes from outside.
 * @param {string} text
 * @returns {{title: string, url: string, date: string}[]} At most 30 items.
 * @throws {Error} When the text is not a valid feed document.
 */
export function parseFeed(text) {
	const doc = parseDoc(text);
	return [...doc.querySelectorAll('item, entry')].map(n => {
		const q = s => n.querySelector(s);
		const l = q('link[rel="alternate"], link:not([rel])') || q('link'); // Atom entries may carry several <link>
		return {
			title: (q('title')?.textContent || '').trim(),
			url: l?.getAttribute('href') || l?.textContent.trim() || '',
			date: q('pubDate, published, updated')?.textContent || ''
		};
	}).filter(x => x.title && /^https?:\/\//i.test(x.url)).slice(0, 30);
}