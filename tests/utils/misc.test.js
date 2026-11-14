import {describe, expect, it} from 'vitest';
import {icon, initial, matchBookmarks, uid} from '@/utils/misc';

describe('uid', () => {
	it('returns short alphanumeric ids that do not repeat', () => {
		const ids = Array.from({length: 50}, uid);
		ids.forEach(id => expect(id).toMatch(/^[a-z0-9]{1,7}$/));
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('icon', () => {
	it('builds the DuckDuckGo favicon address', () => {
		expect(icon('example.com')).toBe('https://icons.duckduckgo.com/ip3/example.com.ico');
	});
});

describe('initial', () => {
	it('returns the first character', () => {
		expect(initial('hello')).toBe('h');
		expect(initial('Київ')).toBe('К');
	});

	it('does not split surrogate pairs', () => {
		expect(initial('😀 smile')).toBe('😀');
	});

	it('falls back to "?" for empty values', () => {
		expect(initial('')).toBe('?');
		expect(initial(null)).toBe('?');
		expect(initial(undefined)).toBe('?');
	});
});

describe('matchBookmarks', () => {
	const list = [
		{id: '1', url: 'https://www.github.com/', host: 'www.github.com', title: 'Code hosting'},
		{id: '2', url: 'https://example.com/docs/guide', host: 'example.com', title: 'My GitHub notes'},
		{id: '3', url: 'https://news.org/', host: 'news.org', title: 'News'},
		{id: '4', url: 'https://example.org/x', host: 'example.org', title: 'Other'}
	];

	it('returns nothing for an empty query', () => {
		expect(matchBookmarks(list, '')).toEqual([]);
		expect(matchBookmarks(list, '   ')).toEqual([]);
	});

	it('matches title, host and address, case-insensitively, best first', () => {
		expect(matchBookmarks(list, 'GITHUB').map(b => b.id)).toEqual(['1', '2']); // host starts with it > title contains it
		expect(matchBookmarks(list, 'news').map(b => b.id)).toEqual(['3']);
		expect(matchBookmarks(list, 'docs/guide').map(b => b.id)).toEqual(['2']); // only the address contains it
		expect(matchBookmarks(list, 'zzz')).toEqual([]);
	});

	it('respects the limit and keeps the saved order between equal matches', () => {
		expect(matchBookmarks(list, 'example', 1).map(b => b.id)).toEqual(['2']);
		expect(matchBookmarks(list, 'example').map(b => b.id)).toEqual(['2', '4']);
	});
});