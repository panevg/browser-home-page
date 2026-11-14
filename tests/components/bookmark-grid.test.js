import {beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';
import {loadWidgetPacks, use} from '@/i18n';
import {state} from '@/state';
import BookmarkGrid from '@/components/BookmarkGrid.vue';

beforeAll(async () => {
	await use('en-GB');
	await loadWidgetPacks();
});
beforeEach(() => {
	state.bookmarks.splice(0, state.bookmarks.length,
		{id: 'a', url: 'https://example.com/', host: 'example.com', title: 'Example'},
		{id: 'b', url: 'https://foo.org/', host: 'foo.org', title: 'Foo'});
});
 
describe('BookmarkGrid', () => {
	it('renders a tile with a link, favicon and title for every bookmark', () => {
		const w = mount(BookmarkGrid);
		const tiles = w.findAll('a.tile');
		expect(tiles.map(t => t.attributes('href'))).toEqual(['https://example.com/', 'https://foo.org/']);
		expect(tiles.map(t => t.find('span').text())).toEqual(['Example', 'Foo']);
		expect(tiles[0].find('img').attributes('src')).toBe('https://icons.duckduckgo.com/ip3/example.com.ico');
	});

	it('uses the site scrollbar style', () => {
		expect(mount(BookmarkGrid).find('section').classes()).toEqual(expect.arrayContaining(['grid', 'scroll']));
	});

	it('shows the first letter when an icon cannot be loaded', async () => {
		const w = mount(BookmarkGrid);
		await w.find('img').trigger('error');
		expect(w.find('.ic b').text()).toBe('E');
		expect(w.findAll('img')).toHaveLength(1); // the other tile keeps its icon
	});

	it('removes a bookmark with the × button', async () => {
		const w = mount(BookmarkGrid);
		await w.findAll('.x')[0].trigger('click');
		expect(state.bookmarks.map(b => b.id)).toEqual(['b']);
		expect(w.findAll('a.tile')).toHaveLength(1);
	});

	it('makes tiles draggable', () => {
		const tile = mount(BookmarkGrid).find('a.tile');
		expect(tile.attributes('draggable')).toBe('true');
		expect(tile.attributes('data-dnd')).toBe('bookmarks');
		expect(tile.attributes('data-id')).toBe('a');
	});
});