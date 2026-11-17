import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {enableAutoUnmount, flushPromises, mount} from '@vue/test-utils';
import {use} from '@/i18n';
import {state} from '@/state';
import {DEFAULTS} from '@/config/settings';
import SearchBox from '@/components/SearchBox.vue';
import SettingsModal from '@/components/SettingsModal.vue';
import {clearHistory, history, record} from '@/history';

beforeAll(async () => {
	await use('en-GB');
});
beforeEach(() => {
	clearHistory();
	state.engine = 0;
	Object.assign(state.settings.search, DEFAULTS.search);
	Object.assign(state.settings.ui, DEFAULTS.ui);
});
// Unmount every component after each test. SearchBox starts a 120 ms debounce timer for every typed text; a component that is
// left mounted fires it later, in the middle of another test, where it called that test's stubbed `fetch` (a flaky failure).
enableAutoUnmount(afterEach);
afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
	vi.unstubAllGlobals();
});
 
async function search(text) {
	const w = mount(SearchBox);
	await w.find('input').setValue(text);
	await w.find('input').trigger('keydown.enter');
	return w;
}

describe('SearchBox: open in', () => {
	it('opens a new tab when set to "blank"', async () => {
		state.settings.search.openIn = 'blank';
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		await search('hello world');
		expect(open).toHaveBeenCalledWith('https://duckduckgo.com/?q=hello%20world', '_blank', 'noopener');
	});

	it('does not open a new tab by default', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		// jsdom cannot navigate: the same-tab branch assigns location.href, which only logs "not implemented"
		vi.spyOn(console, 'error').mockImplementation(() => {
		});
		await search('hello');
		expect(open).not.toHaveBeenCalled();
	});

	it('opens typed web addresses directly, or searches for them when that is switched off', async () => {
		state.settings.search.openIn = 'blank';
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		await search('https://example.com/a');
		expect(open).toHaveBeenLastCalledWith('https://example.com/a', '_blank', 'noopener');
		state.settings.search.directUrls = false;
		await search('https://example.com/a');
		expect(open).toHaveBeenLastCalledWith('https://duckduckgo.com/?q=https%3A%2F%2Fexample.com%2Fa', '_blank', 'noopener');
	});
});

describe('SearchBox: suggestions and focus', () => {
	it('limits the number of suggestions', async () => {
		vi.useFakeTimers();
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => ['q', ['a', 'b', 'c', 'd', 'e']]}));
		state.settings.search.suggestionsMax = 3;
		const w = mount(SearchBox);
		await w.find('input').setValue('q');
		await vi.advanceTimersByTimeAsync(200);
		await flushPromises();
		expect(w.findAll('.menu:not(.engines) li').map(li => li.text())).toEqual(['a', 'b', 'c']);
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('does not request suggestions when they are switched off', async () => {
		vi.useFakeTimers();
		const f = vi.fn();
		vi.stubGlobal('fetch', f);
		state.settings.search.suggestions = false;
		const w = mount(SearchBox);
		await w.find('input').setValue('q');
		await vi.advanceTimersByTimeAsync(300);
		expect(f).not.toHaveBeenCalled();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('focuses the field on load only when enabled', () => {
		const on = mount(SearchBox, {attachTo: document.body});
		expect(document.activeElement).toBe(on.find('input').element);
		on.unmount();
		(document.activeElement)?.blur?.();
		state.settings.search.autofocus = false;
		const off = mount(SearchBox, {attachTo: document.body});
		expect(document.activeElement).not.toBe(off.find('input').element);
		off.unmount();
	});
});

describe('SettingsModal', () => {
	const show = async () => {
		const w = mount(SettingsModal);
		await flushPromises();
		return w;
	};
	const row = (w, label) => w.findAll('.srow').find(r => r.find('span').text() === label);

	it('changes a choice with the segmented buttons', async () => {
		const w = await show();
		await row(w, 'Open results in').findAll('button')[1].trigger('click');
		expect(state.settings.search.openIn).toBe('blank');
		await row(w, 'Theme').findAll('button')[2].trigger('click');
		expect(state.settings.ui.theme).toBe('dark');
	});

	it('toggles a switch and greys out the dependent row', async () => {
		const w = await show();
		expect(row(w, 'Number of suggestions').classes()).not.toContain('off');
		await row(w, 'Suggestions').find('.switch').trigger('click');
		expect(state.settings.search.suggestions).toBe(false);
		expect(row(w, 'Number of suggestions').classes()).toContain('off');
	});

	it('picks an accent colour and a search engine, and sets the number of suggestions', async () => {
		const w = await show();
		await w.findAll('.swatch')[1].trigger('click');
		expect(state.settings.ui.accent).toBe('blue');
		await row(w, 'Search engine').find('select').setValue('2');
		expect(state.engine).toBe(2);
		await row(w, 'Number of suggestions').find('select').setValue('5');
		expect(state.settings.search.suggestionsMax).toBe(5);
	});

	it('resets everything to the defaults', async () => {
		const w = await show();
		state.engine = 3;
		state.settings.ui.theme = 'dark';
		state.settings.search.openIn = 'blank';
		await w.find('.reset').trigger('click');
		expect(state.engine).toBe(0);
		expect({...state.settings.ui}).toEqual(DEFAULTS.ui);
		expect({...state.settings.search}).toEqual(DEFAULTS.search);
	});
});

describe('SearchBox: bookmark suggestions', () => {
	beforeEach(() => {
		state.bookmarks.splice(0, state.bookmarks.length,
			{id: 'a', url: 'https://github.com/', host: 'github.com', title: 'GitHub'},
			{id: 'b', url: 'https://news.org/', host: 'news.org', title: 'News'});
	});
	afterEach(() => state.bookmarks.splice(0, state.bookmarks.length));

	it('shows a matching bookmark first, with its icon and a bookmark mark', async () => {
		state.settings.search.suggestions = false;
		const w = mount(SearchBox);
		await w.find('input').setValue('git');
		const rows = w.findAll('.menu:not(.engines) li');
		expect(rows).toHaveLength(1);
		expect(rows[0].classes()).toContain('bm');
		expect(rows[0].find('img').attributes('src')).toBe('https://icons.duckduckgo.com/ip3/github.com.ico');
		expect(rows[0].find('svg.bm-ic').exists()).toBe(true);
		expect(rows[0].text()).toContain('GitHub');
	});

	it('opens the bookmark (not a search) when it is chosen with the keyboard', async () => {
		state.settings.search.suggestions = false;
		state.settings.search.openIn = 'blank';
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const w = mount(SearchBox);
		await w.find('input').setValue('git');
		await w.find('input').trigger('keydown.down');
		expect(w.find('input').element.value).toBe('git'); // the text is not replaced
		await w.find('input').trigger('keydown.enter');
		expect(open).toHaveBeenCalledWith('https://github.com/', '_blank', 'noopener');
	});

	it('opens the bookmark on click, and Enter without a selection still searches', async () => {
		state.settings.search.suggestions = false;
		state.settings.search.openIn = 'blank';
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		const w = mount(SearchBox);
		await w.find('input').setValue('news');
		await w.find('.menu li.bm').trigger('mousedown');
		expect(open).toHaveBeenLastCalledWith('https://news.org/', '_blank', 'noopener');
		await w.find('input').setValue('news');
		await w.find('input').trigger('keydown.enter');
		expect(open).toHaveBeenLastCalledWith('https://duckduckgo.com/?q=news', '_blank', 'noopener');
	});

	it('can be switched off', async () => {
		state.settings.search.suggestions = false;
		state.settings.search.bookmarkSuggestions = false;
		const w = mount(SearchBox);
		await w.find('input').setValue('git');
		expect(w.find('.menu li.bm').exists()).toBe(false);
	});
});

describe('SearchBox: search history', () => {
	beforeEach(() => {
		state.bookmarks.splice(0, state.bookmarks.length, {id: 'a', url: 'https://github.com/', host: 'github.com', title: 'GitHub'});
	});
	afterEach(() => state.bookmarks.splice(0, state.bookmarks.length));

	const rows = w => w.findAll('.menu:not(.engines) li');
	const kind = li => (li.classes().includes('bm') ? 'bookmark' : li.classes().includes('hist') ? 'history' : 'suggestion');

	it('orders the dropdown: bookmarks, then history, then suggestions, without repeating a suggestion that is in the history', async () => {
		vi.useFakeTimers();
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({json: async () => ['github', ['github login', 'GitHub Actions', 'github pages']]}));
		record('github actions');
		record('unrelated');
		const w = mount(SearchBox);
		await w.find('input').setValue('github');
		await vi.advanceTimersByTimeAsync(200);
		await flushPromises();
		expect(rows(w).map(li => [kind(li), li.text().replace(/\s*github\.com$/, '').replace(/×$/, '')])).toEqual([
			['bookmark', 'GitHub'], ['history', 'github actions'], ['suggestion', 'github login'], ['suggestion', 'github pages']
		]);
	});

	it('shows history at once and without the network, even when suggestions are switched off', async () => {
		const f = vi.fn();
		vi.stubGlobal('fetch', f);
		state.settings.search.suggestions = false;
		record('rust book');
		const w = mount(SearchBox);
		await w.find('input').setValue('rus');
		expect(rows(w).map(kind)).toEqual(['history']);
		expect(rows(w)[0].text()).toContain('rust book');
		expect(f).not.toHaveBeenCalled();
	});

	it('remembers a search when it is made', async () => {
		vi.spyOn(window, 'open').mockReturnValue(null);
		state.settings.search.openIn = 'blank';
		await search('best pizza');
		expect(history.map(h => h.q)).toEqual(['best pizza']);
		await search('best pizza');
		expect(history[0].n).toBe(2);
	});

	it('does not remember opened addresses, bookmarks, sensitive text, or anything when switched off', async () => {
		vi.spyOn(window, 'open').mockReturnValue(null);
		state.settings.search.openIn = 'blank';
		await search('https://example.com/private?token=1'); // opened directly
		const w = mount(SearchBox);
		state.settings.search.suggestions = false;
		await w.find('input').setValue('git');
		await w.find('input').trigger('keydown.down');
		await w.find('input').trigger('keydown.enter'); // opens the bookmark
		await search('password: hunter2');
		await search('me@example.com');
		expect(history).toEqual([]);

		state.settings.search.history = false;
		await search('private thing');
		expect(history).toEqual([]);
	});

	it('does not show history when it is switched off', async () => {
		record('rust book');
		state.settings.search.history = false;
		state.settings.search.suggestions = false;
		const w = mount(SearchBox);
		await w.find('input').setValue('rus');
		expect(rows(w)).toHaveLength(0);
	});

	it('searches again when a history row is chosen', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		state.settings.search.openIn = 'blank';
		state.settings.search.suggestions = false;
		record('rust book');
		const w = mount(SearchBox);
		await w.find('input').setValue('rus');
		await w.find('.menu li.hist').trigger('mousedown');
		expect(open).toHaveBeenCalledWith('https://duckduckgo.com/?q=rust%20book', '_blank', 'noopener');
		expect(history[0].n).toBe(2);
	});

	it('removes one entry with its cross, without searching', async () => {
		const open = vi.spyOn(window, 'open').mockReturnValue(null);
		state.settings.search.suggestions = false;
		record('rust book');
		record('rust lang');
		const w = mount(SearchBox);
		await w.find('input').setValue('rus');
		const row = rows(w).find(li => li.text().includes('rust book'));
		await row.find('.hist-x').trigger('mousedown');
		expect(history.map(h => h.q)).toEqual(['rust lang']);
		expect(open).not.toHaveBeenCalled();
		expect(rows(w).map(li => li.text())).toEqual([expect.stringContaining('rust lang')]);
	});

	it('removes the selected entry with Shift+Delete, but not with Delete alone', async () => {
		state.settings.search.suggestions = false;
		record('rust book');
		const w = mount(SearchBox);
		await w.find('input').setValue('rus');
		await w.find('input').trigger('keydown.down');
		await w.find('input').trigger('keydown', {key: 'Delete'});
		expect(history).toHaveLength(1);
		await w.find('input').trigger('keydown', {key: 'Delete', shiftKey: true});
		expect(history).toHaveLength(0);
	});

	it('shows history text as plain text, never as markup', async () => {
		state.settings.search.suggestions = false;
		record('<img src=x onerror=alert(1)> cats');
		const w = mount(SearchBox);
		await w.find('input').setValue('cats');
		expect(w.find('.menu img[src="x"]').exists()).toBe(false);
		expect(rows(w)[0].text()).toContain('<img src=x onerror=alert(1)> cats');
	});
});

describe('SettingsModal: search history', () => {
	const show = async () => {
		const w = mount(SettingsModal);
		await flushPromises();
		return w;
	};
	const row = (w, label) => w.findAll('.srow').find(r => r.find('span').text() === label);

	it('has a switch that is on by default; turning it off deletes the saved history', async () => {
		record('a');
		record('b');
		const w = await show();
		expect(state.settings.search.history).toBe(true);
		await row(w, 'Remember searches for 30 days').find('.switch').trigger('click');
		await flushPromises();
		expect(state.settings.search.history).toBe(false);
		expect(history).toEqual([]);
	});

	it('shows how many searches are saved, and a button that clears them', async () => {
		record('a');
		record('b');
		const w = await show();
		const r = row(w, 'Search history: 2 saved');
		expect(r.find('button').attributes('disabled')).toBeUndefined();
		await r.find('button').trigger('click');
		expect(history).toEqual([]);
		expect(row(w, 'Search history: 0 saved').find('button').attributes('disabled')).toBeDefined();
	});

	it('greys the clear button out while the history is off', async () => {
		state.settings.search.history = false;
		const w = await show();
		expect(row(w, 'Search history: 0 saved').classes()).toContain('off');
	});
});

