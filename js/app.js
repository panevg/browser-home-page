// Main app: search, bookmarks, widgets. Widget model: see widgets/registry.js
const { createApp, reactive, ref, computed, shallowReactive, markRaw, watch } = Vue;

const ENGINES = [
  { name: 'DuckDuckGo', host: 'duckduckgo.com', url: 'https://duckduckgo.com/?q=%s' },
  { name: 'Google', host: 'google.com', url: 'https://www.google.com/search?q=%s' },
  { name: 'Bing', host: 'bing.com', url: 'https://www.bing.com/search?q=%s' },
  { name: 'Startpage', host: 'startpage.com', url: 'https://www.startpage.com/do/search?q=%s' },
  { name: 'Brave', host: 'search.brave.com', url: 'https://search.brave.com/search?q=%s' },
  { name: 'Wikipedia', host: 'wikipedia.org', url: 'https://uk.wikipedia.org/w/index.php?search=%s' },
  { name: 'YouTube', host: 'youtube.com', url: 'https://www.youtube.com/results?search_query=%s' },
];
const icon = h => `https://icons.duckduckgo.com/ip3/${h}.ico`;
const uid = () => Math.random().toString(36).slice(2, 9);

createApp({
  setup() {
    // ---- State (saved instantly on every change) ----
    const state = reactive(Store.load({ engine: 0, bookmarks: [], widgets: [] }));
    state.widgets = state.widgets.filter(w => Widgets.meta[w.type]); // drop unknown types
    watch(state, s => Store.save(s), { deep: true, flush: 'sync' });

    // ---- Search + suggestions (DuckDuckGo autocomplete) ----
    const q = ref(''), sugg = ref([]), sel = ref(-1), menu = ref(false);
    const engine = computed(() => ENGINES[state.engine] || ENGINES[0]);
    let timer, ctl, typed = '';
    function onInput() {
      sel.value = -1; typed = q.value; clearTimeout(timer);
      if (!typed.trim()) { sugg.value = []; return; }
      timer = setTimeout(async () => {
        ctl && ctl.abort(); ctl = new AbortController();
        try {
          const r = await fetch('https://ac.duckduckgo.com/ac/?type=list&q=' + encodeURIComponent(typed), { signal: ctl.signal });
          sugg.value = (await r.json())[1] || [];
        } catch {}
      }, 120);
    }
    function move(d) {
      const n = sugg.value.length; if (!n) return;
      const i = (sel.value + 1 + d + n + 1) % (n + 1); // 0 = typed text, 1..n = suggestions
      sel.value = i - 1; q.value = i ? sugg.value[i - 1] : typed;
    }
    function go() {
      const t = q.value.trim(); if (!t) return;
      location.href = /^https?:\/\//i.test(t) ? t : engine.value.url.replace('%s', encodeURIComponent(t));
    }

    // ---- Bookmarks ----
    const bm = reactive({ show: false, url: '', title: '' });
    const openBm = () => { bm.url = ''; bm.title = ''; bm.show = true; };
    async function fetchTitle(u) { // CORS-free proxy; falls back to hostname on failure
      try {
        const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(u), { signal: AbortSignal.timeout(6000) });
        return new DOMParser().parseFromString(await r.text(), 'text/html').title.trim().slice(0, 60);
      } catch { return ''; }
    }
    function addBookmark() {
      let u = bm.url.trim(), host;
      if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) u = 'https://' + u;
      try { host = new URL(u).hostname; } catch { return; }
      const given = bm.title.trim(), b = { id: uid(), url: u, host, title: given || host };
      state.bookmarks.push(b); bm.show = false;
      if (!given) fetchTitle(u).then(t => { const x = state.bookmarks.find(y => y.id === b.id); if (x && t) x.title = t; });
    }
    const delBm = id => state.bookmarks.splice(state.bookmarks.findIndex(b => b.id === id), 1);

    // ---- Widgets (scripts load lazily, only after the page has fully loaded) ----
    const loaded = shallowReactive({}), pending = {};
    let ready = false;
    function loadWidget(type) {
      if (loaded[type] || pending[type] || !Widgets.meta[type]) return;
      pending[type] = 1;
      const s = document.createElement('script'); s.src = Widgets.meta[type].src;
      s.onload = () => { loaded[type] = markRaw(Widgets.components[type]); };
      document.head.append(s);
    }
    addEventListener('load', () => {
      ready = true;
      (window.requestIdleCallback || setTimeout)(() => state.widgets.forEach(w => loadWidget(w.type)));
    });

    const catalog = Object.entries(Widgets.meta).map(([type, m]) => ({ type, ...m }));
    const wm = reactive({ show: false, type: catalog[0].type, config: {} });
    const wfields = computed(() => Widgets.meta[wm.type].fields);
    const openWm = () => { wm.type = catalog[0].type; wm.config = {}; wm.show = true; };
    function addWidget() {
      if (wfields.value.some(f => f.required && !(wm.config[f.key] || '').trim())) return;
      state.widgets.push({ id: uid(), type: wm.type, config: { ...wm.config }, hidden: false });
      wm.show = false;
      if (ready) loadWidget(wm.type);
    }
    const delW = id => state.widgets.splice(state.widgets.findIndex(w => w.id === id), 1);

    // ---- Drag & drop reorder (items only move within their own group) ----
    let drag = null;
    function dnd(group, list, id) {
      return {
        onDragstart(e) { drag = { group, id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id); e.dataTransfer.setDragImage(e.currentTarget, 16, 16); },
        onDragover(e) {
          if (!drag || drag.group !== group || drag.id === id) return;
          e.preventDefault();
          list.splice(list.findIndex(x => x.id === id), 0, list.splice(list.findIndex(x => x.id === drag.id), 1)[0]);
        },
        onDragend() { drag = null; },
      };
    }

    // ---- Global events ----
    addEventListener('keydown', e => {
      if (e.key === 'Escape') { bm.show = wm.show = menu.value = false; sugg.value = []; }
      else if (e.key === '+' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName) && !bm.show && !wm.show) { e.preventDefault(); openBm(); }
    });
    addEventListener('click', e => { if (!e.target.closest('.search-box')) { menu.value = false; sugg.value = []; } });

    return { state, engines: ENGINES, engine, icon, q, sugg, sel, menu, onInput, move, go,
      bm, openBm, addBookmark, delBm, wm, catalog, wfields, openWm, addWidget, delW, loaded, meta: Widgets.meta, dnd };
  },
}).directive('focus', { mounted: el => el.focus() }).mount('#app');
