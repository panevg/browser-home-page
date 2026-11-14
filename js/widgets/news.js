// Latest news from any RSS/Atom feed (fetched through a CORS proxy, cached 10 min). Texts: news/lang/<code>.js
const css = `
.nw{height:100%;display:flex;flex-direction:column;padding:14px 20px}
.nw h4{margin:0 0 6px;font:500 16px var(--serif)}
.nw-list{flex:1;min-height:0;overflow-y:auto;margin:0;padding:0;list-style:none}
.nw-list li{padding:8px 0;border-bottom:1px solid var(--line)}
.nw-list a{color:var(--text);text-decoration:none;font-size:14px;line-height:1.35}.nw-list a:hover{color:var(--accent)}
.nw-list time{display:block;margin-top:2px;color:var(--muted);font-size:12px}
.nw-msg{margin:auto;color:var(--muted);text-align:center}`;

Widgets.define('news', {
  props: ['config'],
  template: `<div class="nw">
    <p v-if="err" class="nw-msg">{{tr(err)}}</p>
    <p v-else-if="!items" class="nw-msg">{{tr('loading')}}</p>
    <template v-else>
      <h4 v-if="config.title">{{config.title}}</h4>
      <ul class="nw-list scroll"><li v-for="n in items" :key="n.url"><a :href="n.url" target="_blank" rel="noopener">{{n.title}}</a><time v-if="n.date">{{ago(n.date)}}</time></li></ul>
    </template></div>`,
  data: () => ({ items: null, err: '' }),
  created() { this.load(); },
  methods: {
    tr: (k, p) => I18n.wt('news', k, p),
    ago: d => I18n.ago(d),
    parse(text) {
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      if (doc.querySelector('parsererror')) throw 0;
      return [...doc.querySelectorAll('item, entry')].map(n => {
        const q = s => n.querySelector(s), l = q('link');
        return { title: (q('title')?.textContent || '').trim(), url: l?.getAttribute('href') || l?.textContent.trim() || '', date: q('pubDate, published, updated')?.textContent || '' };
      }).filter(x => x.title && /^https?:\/\//i.test(x.url)).slice(0, 30); // only http(s) links from external data
    },
    async load() {
      const feed = (this.config.feed || '').trim(), k = 'news:' + feed;
      try {
        let c = JSON.parse(localStorage.getItem(k) || 'null');
        if (!c || Date.now() - c.t > 6e5) {
          const r = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(feed), { signal: AbortSignal.timeout(10000) });
          if (!r.ok) throw 0;
          c = { t: Date.now(), d: this.parse(await r.text()) };
          if (c.d.length) localStorage.setItem(k, JSON.stringify(c));
        }
        if (!c.d.length) { this.err = 'empty'; return; }
        this.items = c.d;
      } catch { this.err = 'loadError'; }
    },
  },
}, css);
