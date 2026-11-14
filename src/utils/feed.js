// RSS / Atom parsing for the news widget (kept separate from the component so it can be tested on its own).

export function parseDoc(text) {
  const doc = new DOMParser().parseFromString(String(text).replace(/^\uFEFF/, '').trim(), 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('not a valid feed');
  return doc;
}

// True only for well-formed XML that contains at least one <item> / <entry>.
export const isFeed = text => { try { return parseDoc(text).querySelector('item, entry') !== null; } catch { return false; } };

// -> [{ title, url, date }] (max 30). Only http(s) links are kept: the data comes from outside.
export function parseFeed(text) {
  const doc = parseDoc(text);
  return [...doc.querySelectorAll('item, entry')].map(n => {
    const q = s => n.querySelector(s);
    const l = q('link[rel="alternate"], link:not([rel])') || q('link'); // Atom entries may carry several <link>
    return {
      title: (q('title')?.textContent || '').trim(),
      url: l?.getAttribute('href') || l?.textContent.trim() || '',
      date: q('pubDate, published, updated')?.textContent || '',
    };
  }).filter(x => x.title && /^https?:\/\//i.test(x.url)).slice(0, 30);
}
