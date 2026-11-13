// GitHub activity widget (public events API, last ~90 days). Registered in registry.js.
const css = `
.gh{display:grid;grid-template-columns:auto minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:24px;height:100%;padding:16px 20px}
.gh h3{margin:0 0 12px;font:500 18px var(--serif)}
.gh h3 small{display:block;margin-top:2px;color:var(--muted);font:12px var(--sans)}
.gh-heat{display:grid;grid-template-rows:repeat(7,13px);grid-auto-flow:column;grid-auto-columns:13px;gap:3px}
.gh-heat i{border-radius:3px;background:color-mix(in srgb,var(--accent) calc(var(--l)*22%),var(--soft))}
.gh-list{list-style:none;margin:0;padding:0;overflow:auto;font-size:13px}
.gh-list li{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}
.gh-list a{color:var(--accent);text-decoration:none;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.gh-list time{color:var(--muted)}
.gh-msg{grid-column:1/-1;margin:auto;color:var(--muted)}`;

const LABELS = { PushEvent: 'Push', PullRequestEvent: 'Pull request', IssuesEvent: 'Issue', IssueCommentEvent: 'Коментар', CreateEvent: 'Створено', WatchEvent: 'Star', ForkEvent: 'Fork', DeleteEvent: 'Видалено' };

Widgets.define('github', {
  props: ['config'],
  template: `<div class="gh">
    <p v-if="err" class="gh-msg">{{err}}</p>
    <p v-else-if="!cells.length" class="gh-msg">Завантаження…</p>
    <template v-else>
      <div>
        <h3>@{{config.user}}<small>{{total}} подій за останні 90 днів</small></h3>
        <div class="gh-heat"><i v-for="c in cells" :key="c.d" :title="c.d+': '+c.n" :style="{'--l': lvl(c.n)}"></i></div>
      </div>
      <ul class="gh-list">
        <li v-for="e in events" :key="e.id"><b>{{label(e)}}</b><a :href="'https://github.com/'+e.repo.name" target="_blank" rel="noopener">{{e.repo.name}}</a><time>{{ago(e.created_at)}}</time></li>
      </ul>
    </template></div>`,
  data: () => ({ cells: [], events: [], total: 0, err: '' }),
  created() { this.load(); },
  methods: {
    async load() {
      const u = this.config.user, k = 'gh:' + u;
      try {
        let c = JSON.parse(localStorage.getItem(k) || 'null');
        if (!c || Date.now() - c.t > 6e5) { // cache for 10 min (API limit: 60 req/h)
          const pages = await Promise.all([1, 2, 3].map(p =>
            fetch(`https://api.github.com/users/${encodeURIComponent(u)}/events/public?per_page=100&page=${p}`)
              .then(r => { if (!r.ok) throw Error(r.status === 404 ? 'Користувача не знайдено' : 'Помилка GitHub API (' + r.status + ')'); return r.json(); })));
          c = { t: Date.now(), d: pages.flat().map(e => ({ id: e.id, type: e.type, created_at: e.created_at, repo: { name: e.repo.name } })) };
          localStorage.setItem(k, JSON.stringify(c));
        }
        this.build(c.d);
      } catch (e) { this.err = e.message; }
    },
    build(ev) {
      const day = d => new Date(d).toLocaleDateString('sv'), cnt = {};
      ev.forEach(e => { const k = day(e.created_at); cnt[k] = (cnt[k] || 0) + 1; });
      const t = new Date(); t.setHours(12);
      const s = new Date(t); s.setDate(t.getDate() - t.getDay() - 7 * 12); // 13 weeks, Sunday first
      const cells = [];
      for (const d = new Date(s); d <= t; d.setDate(d.getDate() + 1)) { const k = day(d); cells.push({ d: k, n: cnt[k] || 0 }); }
      this.cells = cells; this.events = ev.slice(0, 30); this.total = ev.length;
    },
    lvl: n => (n ? Math.min(4, Math.ceil(n / 3)) : 0),
    label: e => LABELS[e.type] || e.type.replace('Event', ''),
    ago(d) {
      const m = (new Date(d) - Date.now()) / 6e4, f = new Intl.RelativeTimeFormat('uk', { numeric: 'auto' });
      return Math.abs(m) < 60 ? f.format(Math.round(m), 'minute') : Math.abs(m) < 1440 ? f.format(Math.round(m / 60), 'hour') : f.format(Math.round(m / 1440), 'day');
    },
  },
}, css);
