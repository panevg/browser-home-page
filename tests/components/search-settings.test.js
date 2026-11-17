import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {enableAutoUnmount, flushPromises, mount} from '@vue/test-utils';
import {use} from '@/i18n';
import {state} from '@/state';
import {DEFAULTS} from '@/config/settings';
import SearchBox from '@/components/SearchBox.vue';
import SettingsModal from '@/components/SettingsModal.vue';

beforeAll(async () => {
	await use('en-GB');
});
beforeEach(() => {
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