// Search history: pure functions (no storage, no Vue). The stateful part is src/history.js. Rules and the security model: docs/history.md
export const DAY = 864e5;
export const HISTORY_DAYS = 30;  // entries older than this are deleted
export const MAX_ENTRIES = 300;  // the oldest ones are dropped beyond this
export const MAX_LENGTH = 100;   // longer texts are never stored

// Control characters, zero-width characters and bidirectional overrides (they can be used to disguise text) become spaces.
const INVISIBLE = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u2069\ufeff]+/g;
export const cleanQuery = text => String(text ?? '').replace(INVISIBLE, ' ').replace(/\s+/g, ' ').trim();

// Texts that must never be remembered: they may be secrets or personal data. This is a safety net, not a guarantee,
// so it errs on the side of not storing. Matching entries are also removed from an existing history on load.
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

// Makes anything (a missing, old or damaged save) a valid list: newest first, no duplicates, nothing expired or sensitive.
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

// A search was made: returns the new list (the same list when the text must not be stored).
export function addEntry(list, text, now = Date.now()) {
	const q = cleanQuery(text);
	if (!q || isSensitive(q)) return list;
	const found = list.find(e => key(e.q) === key(q));
	return [{q, t: now, n: (found?.n || 0) + 1}, ...list.filter(e => e !== found)].filter(e => !expired(e, now)).slice(0, MAX_ENTRIES);
}

export const removeEntry = (list, q) => list.filter(e => key(e.q) !== key(cleanQuery(q)));

// Entries that match what is being typed, best first: starts with it, then a word starts with it, then contains it;
// within a group the ones used often and recently come first. The typed text itself is not offered again.
export function matchHistory(list, typed, limit = 4, now = Date.now()) {
	const q = key(cleanQuery(typed));
	if (!q) return [];
	const rank = s => (s.startsWith(q) ? 0 : (' ' + s).includes(' ' + q) ? 1 : s.includes(q) ? 2 : 3);
	const frecency = e => e.n * 0.5 ** ((now - e.t) / DAY / 14); // halves every two weeks
	return list
		.filter(e => !expired(e, now) && key(e.q) !== q)
		.map(e => [rank(key(e.q)), frecency(e), e])
		.filter(x => x[0] < 3)
		.sort((a, b) => a[0] - b[0] || b[1] - a[1] || b[2].t - a[2].t)
		.slice(0, limit)
		.map(x => x[2]);
}
