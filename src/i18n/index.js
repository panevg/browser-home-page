/**
 * Translation core.
 *
 * Application strings: `src/locales/<code>.js`; language list: `src/locales/index.js`.
 * Widget packs: `src/widgets/<type>/lang/<code>.js`, discovered automatically. Both default-export an object of strings.
 * Missing keys fall back to `en-GB` and then to the key itself. Strings may contain `{name}` placeholders.
 * Guide: docs/localization.md
 */
import {reactive} from 'vue';
import {languages, FALLBACK} from '@/locales';

export {languages, FALLBACK};

/**
 * The loaded strings and the current language. Reactive: changing `data.lang` (or loading a pack) re-renders everything
 * that calls `t()` / `wt()`. Read `data.lang` when you need the code for `Intl`.
 */
export const data = reactive({lang: FALLBACK, app: {}, widget: {}});

const fmt = (s, p) => String(s).replace(/\{(\w+)\}/g, (_, k) => (p && k in p ? p[k] : '{' + k + '}'));

// ---- App strings ----
async function loadApp(code) {
	if (data.app[code]) return;
	const lang = languages.find(l => l.code === code);
	try {
		data.app[code] = (await lang.load()).default;
	} catch (e) {
		console.error(`[i18n] cannot load language "${code}"`, e); // the fallback language is used instead
	}
}

// ---- Widget packs (lazy; one chunk per pack) ----
const packs = Object.entries(import.meta.glob('../widgets/*/lang/*.js', {import: 'default'})).map(([path, load]) => {
	const [, type, code] = path.match(/widgets\/([^/]+)\/lang\/([^/]+)\.js$/);
	return {type, code, load};
});
const packPromises = {};
let packsOn = false; // widget packs are loaded only after the page itself has loaded

function loadPack({type, code, load}) {
	return (packPromises[type + '/' + code] ||= load()
		.then(strings => {
			if (!data.widget[type]) data.widget[type] = {};
			data.widget[type][code] = strings;
		})
		.catch(e => console.warn(`[i18n] cannot load widget pack ${type}/${code}`, e)));
}

/**
 * Loads the language packs of every widget, for the fallback and the current language. Until this is called the packs
 * are not loaded (the page starts them after it has loaded). Calling it again is cheap.
 * @returns {Promise<unknown[]>}
 */
export function loadWidgetPacks() {
	packsOn = true;
	const codes = new Set([FALLBACK, data.lang]);
	return Promise.all(packs.filter(p => codes.has(p.code)).map(loadPack));
}

// ---- Language selection ----
/**
 * The language to use on the first visit: the first entry of `navigator.languages` that is available, by exact code
 * (`de-DE`) and then by base language (`de-AT` finds `de-DE`); `en-GB` when nothing matches.
 * @returns {string} A language code.
 */
export function detect() {
	for (const l of navigator.languages || [navigator.language]) {
		const c = (l || '').toLowerCase();
		const hit = languages.find(x => x.code.toLowerCase() === c) || languages.find(x => x.code.toLowerCase().split('-')[0] === c.split('-')[0]);
		if (hit) return hit.code;
	}
	return FALLBACK;
}

/**
 * Switches the interface language: loads its strings (and the widget packs, once those are enabled), then updates
 * `data.lang` and `<html lang>`. An unknown code selects the fallback.
 * @param {string} code
 * @returns {Promise<string>} The language that was actually selected.
 */
export async function use(code) {
	if (!languages.some(l => l.code === code)) code = FALLBACK;
	await Promise.all([...new Set([FALLBACK, code])].map(loadApp));
	data.lang = code;
	document.documentElement.lang = code;
	if (packsOn) loadWidgetPacks();
	return code;
}

// ---- Translation ----
/**
 * Translates an application string.
 * @param {string} key
 * @param {Record<string, string|number>} [params] Values for `{name}` placeholders; unknown placeholders stay as they are.
 * @returns {string}
 * @example t('mod.status.ready'); t('set.clearHistory', {n: 3})
 */
export function t(key, params) {
	const d = data.app;
	return fmt(d[data.lang]?.[key] ?? d[FALLBACK]?.[key] ?? key, params);
}

/**
 * Translates a widget string from the widget's own language pack.
 * @param {string} type  The widget type (its folder name).
 * @param {string} key
 * @param {Record<string, string|number>} [params]
 * @returns {string}
 * @example wt('farm', 'level', {n: 3})
 */
export function wt(type, key, params) {
	const w = data.widget[type] || {};
	return fmt(w[data.lang]?.[key] ?? w[FALLBACK]?.[key] ?? key, params);
}

/**
 * A relative time such as "5 minutes ago" or "in 2 days", in the current language.
 * @param {Date|number|string} d
 * @returns {string} An empty string for an invalid date.
 */
export function ago(d) {
	const m = (new Date(d).getTime() - Date.now()) / 6e4;
	if (Number.isNaN(m)) return '';
	const f = new Intl.RelativeTimeFormat(data.lang, {numeric: 'auto'});
	return Math.abs(m) < 60 ? f.format(Math.round(m), 'minute') : Math.abs(m) < 1440 ? f.format(Math.round(m / 60), 'hour') : f.format(Math.round(m / 1440), 'day');
}