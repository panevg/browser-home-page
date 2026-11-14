// The whole user state: one reactive object, written to localStorage synchronously on every change.
//   { engine: number, lang: string|null, settings: { search, ui }, bookmarks: [{ id, url, host, title }], widgets: [{ id, type, config, hidden }] }
// Widgets keep their own data inside `config`, so it is saved the same way.
import {reactive, watch} from 'vue';
import {widgetMeta} from '@/widgets/registry';
import {parseHttpUrl} from '@/utils/url';
import {uid} from '@/utils/misc';
import {normalizeSettings} from '@/config/settings';

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

	return {
		engine: Number.isInteger(s.engine) && s.engine >= 0 ? s.engine : 0,
		lang: typeof lang === 'string' ? lang : null,
		settings: normalizeSettings(s.settings),
		bookmarks,
		widgets
	};
}

export const state = reactive(normalize(read()));

watch(state, write, {deep: true, flush: 'sync'});
write(state); // persists repaired / migrated data right away