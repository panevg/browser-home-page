// The search history as live state. It is deliberately NOT part of `state` (src/state.js):
//  - it has its own localStorage key, so exports/backups of the page state never contain what was searched for;
//  - turning the setting off, or clearing, really deletes it.
// The pure rules (what is stored, expiry, matching) are in src/utils/history.js; the security model is in docs/history.md
import {reactive, watch} from 'vue';
import {state} from '@/state';
import {addEntry, normalizeHistory, removeEntry} from '@/utils/history';

/** The `localStorage` key of the history (separate from `startpage:v1` on purpose). */
export const HISTORY_KEY = 'startpage:history:v1';

/** The live history, newest first. Read it; change it only with `record`, `forget` and `clearHistory`. @type {import('@/types').HistoryEntry[]} */
export const history = reactive([]);

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

/** Deletes the whole history, including the saved copy. */
export function clearHistory() {
	history.splice(0);
	save();
}

/**
 * Remembers a search. Does nothing while the history is switched off or when the text looks sensitive.
 * Call it for real searches only, never for opened addresses or bookmarks.
 * @param {string} text
 */
export function record(text) {
	if (!enabled()) return;
	replace(addEntry(history.map(e => ({...e})), text));
	save();
}

/**
 * Removes one search from the history.
 * @param {string} q
 */
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
