// GitHub widget: activity heat-map plus pinned repositories.
const css = `
.gh{height:100%;box-sizing:border-box;padding:16px 20px;overflow:hidden;display:grid;grid-template-columns:minmax(210px,auto) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);gap:12px 24px;align-content:stretch}
.gh-head{grid-column:1/-1;min-width:0}.gh-head a{color:var(--text);font:500 18px var(--serif);text-decoration:none}.gh-head a:hover{color:var(--accent);text-decoration:underline}
.gh-summary{display:flex;align-items:baseline;flex-wrap:wrap;column-gap:6px;row-gap:2px;margin:0 0 12px;color:var(--muted);font-size:12px;line-height:1.5}.gh-summary strong{color:var(--text);font-size:14px;font-weight:600}.gh-heat{display:grid;grid-template-rows:repeat(7,11px);grid-auto-flow:column;grid-auto-columns:11px;gap:3px}.gh-heat i{border-radius:3px;background:color-mix(in srgb,var(--accent) calc(var(--l)*22%),var(--soft))}
.gh-section{min-width:0;min-height:0}.gh-activity{align-self:start}.gh-repos-panel{height:100%;min-height:0;display:flex;flex-direction:column}.gh-repos-scroll{min-height:0;flex:1;overflow-y:auto;overscroll-behavior:contain;padding-right:4px}.gh-repos{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:9px}.gh-repo{min-width:0;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}
.gh-repo a{color:var(--accent);font-size:13px;font-weight:600;text-decoration:none;overflow-wrap:anywhere}.gh-repo a:hover{text-decoration:underline}.gh-repo p{margin:5px 0 0;color:var(--muted);font-size:11px;line-height:1.4}.gh-sub{display:block;color:var(--muted);font-size:11px;font-weight:400}.gh-msg{grid-column:1/-1;margin:auto;color:var(--muted);text-align:center}
@media(max-width:620px){.gh{grid-template-columns:1fr;grid-template-rows:auto auto minmax(0,1fr);gap:12px}.gh-head{grid-column:1}.gh-heat{grid-auto-columns:10px;grid-template-rows:repeat(7,10px)}.gh-repos-panel{min-height:0}.gh-repos{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}}
`;

Widgets.define('github', {
  props: ['config', 'locale'],
  template: `<div class="gh">
    <header class="gh-head"><a :href="profileUrl" target="_blank" rel="noopener">@{{config.user}}</a></header>
    <p v-if="err" class="gh-msg">{{err}}</p>
    <p v-else-if="loading" class="gh-msg">{{tr('loading')}}</p>
    <template v-else>
      <section class="gh-section gh-activity">
        <div class="gh-summary"><strong>{{total}}</strong><span>{{tr('last90Days')}}</span></div>
        <div class="gh-heat"><i v-for="c in cells" :key="c.d" :title="c.d+': '+c.n" :style="{'--l': lvl(c.n)}"></i></div>
      </section>
      <section class="gh-section gh-repos-panel">
        <div class="gh-repos-scroll">
          <div v-if="repos.length" class="gh-repos">
            <article class="gh-repo" v-for="repo in repos" :key="repo.name">
              <a :href="repo.url" target="_blank" rel="noopener">{{repo.name}}</a>
              <p v-if="repo.description">{{repo.description}}</p>
            </article>
          </div>
          <p v-else class="gh-sub">{{tr('noPinned')}}</p>
        </div>
      </section>
    </template>
  </div>`,
  data: () => ({ cells: [], total: 0, repos: [], loading: true, err: '' }),
  computed: {
    messages() { return Widgets.languagePack('github', this.locale); },
    profileUrl() { return `https://github.com/${encodeURIComponent(this.config.user)}`; }
  },
  created() { this.load(); },
  methods: {
    tr(key) { return this.messages?.[key] || key; },
    lvl(n) { return n ? Math.min(4, Math.ceil(n / 3)) : 0; },
    async load() {
      const user = this.config.user, eventKey = 'gh-activity:' + user, repoKey = 'gh-pinned:' + user;
      try {
        const [activity, pinned] = await Promise.all([
          this.fetchCached(eventKey, async () => {
            const pages = await Promise.all([1, 2, 3].map(page => fetch(`https://api.github.com/users/${encodeURIComponent(user)}/events/public?per_page=100&page=${page}`).then(response => {
              if (!response.ok) throw new Error(response.status === 404 ? this.tr('userNotFound') : this.tr('apiError') + ' (' + response.status + ')');
              return response.json();
            })));
            return pages.flat();
          }),
          this.fetchCached(repoKey, async () => {
            const response = await fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(this.profileUrl));
            if (!response.ok) throw new Error('profile');
            const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
            return [...doc.querySelectorAll('.pinned-item-list-item')].map(card => {
              const link = card.querySelector('a[href]'); if (!link) return null;
              const path = link.getAttribute('href');
              const title = card.querySelector('.Link--primary, h3 a, a span') || link;
              return { name: (title.textContent || path.split('/').filter(Boolean).pop()).trim(), url: new URL(path, 'https://github.com').href, description: card.querySelector('.pinned-item-desc')?.textContent.trim() || '' };
            }).filter(Boolean).slice(0, 6);
          })
        ]);
        this.build(activity); this.repos = pinned;
      } catch (e) { this.err = e.message === 'profile' ? this.tr('loadError') : (e.message || this.tr('loadError')); }
      finally { this.loading = false; }
    },
    async fetchCached(key, fetcher) {
      try { const cache = JSON.parse(localStorage.getItem(key) || 'null'); if (cache && Date.now() - cache.time < 600000) return cache.data; } catch {}
      const data = await fetcher(); localStorage.setItem(key, JSON.stringify({ time: Date.now(), data })); return data;
    },
    build(events) {
      const day = d => new Date(d).toLocaleDateString('sv'), counts = {};
      events.forEach(e => { const key = day(e.created_at); counts[key] = (counts[key] || 0) + 1; });
      const today = new Date(); today.setHours(12, 0, 0, 0);
      const start = new Date(today); start.setDate(today.getDate() - today.getDay() - 7 * 12);
      const cells = [];
      for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) { const key = day(d); cells.push({ d: key, n: counts[key] || 0 }); }
      this.cells = cells; this.total = events.length;
    }
  }
}, css, {
  'en': { last90Days: 'events in the last 90 days', loading: 'Loading GitHub data…', loadError: 'Could not load GitHub data. Please try again later.', userNotFound: 'GitHub user not found', apiError: 'GitHub API error', noPinned: 'This user has no public pinned repositories.' },
  uk: { last90Days: 'подій за останні 90 днів', loading: 'Завантаження даних GitHub…', loadError: 'Не вдалося завантажити дані GitHub. Спробуйте пізніше.', userNotFound: 'Користувача GitHub не знайдено', apiError: 'Помилка GitHub API', noPinned: 'У цього користувача немає публічних закріплених репозиторіїв.' }
});
