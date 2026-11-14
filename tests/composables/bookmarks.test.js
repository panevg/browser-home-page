import {beforeEach, describe, expect, it, vi} from 'vitest';
import {flushPromises} from '@vue/test-utils';

vi.mock('@/utils/net', () => ({fetchText: vi.fn(), proxied: vi.fn()}));

import {fetchText} from '@/utils/net';
import {state} from '@/state';
import {addBookmark, removeBookmark} from '@/composables/bookmarks';

const site = {url: 'https://example.com/', host: 'example.com'};

beforeEach(() => {
	state.bookmarks.splice(0);
	fetchText.mockReset();
});

describe('addBookmark', () => {
	it('adds a bookmark with the given title and does not fetch the page', () => {
		addBookmark({...site, title: 'My site'});
		expect(state.bookmarks).toHaveLength(1);
		expect(state.bookmarks[0]).toMatchObject({...site, title: 'My site'});
		expect(state.bookmarks[0].id).toBeTruthy();
		expect(fetchText).not.toHaveBeenCalled();
	});
    
	it('uses the host first, then replaces it with the real page title', async () => {
		fetchText.mockResolvedValue('<html><head><title>  Example Domain  </title></head></html>');
		addBookmark({...site, title: ''});
		expect(state.bookmarks[0].title).toBe('example.com');
		await flushPromises();
		expect(state.bookmarks[0].title).toBe('Example Domain');
	});

	it('only accepts a response that contains a <title>', async () => {
		fetchText.mockResolvedValue('<title>x</title>');
		addBookmark({...site, title: ''});
		const {accept} = fetchText.mock.calls[0][1];
		expect(accept('<html><title>Hi</title>')).toBe(true);
		expect(accept('<TITLE lang="en">Hi</TITLE>')).toBe(true);
		expect(accept('<html>no title here</html>')).toBe(false);
		await flushPromises();
	});

	it('cuts long titles to 60 characters', async () => {
		fetchText.mockResolvedValue(`<title>${'x'.repeat(100)}</title>`);
		addBookmark({...site, title: ''});
		await flushPromises();
		expect(state.bookmarks[0].title).toHaveLength(60);
	});

	it('keeps the host when the page cannot be fetched', async () => {
		fetchText.mockRejectedValue(new Error('offline'));
		addBookmark({...site, title: ''});
		await flushPromises();
		expect(state.bookmarks[0].title).toBe('example.com');
	});

	it('keeps the host when the page has an empty title', async () => {
		fetchText.mockResolvedValue('<title>   </title>');
		addBookmark({...site, title: ''});
		await flushPromises();
		expect(state.bookmarks[0].title).toBe('example.com');
	});

	it('does not fail when the bookmark was removed before the title arrived', async () => {
		fetchText.mockResolvedValue('<title>Late</title>');
		addBookmark({...site, title: ''});
		removeBookmark(state.bookmarks[0].id);
		await flushPromises();
		expect(state.bookmarks).toEqual([]);
	});
});

describe('removeBookmark', () => {
	it('removes the bookmark with the given id', () => {
		addBookmark({...site, title: 'a'});
		addBookmark({url: 'https://b.com/', host: 'b.com', title: 'b'});
		removeBookmark(state.bookmarks[0].id);
		expect(state.bookmarks.map(b => b.title)).toEqual(['b']);
	});

	it('does nothing for an unknown id (it must not delete the last item)', () => {
		addBookmark({...site, title: 'a'});
		addBookmark({url: 'https://b.com/', host: 'b.com', title: 'b'});
		removeBookmark('missing');
		expect(state.bookmarks).toHaveLength(2);
	});
});