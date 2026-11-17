import {describe, expect, it} from 'vitest';
import {addEntry, cleanQuery, DAY, HISTORY_DAYS, isSensitive, matchHistory, MAX_ENTRIES, MAX_LENGTH, normalizeHistory, removeEntry} from '@/utils/history';

const NOW = 1_700_000_000_000;
const e = (q, daysAgo = 0, n = 1) => ({q, t: NOW - daysAgo * DAY, n});

describe('cleanQuery', () => {
	it('trims, collapses spaces and removes control and hidden characters', () => {
		expect(cleanQuery('  hello \t\n  world ')).toBe('hello world');
		expect(cleanQuery('a\u0000b\u200bc')).toBe('a b c');
		expect(cleanQuery('safe\u202Etxt.exe')).toBe('safe txt.exe'); // a right-to-left override cannot disguise text
		expect(cleanQuery(null)).toBe('');
		expect(cleanQuery(42)).toBe('42');
	});
});

describe('isSensitive: things that are never stored', () => {
	it.each([
		['https://example.com/reset?token=abc'],
		['ftp://user:pass@host/file'],
		['me@example.com'],
		['password: hunter2'],
		['my password=hunter2'],
		['api_key = sk_live_abc'],
		['token: abc'],
		['Bearer abcdef123456'],
		['-----BEGIN PRIVATE KEY-----'],
		['eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'],
		['4111 1111 1111 1111'], // card numbers
		['4111-1111-1111-1111'],
		['5500005555555559'],
		['DE89 3704 0044 0532 0130 00'],
		['+421 900 123 456'],
		['900123456789'],
		['sk9fj2K8dh3Ls0Pq1Zx7Vb4Nm6Cc'],
		['a'.repeat(MAX_LENGTH + 1)]
	])('%s', q => expect(isSensitive(q)).toBe(true));

	it.each([
		['cats'],
		['how to bake bread'],
		['password manager'],
		['best password managers 2025'],
		['iphone 15 pro max'],
		['iphone 15 pro 256gb 2024'], // many digits, but mostly words
		['windows-11-pro-iso-download-link-official'], // a readable slug
		['rfc 2616'],
		['тест українською'],
		['what is a token ring network']
	])('but a normal search is kept: %s', q => expect(isSensitive(q)).toBe(false));
});

describe('normalizeHistory', () => {
	it('returns an empty list for anything that is not a list', () => {
		for (const raw of [null, undefined, 5, 'x', {}, {q: 'a'}]) expect(normalizeHistory(raw, NOW)).toEqual([]);
	});

	it('keeps valid entries, newest first', () => {
		expect(normalizeHistory([e('old', 5), e('new', 1)], NOW).map(x => x.q)).toEqual(['new', 'old']);
	});

	it('deletes entries older than 30 days', () => {
		const list = normalizeHistory([e('keep', HISTORY_DAYS - 1), e('gone', HISTORY_DAYS + 1)], NOW);
		expect(list.map(x => x.q)).toEqual(['keep']);
	});

	it('drops damaged entries and entries from the future', () => {
		const raw = [null, 5, 'x', {q: 'no time'}, {q: '', t: NOW}, {q: 'bad time', t: 'yesterday'}, {q: 'nan', t: NaN}, {t: NOW}, {q: 'future', t: NOW + 5 * DAY}, e('fine')];
		expect(normalizeHistory(raw, NOW).map(x => x.q)).toEqual(['fine']);
	});

	it('removes sensitive entries that an older version may have stored', () => {
		expect(normalizeHistory([e('cats'), e('password: x'), e('a@b.co')], NOW).map(x => x.q)).toEqual(['cats']);
	});

	it('merges duplicates (case-insensitive) and sums their counts', () => {
		const list = normalizeHistory([e('Cats', 2, 2), e('cats', 1, 3)], NOW);
		expect(list).toEqual([{q: 'cats', t: NOW - DAY, n: 5}]);
	});

	it('repairs counts and clamps timestamps, and limits the size', () => {
		expect(normalizeHistory([{q: 'a', t: NOW, n: -4}, {q: 'b', t: NOW - 1, n: 'many'}, {q: 'c', t: NOW - 2, n: 99999}], NOW).map(x => x.n)).toEqual([1, 1, 999]);
		const many = Array.from({length: MAX_ENTRIES + 50}, (_, i) => ({q: 'query ' + i, t: NOW - i, n: 1}));
		const list = normalizeHistory(many, NOW);
		expect(list).toHaveLength(MAX_ENTRIES);
		expect(list[0].q).toBe('query 0');
	});

	it('cleans the text of stored entries', () => {
		expect(normalizeHistory([{q: '  two   words\u0000 ', t: NOW, n: 1}], NOW)[0].q).toBe('two words');
	});
});

describe('addEntry', () => {
	it('adds a new search to the front', () => {
		expect(addEntry([e('old', 1)], 'new', NOW).map(x => x.q)).toEqual(['new', 'old']);
		expect(addEntry([], '  spaced  out ', NOW)).toEqual([{q: 'spaced out', t: NOW, n: 1}]);
	});

	it('moves a repeated search to the front and counts it', () => {
		const list = addEntry([e('a', 1), e('b', 2, 3)], 'B', NOW);
		expect(list).toEqual([{q: 'B', t: NOW, n: 4}, e('a', 1)]);
	});

	it('does not store empty or sensitive text, and returns the same list', () => {
		const list = [e('a')];
		for (const text of ['', '   ', 'password: x', 'https://x.org/?k=1', 'me@example.com']) expect(addEntry(list, text, NOW)).toBe(list);
	});

	it('forgets expired entries and keeps the list within its limit', () => {
		expect(addEntry([e('stale', HISTORY_DAYS + 2)], 'fresh', NOW).map(x => x.q)).toEqual(['fresh']);
		const full = Array.from({length: MAX_ENTRIES}, (_, i) => ({q: 'q' + i, t: NOW - i - 1, n: 1}));
		const list = addEntry(full, 'newest', NOW);
		expect(list).toHaveLength(MAX_ENTRIES);
		expect(list[0].q).toBe('newest');
		expect(list.at(-1).q).toBe('q' + (MAX_ENTRIES - 2));
	});

	it('does not change the list it was given', () => {
		const list = [e('a')], copy = JSON.stringify(list);
		addEntry(list, 'b', NOW);
		expect(JSON.stringify(list)).toBe(copy);
	});
});

describe('removeEntry', () => {
	it('removes one entry, whatever its letter case', () => {
		expect(removeEntry([e('Cats'), e('dogs')], '  cats ').map(x => x.q)).toEqual(['dogs']);
		expect(removeEntry([e('cats')], 'bird')).toHaveLength(1);
	});
});

describe('matchHistory', () => {
	const list = [e('learn javascript', 1), e('java tutorial', 2), e('best java ide', 3), e('python', 1), e('kava recipe', 1)];

	it('finds entries that start with, have a word starting with, or contain the typed text, in that order', () => {
		expect(matchHistory(list, 'java', 10, NOW).map(x => x.q)).toEqual(['java tutorial', 'learn javascript', 'best java ide']); // prefix, then word starts
		expect(matchHistory(list, 'ava', 10, NOW).map(x => x.q)).toEqual(['learn javascript', 'kava recipe', 'java tutorial', 'best java ide']); // all contain it: recent first
	});

	it('is case-insensitive and ignores surrounding spaces', () => {
		expect(matchHistory(list, '  PYTH ', 5, NOW).map(x => x.q)).toEqual(['python']);
	});

	it('does not offer the text that was typed exactly, and nothing for an empty input', () => {
		expect(matchHistory(list, 'python', 5, NOW)).toEqual([]);
		expect(matchHistory(list, '', 5, NOW)).toEqual([]);
		expect(matchHistory(list, '   ', 5, NOW)).toEqual([]);
	});

	it('puts searches used often and recently first within a group', () => {
		expect(matchHistory([e('cat a', 20), e('cat b', 1)], 'cat', 5, NOW).map(x => x.q)).toEqual(['cat b', 'cat a']); // same count: recent first
		expect(matchHistory([e('cat b', 1), e('cat c', 20, 9)], 'cat', 5, NOW).map(x => x.q)).toEqual(['cat c', 'cat b']); // used a lot beats recent
	});

	it('respects the limit and never offers expired entries', () => {
		expect(matchHistory(list, 'j', 2, NOW)).toHaveLength(2);
		expect(matchHistory([e('old query', HISTORY_DAYS + 1)], 'old', 5, NOW)).toEqual([]);
	});

	it('does not change the order of the list', () => {
		const copy = JSON.stringify(list);
		matchHistory(list, 'java', 5, NOW);
		expect(JSON.stringify(list)).toBe(copy);
	});
});
