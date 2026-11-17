import {beforeEach, describe, expect, it, vi} from 'vitest';

import {DEFAULTS} from '@/config/settings';

const KEY = 'startpage:v1';

// state.js reads localStorage when it is imported, so every test imports a fresh copy.
async function load(stored) {
	localStorage.clear();
	if (stored !== undefined) localStorage.setItem(KEY, typeof stored === 'string' ? stored : JSON.stringify(stored));
	vi.resetModules();
	return (await import('@/state')).state;
}

const saved = () => JSON.parse(localStorage.getItem(KEY));

beforeEach(() => localStorage.clear());

describe('state: loading', () => {
	it('starts with defaults when nothing is stored, and saves them', async () => {
		const state = await load();
		expect({...state}).toEqual({engine: 0, lang: null, settings: DEFAULTS, bookmarks: [], widgets: [], modules: []});
		expect(saved()).toEqual({engine: 0, lang: null, settings: DEFAULTS, bookmarks: [], widgets: [], modules: []});
	});

	it.each(['{broken json', 'null', '[]', '"text"', '42'])('survives corrupted storage: %s', async raw => {
		const state = await load(raw);
		expect(state.bookmarks).toEqual([]);
		expect(state.widgets).toEqual([]);
		expect(state.engine).toBe(0);
	});

	it('keeps valid bookmarks, computes the host and fills in missing fields', async () => {
		const state = await load({
			bookmarks: [
				{id: 'a', url: 'https://example.com/page', title: 'Example'},
				{url: 'http://foo.org'}
			]
		});
		expect(state.bookmarks).toHaveLength(2);
		expect(state.bookmarks[0]).toEqual({
			id: 'a',
			url: 'https://example.com/page',
			host: 'example.com',
			title: 'Example'
		});
		expect(state.bookmarks[1].host).toBe('foo.org');
		expect(state.bookmarks[1].title).toBe('foo.org');
		expect(state.bookmarks[1].id).toBeTruthy();
	});

	it('drops bookmarks with unsafe or broken addresses', async () => {
		const state = await load({
			bookmarks: [
				{id: '1', url: 'javascript:alert(1)', title: 'x'},
				{id: '2', url: 42},
				'not an object',
				null,
				{id: '3', url: 'https://ok.com', title: 'ok'}
			]
		});
		expect(state.bookmarks.map(b => b.id)).toEqual(['3']);
	});

	it('ignores bookmarks / widgets that are not arrays', async () => {
		const state = await load({bookmarks: 'nope', widgets: {a: 1}});
		expect(state.bookmarks).toEqual([]);
		expect(state.widgets).toEqual([]);
	});

	it('keeps known widgets, repairs their fields and drops unknown types', async () => {
		const state = await load({
			widgets: [
				{id: 'w1', type: 'todo', config: {items: []}, hidden: 1},
				{type: 'notes', config: 'broken'},
				{id: 'w3', type: 'does-not-exist', config: {}},
				'garbage'
			]
		});
		expect(state.widgets).toHaveLength(2);
		expect(state.widgets[0]).toEqual({id: 'w1', type: 'todo', config: {items: []}, hidden: true});
		expect(state.widgets[1]).toMatchObject({type: 'notes', config: {}, hidden: false});
		expect(state.widgets[1].id).toBeTruthy();
	});

	it.each([[-1], [1.5], ['2'], [null]])('resets an invalid engine (%j) to 0', async engine => {
		expect((await load({engine})).engine).toBe(0);
	});

	it('keeps a valid engine index', async () => {
		expect((await load({engine: 3})).engine).toBe(3);
	});

	it('migrates the old `language` field', async () => {
		expect((await load({language: 'en'})).lang).toBe('en-GB');
		expect((await load({language: 'uk'})).lang).toBe('uk');
		expect((await load({lang: 'uk', language: 'en'})).lang).toBe('uk');
		expect((await load({lang: 5})).lang).toBeNull();
	});
});

describe('state: settings', () => {
	it('fills in defaults when settings are missing', async () => {
		expect({...(await load({})).settings}).toEqual(DEFAULTS);
	});

	it('keeps valid values and repairs invalid ones', async () => {
		const state = await load({
			settings: {
				search: {openIn: 'blank', suggestionsMax: 99, autofocus: 'yes'},
				ui: {theme: 'dark', accent: 'nope'}
			}
		});
		expect(state.settings.search).toEqual({...DEFAULTS.search, openIn: 'blank'});
		expect(state.settings.ui).toEqual({...DEFAULTS.ui, theme: 'dark'});
	});

	it('saves a changed setting right away', async () => {
		const state = await load();
		state.settings.ui.theme = 'light';
		expect(saved().settings.ui.theme).toBe('light');
	});
});

describe('state: saving', () => {
	it('writes to localStorage synchronously on every change, including nested ones', async () => {
		const state = await load();
		state.bookmarks.push({id: 'b', url: 'https://example.com/', host: 'example.com', title: 'E'});
		expect(saved().bookmarks).toHaveLength(1);
		state.widgets.push({id: 'w', type: 'todo', config: {items: []}, hidden: false});
		state.widgets[0].config.items.push({id: 'i', text: 'task', done: false});
		expect(saved().widgets[0].config.items).toEqual([{id: 'i', text: 'task', done: false}]);
		state.engine = 2;
		expect(saved().engine).toBe(2);
	});

	it('does not throw when localStorage is unavailable', async () => {
		const state = await load();
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('full');
		});
		expect(() => {
			state.engine = 1;
		}).not.toThrow();
	});
});
describe('state: modules', () => {
	it('keeps valid modules and repairs the fields', async () => {
		const state = await load({modules: [{id: 'm1', name: 'Demo', url: 'ws://localhost:8787', size: 'l', hidden: true, autoConnect: false, values: {a: 'x', 'bad key': 1, b: {}}}, {url: 'example.com/mod'}]});
		expect(state.modules[0]).toEqual({id: 'm1', name: 'Demo', url: 'ws://localhost:8787/', hidden: true, autoConnect: false, size: 'l', values: {a: 'x'}});
		expect(state.modules[1]).toMatchObject({url: 'wss://example.com/mod', name: 'example.com', size: 'm', autoConnect: true, hidden: false, values: {}});
	});

	it('drops modules whose address is not ws:// or wss://', async () => {
		const state = await load({modules: [{url: 'http://example.com'}, {url: 'javascript:alert(1)'}, {url: 5}, null, 'x']});
		expect(state.modules).toEqual([]);
	});
});
