// A tiny `localStorage` cache for the network data of widgets. Entries live under `startpage:cache:<key>`
// and can be deleted safely at any time.
const PREFIX = 'startpage:cache:';

/**
 * Returns fresh cached data, or runs `fetcher` and caches its result. A full or disabled `localStorage` never breaks the
 * widget: the data is then simply not cached.
 * @template T
 * @param {string} key                       Unique per kind of data, for example `weather:geo:berlin`.
 * @param {number} ttl                       How long an entry stays fresh, in milliseconds.
 * @param {() => Promise<T>} fetcher         Loads the data. Errors are not caught.
 * @param {(data: T) => boolean} [isValid]   Return false to skip caching a result (for example an empty list).
 * @returns {Promise<T>}
 * @example const data = await cached(`rates:${base}`, 36e5, () => fetchRates(base), d => !!d.rates)
 */
export async function cached(key, ttl, fetcher, isValid = () => true) {
	const k = PREFIX + key;
	try {
		const c = JSON.parse(localStorage.getItem(k));
		if (c && Date.now() - c.t < ttl) return c.d;
	} catch {
	}
	const d = await fetcher();
	if (isValid(d)) {
		try {
			localStorage.setItem(k, JSON.stringify({t: Date.now(), d}));
		} catch {
		}
	}
	return d;
}