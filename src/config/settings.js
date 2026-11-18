/**
 * User settings: defaults, allowed values and validation.
 *
 * Stored in `state.settings` as `{ search, ui, modules }` (see the `Settings` type in src/types.js). Every value is
 * checked on load, so a damaged or old save can never break the page: anything unknown falls back to its default.
 *
 * To add a setting:
 *  1. add it to `DEFAULTS` (and to `OPTIONS` if it is a list of choices);
 *  2. use it where it is needed (`state.settings.<group>.<key>`);
 *  3. add its labels to `src/locales/*.js` (`set.<key>`, and `opt.<key>.<value>` for choices);
 *  4. add a row to the list in `src/components/SettingsModal.vue`.
 * Guide: docs/customization.md
 */

/** The default value of every setting, by group. The type of a default decides how a value is validated. @type {import('@/types').Settings} */
export const DEFAULTS = {
	search: {
		openIn: 'self',        // where results open: 'self' (same tab) | 'blank' (new tab)
		suggestions: true,     // DuckDuckGo autocomplete
		suggestionsMax: 8,     // how many suggestions to show
		bookmarkSuggestions: true, // matching bookmarks are offered first in the dropdown
		history: true,         // remember searches for 30 days and offer them after bookmarks (turning it off deletes it)
		autofocus: true,       // focus the search field when the page opens
		directUrls: true      // typing a full http(s) address opens it instead of searching
	},
	ui: {
		theme: 'auto',         // 'auto' (system) | 'light' | 'dark'
		accent: 'terracotta',  // key of ACCENTS
		showTitle: true,       // the heading above the search field
		searchWidth: 'm',      // 's' | 'm' | 'l'
		searchShape: 'pill',   // 'pill' | 'round' | 'square'
		tileSize: 'm',         // bookmark size: 's' | 'm' | 'l'
		tileLabels: true,      // bookmark titles under the icons
		bookmarksOpenIn: 'self'
	},
	modules: {
		enabled: true,         // connect to module servers at all
		reconnect: true,       // reconnect automatically after the connection drops
		reconnectDelay: 5,     // seconds before the first retry (doubles on every failure, up to 16x)
		requestTimeout: 10     // seconds to wait for the first ui, for replies to requests and for `wait: ui`
	}
};

/** The allowed values of the settings that are a list of choices (the first one is shown first in the dialog). */
export const OPTIONS = {
	openIn: ['self', 'blank'],
	suggestionsMax: [3, 5, 8, 10],
	theme: ['auto', 'light', 'dark'],
	searchWidth: ['s', 'm', 'l'],
	searchShape: ['pill', 'round', 'square'],
	tileSize: ['s', 'm', 'l'],
	bookmarksOpenIn: ['self', 'blank'],
	reconnectDelay: [2, 5, 10, 30],
	requestTimeout: [5, 10, 30]
};

/** Accent colours as `[normal, hover]`. All of them keep white button text readable. @type {Record<string, [string, string]>} */
export const ACCENTS = {
	terracotta: ['#d97757', '#c6613f'],
	blue: ['#4f7fd9', '#3d68b8'],
	green: ['#4a9a66', '#3a8052'],
	purple: ['#8b6fd6', '#7656c0'],
	pink: ['#d6648f', '#bf4e79'],
	graphite: ['#6b6a64', '#55544f']
};

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function pick(raw, key, defaults) {
	const v = raw?.[key], d = defaults[key];
	if (typeof d === 'boolean') return typeof v === 'boolean' ? v : d;
	if (key === 'accent') return Object.hasOwn(ACCENTS, v) ? v : d;
	return OPTIONS[key]?.includes(v) ? v : d;
}

/**
 * Makes any stored value a complete, valid `Settings` object: unknown or wrong values become the defaults.
 * @param {unknown} raw
 * @returns {import('@/types').Settings}
 */
export function normalizeSettings(raw) {
	const out = /** @type {import('@/types').Settings} */ ({});
	for (const group of Object.keys(DEFAULTS)) {
		const src = isObj(raw) && isObj(raw[group]) ? raw[group] : {};
		out[group] = Object.fromEntries(Object.keys(DEFAULTS[group]).map(k => [k, pick(src, k, DEFAULTS[group])]));
	}
	return out;
}