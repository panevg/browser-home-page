import {describe, expect, it} from 'vitest';
import {isFeed, parseDoc, parseFeed} from '@/utils/feed';

const RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Site</title>
  <item><title> First </title><link>https://example.com/1</link><pubDate>Mon, 02 Jan 2023 10:00:00 GMT</pubDate></item>
  <item><title>Second</title><link>https://example.com/2</link></item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Site</title>
  <entry><title>Entry</title>
    <link rel="self" href="https://example.com/self"/>
    <link rel="alternate" href="https://example.com/post"/>
    <updated>2023-01-02T10:00:00Z</updated></entry>
</feed>`;

describe('parseFeed', () => {
	it('reads RSS items (title is trimmed, link comes from the element text)', () => {
		const items = parseFeed(RSS);
		expect(items).toHaveLength(2);
		expect(items[0]).toEqual({title: 'First', url: 'https://example.com/1', date: 'Mon, 02 Jan 2023 10:00:00 GMT'});
		expect(items[1].date).toBe('');
	});

	it('reads Atom entries and prefers the alternate link', () => {
		expect(parseFeed(ATOM)).toEqual([{
			title: 'Entry',
			url: 'https://example.com/post',
			date: '2023-01-02T10:00:00Z'
		}]);
	});

	it('tolerates a BOM and surrounding whitespace', () => {
		expect(parseFeed('\uFEFF\n  ' + RSS + '\n')).toHaveLength(2);
	});

	it('drops items without a title or without an http(s) link', () => {
		const xml = `<rss><channel>
      <item><title></title><link>https://example.com/a</link></item>
      <item><title>js</title><link>javascript:alert(1)</link></item>
      <item><title>rel</title><link>/relative</link></item>
      <item><title>ok</title><link>http://example.com/ok</link></item>
    </channel></rss>`;
		expect(parseFeed(xml).map(i => i.title)).toEqual(['ok']);
	});

	it('keeps at most 30 items', () => {
		const items = Array.from({length: 40}, (_, i) => `<item><title>t${i}</title><link>https://e.com/${i}</link></item>`).join('');
		expect(parseFeed(`<rss><channel>${items}</channel></rss>`)).toHaveLength(30);
	});

	it('returns an empty list for a feed without items', () => {
		expect(parseFeed('<rss><channel><title>x</title></channel></rss>')).toEqual([]);
	});

	it('throws for something that is not XML', () => {
		expect(() => parseFeed('<html><body><p>oops</body>')).toThrow('not a valid feed');
		expect(() => parseFeed('plain text')).toThrow();
	});
});

describe('isFeed', () => {
	it('is true for feeds with items or entries', () => {
		expect(isFeed(RSS)).toBe(true);
		expect(isFeed(ATOM)).toBe(true);
	});

	it('is false for empty feeds, broken XML and error pages', () => {
		expect(isFeed('<rss><channel/></rss>')).toBe(false);
		expect(isFeed('<rss><item>')).toBe(false);
		expect(isFeed('Bad gateway')).toBe(false);
		expect(isFeed('')).toBe(false);
	});
});

describe('parseDoc', () => {
	it('returns an XML document', () => {
		expect(parseDoc('<a><b/></a>').documentElement.nodeName).toBe('a');
	});
});