/**
 * The whole user state: one reactive object that is written to `localStorage` synchronously on every change and
 * validated when it is read, so damaged or old data can never break the page. The shape is `AppState` (src/types.js).
 * Widgets keep their own data inside their `config`, so it is saved the same way.
 *
 * Not in here: the search history (it has its own key, see src/history.js) and the short-lived network caches
 * (`startpage:cache:*`, see src/utils/cache.js).
 */
import {reactive, watch} from 'vue';
import {widgetMeta} from '@/widgets/registry';
import {parseHttpUrl} from '@/utils/url';
import {isId, parseWsUrl} from '@/modules/protocol';
import {uid} from '@/utils/misc';
import {normalizeSettings} from '@/config/settings';

/** The `localStorage` key of the state. The origin (host and port) must stay the same, or the page starts empty. */
export const STORAGE_KEY = 'startpage:v1';

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

function read() {
	try {
		return JSON.parse(localStorage.getItem(STORAGE_KEY));
	} catch {
		return null;
	}
}

function write(s) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
	} catch {
	}
}

// Saved input values of a module (only inputs marked `persist`): small primitives under valid ids.
function cleanValues(v) {
	if (!isObj(v)) return {};
	return Object.fromEntries(Object.entries(v).filter(([k, x]) => isId(k) && (typeof x === 'boolean' || (typeof x === 'number' && Number.isFinite(x)) || (typeof x === 'string' && x.length <= 4000))).slice(0, 50));
}

// Makes any stored value safe to use: wrong types are repaired, broken or unknown entries are dropped.
function normalize(raw) {
	const s = isObj(raw) ? raw : {};
	const lang = s.lang || ({en: 'en-GB'})[s.language] || s.language || null; // old versions used `language`

	const bookmarks = (Array.isArray(s.bookmarks) ? s.bookmarks : []).flatMap(b => {
		const p = isObj(b) && typeof b.url === 'string' ? parseHttpUrl(b.url) : null; // drops non-http(s) links
		return p ? [{id: String(b.id || uid()), url: b.url, host: p.host, title: String(b.title || p.host)}] : [];
	});

	const widgets = (Array.isArray(s.widgets) ? s.widgets : [])
		.filter(w => isObj(w) && widgetMeta[w.type])
		.map(w => ({
			id: String(w.id || uid()),
			type: w.type,
			config: isObj(w.config) ? w.config : {},
			hidden: !!w.hidden
		}));

	const modules = (Array.isArray(s.modules) ? s.modules : []).flatMap(m => {
		const p = isObj(m) && typeof m.url === 'string' ? parseWsUrl(m.url) : null; // only ws:// and wss://
		return p ? [{
			id: String(m.id || uid()), name: String(m.name || p.host).slice(0, 60), url: p.url, hidden: !!m.hidden,
			autoConnect: m.autoConnect !== false, size: ['s', 'm', 'l'].includes(m.size) ? m.size : 'm', values: cleanValues(m.values)
		}] : [];
	});

	return {
		engine: Number.isInteger(s.engine) && s.engine >= 0 ? s.engine : 0,
		lang: typeof lang === 'string' ? lang : null,
		settings: normalizeSettings(s.settings),
		bookmarks,
		widgets,
		modules
	};
}

/** The live state. Change it directly; it is saved at once. @type {import('@/types').AppState} */
export const state = reactive(normalize(read()));

watch(state, write, {deep: true, flush: 'sync'});
write(state); // persists repaired / migrated data right away