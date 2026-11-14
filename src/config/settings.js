// User settings: defaults, allowed values and validation.
// Stored in `state.settings` as { search: {...}, ui: {...} }. Every value is checked on load, so a damaged
// or old save can never break the page: anything unknown falls back to the default.
//
// To add a setting: add it to DEFAULTS (and to OPTIONS if it is a list of choices), use it where needed,
// then add its labels to src/locales/*.js and a row to src/components/SettingsModal.vue.

export const DEFAULTS = {
	search: {
		openIn: 'self',        // where results open: 'self' (same tab) | 'blank' (new tab)
		suggestions: true,     // DuckDuckGo autocomplete
		suggestionsMax: 8,     // how many suggestions to show
		bookmarkSuggestions: true, // matching bookmarks are offered first in the dropdown
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
	}
};

export const OPTIONS = {
	openIn: ['self', 'blank'],
	suggestionsMax: [3, 5, 8, 10],
	theme: ['auto', 'light', 'dark'],
	searchWidth: ['s', 'm', 'l'],
	searchShape: ['pill', 'round', 'square'],
	tileSize: ['s', 'm', 'l'],
	bookmarksOpenIn: ['self', 'blank']
};

// Accent colours: [normal, hover]. All keep white button text readable.
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

export function normalizeSettings(raw) {
	const out = {};
	for (const group of Object.keys(DEFAULTS)) {
		const src = isObj(raw) && isObj(raw[group]) ? raw[group] : {};
		out[group] = Object.fromEntries(Object.keys(DEFAULTS[group]).map(k => [k, pick(src, k, DEFAULTS[group])]));
	}
	return out;
}