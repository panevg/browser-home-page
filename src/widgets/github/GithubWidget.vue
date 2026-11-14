<script setup>
// GitHub widget: activity heat-map plus pinned repositories. Texts: ./lang/<code>.js
import {computed, ref} from 'vue';
import {ago, wt} from '@/i18n';
import {cached} from '@/utils/cache';
import {proxied} from '@/utils/net';

const props = defineProps({config: {type: Object, required: true}});
const tr = key => wt('github', key);

const TTL = 6e5; // 10 minutes
const API = 'https://api.github.com/users/';

// An error whose message is meant for the user (anything else shows the generic "could not load")
class UserError extends Error {
}

const cells = ref([]), total = ref(0), repos = ref([]), recent = ref([]), loading = ref(true), err = ref('');

const user = props.config.user;
const profileUrl = computed(() => `https://github.com/${encodeURIComponent(user)}`);

const label = e => {
  const k = 'ev.' + e.type, v = tr(k);
  return v === k ? e.type.replace('Event', '') : v;
};
const lvl = n => (n ? Math.min(4, Math.ceil(n / 3)) : 0);

async function fetchEvents() {
  const pages = await Promise.all([1, 2, 3].map(async page => {
    const r = await fetch(`${API}${encodeURIComponent(user)}/events/public?per_page=100&page=${page}`);
    if (!r.ok) throw new UserError(r.status === 404 ? tr('userNotFound') : `${tr('apiError')} (${r.status})`);
    return r.json();
  }));
  return pages.flat();
}

// Pinned repositories are not in the API: they are read from the profile page through the CORS proxy
async function fetchPinned() {
  let r = await fetch(`gh-profile/${encodeURIComponent(user)}`).catch(() => null); // Vite proxy (same origin)
  if (!r?.ok) r = await fetch(proxied(profileUrl.value)); // fallback: public CORS proxy (may be down)
  if (!r.ok) throw new Error('profile');
  const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
  return [...doc.querySelectorAll('.pinned-item-list-item')].map(card => {
    const link = card.querySelector('a[href]');
    if (!link) return null;
    const path = link.getAttribute('href');
    const title = card.querySelector('.Link--primary, h3 a, a span') || link;
    return {
      name: (title.textContent || path.split('/').filter(Boolean).pop()).trim(),
      url: new URL(path, 'https://github.com').href,
      description: card.querySelector('.pinned-item-desc')?.textContent.trim() || ''
    };
  }).filter(Boolean).slice(0, 6);
}

function build(events) {
  const day = d => new Date(d).toLocaleDateString('sv'), counts = {};
  events.forEach(e => {
    const key = day(e.created_at);
    counts[key] = (counts[key] || 0) + 1;
  });
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay() - 7 * 12);
  const out = [];
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = day(d);
    out.push({d: key, n: counts[key] || 0});
  }
  cells.value = out;
  total.value = events.length;
}

async function load() {
  try {
    const [activity, pinned] = await Promise.all([
      cached('gh-activity:' + user, TTL, fetchEvents),
      cached('gh-pinned:' + user, TTL, fetchPinned).catch(() => null) // repos failed: recent activity is shown instead
    ]);
    build(activity);
    repos.value = pinned || [];
    recent.value = activity.slice(0, 30);
  } catch (e) {
    err.value = e instanceof UserError ? e.message : tr('loadError');
  } finally {
    loading.value = false;
  }
}

load();
</script>

<template>
  <div class="gh">
    <header class="gh-head"><a :href="profileUrl" rel="noopener" target="_blank">@{{ user }}</a></header>
    <p v-if="err" class="gh-msg">{{ err }}</p>
    <p v-else-if="loading" class="gh-msg">{{ tr('loading') }}</p>
    <template v-else>
      <section class="gh-section gh-activity">
        <div class="gh-summary"><strong>{{ total }}</strong><span>{{ tr('last90Days') }}</span></div>
        <div class="gh-heat"><i v-for="c in cells" :key="c.d" :style="{ '--l': lvl(c.n) }"
                                :title="c.d + ': ' + c.n"></i></div>
      </section>
      <section class="gh-section gh-repos-panel">
        <div class="gh-repos-scroll">
          <div v-if="repos.length" class="gh-repos">
            <article v-for="repo in repos" :key="repo.url" class="gh-repo">
              <a :href="repo.url" rel="noopener" target="_blank">{{ repo.name }}</a>
              <p v-if="repo.description">{{ repo.description }}</p>
            </article>
          </div>
          <template v-else-if="recent.length">
            <p class="gh-sub">{{ tr('recent') }}</p>
            <ul class="gh-recent">
              <li v-for="e in recent" :key="e.id"><b>{{ label(e) }}</b><a :href="'https://github.com/' + e.repo.name"
                                                                          rel="noopener" target="_blank">{{
                  e.repo.name
                }}</a>
                <time>{{ ago(e.created_at) }}</time>
              </li>
            </ul>
          </template>
          <p v-else class="gh-sub">{{ tr('noPinned') }}</p>
        </div>
      </section>
    </template>
  </div>
</template>

<style>
.gh {
  height: 100%;
  box-sizing: border-box;
  padding: 16px 20px;
  overflow: hidden;
  display: grid;
  grid-template-columns:minmax(210px, auto) minmax(0, 1fr);
  grid-template-rows:auto minmax(0, 1fr);
  gap: 12px 24px;
  align-content: stretch
}

.gh-head {
  grid-column: 1/-1;
  min-width: 0
}

.gh-head a {
  color: var(--text);
  font: 500 18px var(--serif);
  text-decoration: none
}

.gh-head a:hover {
  color: var(--accent);
  text-decoration: underline
}

.gh-summary {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  column-gap: 6px;
  row-gap: 2px;
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.5
}

.gh-summary strong {
  color: var(--text);
  font-size: 14px;
  font-weight: 600
}

.gh-heat {
  display: grid;
  grid-template-rows:repeat(7, 11px);
  grid-auto-flow: column;
  grid-auto-columns: 11px;
  gap: 3px
}

.gh-heat i {
  border-radius: 3px;
  background: color-mix(in srgb, var(--accent) calc(var(--l) * 22%), var(--soft))
}

.gh-section {
  min-width: 0;
  min-height: 0
}

.gh-activity {
  align-self: start
}

.gh-repos-panel {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column
}

.gh-repos-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: 4px
}

.gh-repos {
  display: grid;
  grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));
  gap: 9px
}

.gh-repo {
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg)
}

.gh-repo a {
  color: var(--accent);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  overflow-wrap: anywhere
}

.gh-repo a:hover {
  text-decoration: underline
}

.gh-repo p {
  margin: 5px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.4
}

.gh-sub {
  display: block;
  color: var(--muted);
  font-size: 11px;
  font-weight: 400
}

.gh-msg {
  grid-column: 1/-1;
  margin: auto;
  color: var(--muted);
  text-align: center
}

@media (max-width: 620px) {
  .gh {
    grid-template-columns:1fr;
    grid-template-rows:auto auto minmax(0, 1fr);
    gap: 12px
  }

  .gh-head {
    grid-column: 1
  }

  .gh-heat {
    grid-auto-columns: 10px;
    grid-template-rows:repeat(7, 10px)
  }

  .gh-repos-panel {
    min-height: 0
  }

  .gh-repos {
    grid-template-columns:repeat(auto-fit, minmax(140px, 1fr))
  }
}

.gh-repos-scroll {
  --sb: color-mix(in srgb, var(--muted) 30%, transparent)
}

.gh-repos-scroll::-webkit-scrollbar {
  width: 10px
}

.gh-repos-scroll::-webkit-scrollbar-track {
  background: transparent
}

.gh-repos-scroll::-webkit-scrollbar-thumb {
  background: var(--sb);
  border: 3px solid transparent;
  border-radius: 10px;
  background-clip: content-box
}

.gh-repos-scroll::-webkit-scrollbar-thumb:hover {
  background: color-mix(in srgb, var(--muted) 55%, transparent);
  background-clip: content-box
}

@supports not selector(::-webkit-scrollbar) {
  .gh-repos-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--sb) transparent
  }
}

.gh-recent {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px
}

.gh-recent li {
  display: flex;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px solid var(--line)
}

.gh-recent a {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--accent);
  text-decoration: none
}

.gh-recent a:hover {
  text-decoration: underline
}

.gh-recent time {
  color: var(--muted)
}
</style>