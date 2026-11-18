/**
 * Search history rules: pure functions with no storage and no Vue. The live list is in src/history.js.
 * A list is an array of `HistoryEntry` (src/types.js), newest first. None of the functions change the list they are given.
 * What is stored, how long, and the security model: docs/history.md
 */
/** One day in milliseconds. */
export const DAY = 864e5;
/** Entries older than this many days are deleted. The label `set.history` in the locale files says "30 days" too. */
export const HISTORY_DAYS = 30;
/** At most this many entries are kept; the oldest ones are dropped first. */
export const MAX_ENTRIES = 300;
/** Texts longer than this are never stored. */
export const MAX_LENGTH = 100;

// Control characters, zero-width characters and bidirectional overrides (they can be used to disguise text) become spaces.
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]+/g;
/**
 * Normalises a search text: control, zero-width and direction-override characters become spaces, runs of spaces collapse.
 * @param {unknown} text
 * @returns {string}
 */
export const cleanQuery = text => String(text ?? '').replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim();

/**
 * Whether a (cleaned) text must never be remembered because it may be a secret or personal data: addresses, e-mails,
 * `password:` style assignments, tokens and keys, IBANs, mostly digits, long mixed letter-digit words, or too long.
 * It is a safety net and errs on the side of not storing. Matching entries are also removed from a stored history on load.
 * @param {string} q
 * @returns {boolean}
 */
export function isSensitive(q) {
	if (q.length > MAX_LENGTH) return true;
	if (/:\/\//.test(q)) return true;                                    // addresses can carry tokens and passwords
	if (/\S+@\S+\.\S+/.test(q)) return true;                              // e-mail addresses
	if (/(^|\W)(pass(word|wd|phrase|code)?|pwd|token|secret|api[\s_-]?key|authorization|auth)\s*[:=]/i.test(q)) return true; // "password: ..."
	if (/^bearer\s+\S+/i.test(q) || /-----BEGIN/.test(q) || /\beyJ[\w-]{10,}/.test(q)) return true; // tokens, keys, JWTs
	if (/^[a-z]{2}\d{2}[a-z0-9]{11,30}$/i.test(q.replace(/[\s-]/g, ''))) return true; // IBAN
	const digits = (q.match(/\d/g) || []).length;
	if (digits >= 9 && digits / q.replace(/\s/g, '').length > 0.6) return true; // card, phone and document numbers
	// one long "word" that mixes letters and digits: API keys, hashes, generated passwords (readable slugs are fine)
	return q.split(' ').some(w => /^[A-Za-z0-9+/=_-]{24,}$/.test(w) && /\d/.test(w) && /[A-Za-z]/.test(w) && !/^[a-z0-9]+(-[a-z0-9]+)+$/.test(w));
}

const expired = (e, now) => now - e.t > HISTORY_DAYS * DAY;
const key = q => q.toLowerCase();

/**
 * Makes anything (a missing, old or damaged save) a valid list: newest first, no duplicates, nothing expired or sensitive.
 * @param {unknown} raw
 * @param {number} [now]
 * @returns {import('@/types').HistoryEntry[]}
 */
export function normalizeHistory(raw, now = Date.now()) {
	if (!Array.isArray(raw)) return [];
	const seen = new Map();
	for (const e of raw) {
		if (!e || typeof e !== 'object') continue;
		const q = cleanQuery(e.q);
		if (!q || typeof e.t !== 'number' || !Number.isFinite(e.t) || e.t > now + DAY || expired(e, now) || isSensitive(q)) continue;
		const n = typeof e.n === 'number' && Number.isFinite(e.n) ? Math.min(999, Math.max(1, Math.floor(e.n))) : 1;
		const t = Math.min(e.t, now), cur = seen.get(key(q));
		if (!cur) seen.set(key(q), {q, t, n});
		else {
			cur.n = Math.min(999, cur.n + n);
			if (t > cur.t) Object.assign(cur, {q, t});
		}
	}
	return [...seen.values()].sort((a, b) => b.t - a.t).slice(0, MAX_ENTRIES);
}

/**
 * Records a search: the entry moves to the front and its counter grows.
 * @param {import('@/types').HistoryEntry[]} list
 * @param {string} text
 * @param {number} [now]
 * @returns {import('@/types').HistoryEntry[]} The new list, or the same list when the text must not be stored.
 */
export function addEntry(list, text, now = Date.now()) {
	const q = cleanQuery(text);
	if (!q || isSensitive(q)) return list;
	const found = list.find(e => key(e.q) === key(q));
	return [{q, t: now, n: (found?.n || 0) + 1}, ...list.filter(e => e !== found)].filter(e => !expired(e, now)).slice(0, MAX_ENTRIES);
}

/**
 * The list without the entry for `q` (case-insensitive).
 * @param {import('@/types').HistoryEntry[]} list
 * @param {string} q
 * @returns {import('@/types').HistoryEntry[]}
 */
export const removeEntry = (list, q) => list.filter(e => key(e.q) !== key(cleanQuery(q)));

/**
 * Entries that match what is being typed, best first: starts with it, then a word starts with it, then contains it;
 * within a group the ones used often and recently come first. The typed text itself is not offered again.
 * @param {import('@/types').HistoryEntry[]} list
 * @param {string} typed
 * @param {number} [limit]
 * @param {number} [now]
 * @returns {import('@/types').HistoryEntry[]}
 */
export function matchHistory(list, typed, limit = 4, now = Date.now()) {
	const q = key(cleanQuery(typed));
	if (!q) return [];
	const rank = s => (s.startsWith(q) ? 0 : (' ' + s).includes(' ' + q) ? 1 : s.includes(q) ? 2 : 3);
	const frecency = e => e.n * 0.5 ** ((now - e.t) / DAY / 14); // halves every two weeks
	return list
		.filter(e => !expired(e, now) && key(e.q) !== q)
		.map(e => /** @type {[number, number, import('@/types').HistoryEntry]} */ ([rank(key(e.q)), frecency(e), e]))
		.filter(x => x[0] < 3)
		.sort((a, b) => a[0] - b[0] || b[1] - a[1] || b[2].t - a[2].t)
		.slice(0, limit)
		.map(x => x[2]);
}
