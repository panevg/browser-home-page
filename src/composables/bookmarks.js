import {state} from '@/state';
import {uid} from '@/utils/misc';
import {fetchText} from '@/utils/net';

// Page title through the CORS proxy; an empty string on any failure (the hostname is used instead).
async function fetchTitle(url) {
	try {
		const html = await fetchText(url, {timeout: 4000, accept: t => /<title[\s>]/i.test(t)});
		return new DOMParser().parseFromString(html, 'text/html').title.trim().slice(0, 60);
	} catch {
		return '';
	}
}

/**
 * Adds a bookmark to the state (and so to localStorage). Without a `title` the hostname is shown at once and is then
 * replaced by the real page title when it has been fetched; if that fails, the hostname stays.
 * @param {{url: string, host: string, title?: string}} bookmark A checked `http(s)` address (see `parseHttpUrl`) and its host.
 * @returns {void}
 * @example
 * addBookmark({url: 'https://example.com/', host: 'example.com', title: ''});
 */
export function addBookmark({url, host, title}) {
	const b = {id: uid(), url, host, title: title || host};
	state.bookmarks.push(b);
	if (!title) {
		fetchTitle(url).then(t => {
			const x = state.bookmarks.find(y => y.id === b.id);
			if (x && t) x.title = t;
		});
	}
}

/**
 * Removes the bookmark with this id. An unknown id does nothing.
 * @param {string} id
 * @returns {void}
 */
export function removeBookmark(id) {
	const i = state.bookmarks.findIndex(b => b.id === id);
	if (i >= 0) state.bookmarks.splice(i, 1); // never splice(-1): that would delete the last item
}