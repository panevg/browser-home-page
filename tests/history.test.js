import {beforeEach, describe, expect, it, vi} from 'vitest';
import {nextTick} from 'vue';
import {DAY} from '@/utils/history';

const KEY = 'startpage:history:v1', STATE_KEY = 'startpage:v1';

// history.js reads localStorage when it is imported, so every test imports a fresh copy.
async function load({stored, settings} = {}) {
	localStorage.clear();
	if (stored !== undefined) localStorage.setItem(KEY, typeof stored === 'string' ? stored : JSON.stringify(stored));
	if (settings) localStorage.setItem(STATE_KEY, JSON.stringify({settings: {search: settings}}));
	vi.resetModules();
	const mod = await import('@/history');
	const {state} = await import('@/state');
	return {...mod, state};
}
const saved = () => JSON.parse(localStorage.getItem(KEY));
const e = (q, daysAgo = 0, n = 1) => ({q, t: Date.now() - daysAgo * DAY, n});

beforeEach(() => localStorage.clear());

describe('history: loading', () => {
	it('starts empty and stores nothing when there is no saved history', async () => {
		const {history} = await load();
		expect(history).toEqual([]);
		expect(localStorage.getItem(KEY)).toBeNull();
	});

	it('loads saved searches, drops expired and sensitive ones, and saves the cleaned list right away', async () => {
		const {history} = await load({stored: [e('cats', 1), e('too old', 40), e('password: x'), e('a@b.co')]});
		expect(history.map(x => x.q)).toEqual(['cats']);
		expect(saved().map(x => x.q)).toEqual(['cats']);
	});

	it.each(['not json', '{"a":1}', '42', 'null'])('survives a damaged save: %s', async raw => {
		const {history} = await load({stored: raw});
		expect(history).toEqual([]);
	});

	it('deletes everything on load when the history is switched off', async () => {
		const {history} = await load({stored: [e('cats')], settings: {history: false}});
		expect(history).toEqual([]);
		expect(localStorage.getItem(KEY)).toBeNull();
	});
});

describe('history: recording', () => {
	it('remembers a search and saves it under its own key', async () => {
		const {history, record} = await load();
		record('  hello   world ');
		expect(history.map(x => x.q)).toEqual(['hello world']);
		expect(saved()).toEqual([expect.objectContaining({q: 'hello world', n: 1})]);
	});

	it('counts a repeated search and puts it first', async () => {
		const {history, record} = await load();
		record('a');
		record('b');
		record('A');
		expect(history.map(x => [x.q, x.n])).toEqual([['A', 2], ['b', 1]]);
	});

	it('never stores sensitive text', async () => {
		const {history, record} = await load();
		for (const text of ['password: hunter2', 'https://x.org/?token=1', 'me@example.com', '4111 1111 1111 1111', '']) record(text);
		expect(history).toEqual([]);
		expect(localStorage.getItem(KEY)).toBeNull();
	});

	it('does not record while the history is switched off', async () => {
		const {history, record, state} = await load();
		state.settings.search.history = false;
		record('cats');
		expect(history).toEqual([]);
		expect(localStorage.getItem(KEY)).toBeNull();
	});

	it('is not part of the page state, so a backup of the state never contains it', async () => {
		const {record} = await load();
		record('my secret hobby');
		expect(localStorage.getItem(STATE_KEY)).not.toContain('secret hobby');
		expect(localStorage.getItem(KEY)).toContain('secret hobby');
	});
});

describe('history: forgetting', () => {
	it('forget() removes one search', async () => {
		const {history, record, forget} = await load();
		record('a');
		record('b');
		forget('A');
		expect(history.map(x => x.q)).toEqual(['b']);
		expect(saved().map(x => x.q)).toEqual(['b']);
	});

	it('clearHistory() removes everything, including the saved copy', async () => {
		const {history, record, clearHistory} = await load();
		record('a');
		clearHistory();
		expect(history).toEqual([]);
		expect(localStorage.getItem(KEY)).toBeNull();
	});

	it('switching the history off deletes it', async () => {
		const {history, record, state} = await load();
		record('a');
		state.settings.search.history = false;
		await nextTick();
		expect(history).toEqual([]);
		expect(localStorage.getItem(KEY)).toBeNull();
	});
});

describe('history: other tabs', () => {
	it('follows changes made in another tab, and cleans what it reads', async () => {
		const {history} = await load();
		localStorage.setItem(KEY, JSON.stringify([e('from other tab'), e('password: x')]));
		dispatchEvent(new StorageEvent('storage', {key: KEY}));
		expect(history.map(x => x.q)).toEqual(['from other tab']);
	});

	it('is emptied when another tab clears it (or all storage)', async () => {
		const {history, record} = await load();
		record('a');
		localStorage.clear();
		dispatchEvent(new StorageEvent('storage', {key: null}));
		expect(history).toEqual([]);
	});

	it('ignores changes of other keys', async () => {
		const {history, record} = await load();
		record('a');
		dispatchEvent(new StorageEvent('storage', {key: 'something-else'}));
		expect(history).toHaveLength(1);
	});
});
