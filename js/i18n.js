// i18n core. App strings: js/locales/<code>.js (call I18n.define). Language list: js/locales/index.js.
// Widget packs: js/widgets/<name>/lang/<code>.js (call I18n.defineWidget), declared via `lang` in widgets/registry.js.
const I18n = (() => {
  const FALLBACK = 'en-GB';
  const data = Vue.reactive({ lang: FALLBACK, app: {}, widget: {} });
  const langs = [], widgetPaths = {}, loaded = {};
  const loadScript = src => (loaded[src] ||= new Promise(r => { // a missing file just resolves (fallback is used)
    const s = document.createElement('script'); s.src = src; s.onload = s.onerror = r; document.head.append(s);
  }));
  const fmt = (s, p) => s.replace(/\{(\w+)\}/g, (_, k) => (p && k in p ? p[k] : '{' + k + '}'));
  let packsOn = false; // widget packs load only after the page has loaded

  function loadPacks() {
    packsOn = true;
    const codes = [...new Set([FALLBACK, data.lang])];
    return Promise.all(Object.values(widgetPaths).flatMap(path => codes.map(c => loadScript(path + c + '.js'))));
  }

  return {
    data, langs, FALLBACK, loadPacks,
    addLang: (code, name, src) => langs.push({ code, name, src }),
    define: (code, strings) => { data.app[code] = strings; },
    defineWidget: (type, code, strings) => { (data.widget[type] ||= {})[code] = strings; },
    widgetPack: (type, path) => { widgetPaths[type] = path; },
    // First visit: system language if supported (exact code, then base language), else English (UK)
    detect() {
      for (const l of navigator.languages || [navigator.language]) {
        const c = (l || '').toLowerCase();
        const hit = langs.find(x => x.code.toLowerCase() === c) || langs.find(x => x.code.toLowerCase().split('-')[0] === c.split('-')[0]);
        if (hit) return hit.code;
      }
      return FALLBACK;
    },
    async use(code) {
      if (!langs.some(l => l.code === code)) code = FALLBACK;
      await Promise.all([...new Set([FALLBACK, code])].map(c => loadScript(langs.find(l => l.code === c).src)));
      data.lang = code; document.documentElement.lang = code;
      if (packsOn) loadPacks();
      return code;
    },
    ago(d) { // "5 minutes ago" in the current language
      const m = (new Date(d) - Date.now()) / 6e4, f = new Intl.RelativeTimeFormat(data.lang, { numeric: 'auto' });
      return Math.abs(m) < 60 ? f.format(Math.round(m), 'minute') : Math.abs(m) < 1440 ? f.format(Math.round(m / 60), 'hour') : f.format(Math.round(m / 1440), 'day');
    },
    t(key, p) { const d = data.app; return fmt(d[data.lang]?.[key] ?? d[FALLBACK]?.[key] ?? key, p); },
    wt(type, key, p) { const w = data.widget[type] || {}; return fmt(w[data.lang]?.[key] ?? w[FALLBACK]?.[key] ?? key, p); },
  };
})();
