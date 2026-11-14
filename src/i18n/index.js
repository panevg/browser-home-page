// i18n core.
// App strings: src/locales/<code>.js (default export = strings). Language list: src/locales/index.js.
// Widget packs: src/widgets/<type>/lang/<code>.js (default export = strings), discovered automatically.
import {reactive} from 'vue';
import {languages, FALLBACK} from '@/locales';

export {languages, FALLBACK};

// `data` is reactive: changing `data.lang` (or loading a pack) re-renders everything that calls t() / wt().
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

// Loads the packs of every widget for the fallback and the current language.
export function loadWidgetPacks() {
	packsOn = true;
	const codes = new Set([FALLBACK, data.lang]);
	return Promise.all(packs.filter(p => codes.has(p.code)).map(loadPack));
}

// ---- Language selection ----
// First visit: system language if supported (exact code, then base language), else English (UK).
export function detect() {
	for (const l of navigator.languages || [navigator.language]) {
		const c = (l || '').toLowerCase();
		const hit = languages.find(x => x.code.toLowerCase() === c) || languages.find(x => x.code.toLowerCase().split('-')[0] === c.split('-')[0]);
		if (hit) return hit.code;
	}
	return FALLBACK;
}

export async function use(code) {
	if (!languages.some(l => l.code === code)) code = FALLBACK;
	await Promise.all([...new Set([FALLBACK, code])].map(loadApp));
	data.lang = code;
	document.documentElement.lang = code;
	if (packsOn) loadWidgetPacks();
	return code;
}

// ---- Translation ----
export function t(key, p) {
	const d = data.app;
	return fmt(d[data.lang]?.[key] ?? d[FALLBACK]?.[key] ?? key, p);
}

export function wt(type, key, p) {
	const w = data.widget[type] || {};
	return fmt(w[data.lang]?.[key] ?? w[FALLBACK]?.[key] ?? key, p);
}

// "5 minutes ago" in the current language. Returns '' for an unparsable date.
export function ago(d) {
	const m = (new Date(d) - Date.now()) / 6e4;
	if (Number.isNaN(m)) return '';
	const f = new Intl.RelativeTimeFormat(data.lang, {numeric: 'auto'});
	return Math.abs(m) < 60 ? f.format(Math.round(m), 'minute') : Math.abs(m) < 1440 ? f.format(Math.round(m / 60), 'hour') : f.format(Math.round(m / 1440), 'day');
}