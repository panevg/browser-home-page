// Tiny localStorage cache for widget network data. Entries live under `startpage:cache:<key>` and can be deleted safely.
// cached(key, ttlMs, fetcher, isValid?) -> data. A fresh entry is returned as is; otherwise `fetcher` runs and its
// result is stored (unless isValid(data) is false). A full / disabled localStorage never breaks the widget.
const PREFIX = 'startpage:cache:';

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