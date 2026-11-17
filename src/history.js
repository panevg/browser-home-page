// The search history as live state. It is deliberately NOT part of `state` (src/state.js):
//  - it has its own localStorage key, so exports/backups of the page state never contain what was searched for;
//  - turning the setting off, or clearing, really deletes it.
// The pure rules (what is stored, expiry, matching) are in src/utils/history.js; the security model is in docs/history.md
import {reactive, watch} from 'vue';
import {state} from '@/state';
import {addEntry, normalizeHistory, removeEntry} from '@/utils/history';

export const HISTORY_KEY = 'startpage:history:v1';

export const history = reactive([]); // [{ q, t (last used, ms), n (times used) }], newest first

const read = () => {
	try {
		return JSON.parse(localStorage.getItem(HISTORY_KEY));
	} catch {
		return null;
	}
};

function save() {
	try {
		if (history.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
		else localStorage.removeItem(HISTORY_KEY);
	} catch { /* storage full or blocked: the history then lives only until the page is closed */
	}
}

const replace = list => history.splice(0, history.length, ...list);
const enabled = () => state.settings.search.history;

export function clearHistory() {
	history.splice(0);
	save();
}

// Called when a search is made (never for opened addresses or bookmarks).
export function record(text) {
	if (!enabled()) return;
	replace(addEntry(history.map(e => ({...e})), text));
	save();
}

export function forget(q) {
	replace(removeEntry(history, q));
	save();
}

// On load: drop expired and sensitive entries right away, or everything when the history is switched off.
if (enabled()) {
	replace(normalizeHistory(read()));
	save();
} else clearHistory();

watch(enabled, on => on || clearHistory()); // switching it off deletes it
addEventListener('storage', e => {          // another tab changed or cleared it
	if (e.key === HISTORY_KEY || e.key === null) replace(enabled() ? normalizeHistory(read()) : []);
});
