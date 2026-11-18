<script setup>
import {ref, computed, onMounted, onUnmounted} from 'vue';
import {state} from '@/state';
import {t, data} from '@/i18n';
import {ENGINES} from '@/config/engines';
import {icon, matchBookmarks} from '@/utils/misc';
import {matchHistory} from '@/utils/history';
import {forget, history, record} from '@/history';

const q = ref(''), typed = ref(''), sugg = ref([]), sel = ref(-1), menu = ref(false), open = ref(false),
    input = ref(null);
const engine = computed(() => ENGINES[state.engine] || ENGINES[0]);
const opts = computed(() => state.settings.search);
let timer, ctl;

// Dropdown rows, in this order: matching bookmarks, then the search history, then the search suggestions.
// History is matched locally and shown at once (it works offline); a suggestion that is already in the history is not repeated.
const items = computed(() => {
  if (!open.value) return [];
  const bms = opts.value.bookmarkSuggestions ? matchBookmarks(state.bookmarks, typed.value, 3) : [];
  const past = opts.value.history ? matchHistory(history, typed.value, 4) : [];
  const seen = new Set(past.map(h => h.q.toLowerCase()));
  return [
    ...bms.map(b => ({bookmark: b, key: 'b' + b.id})),
    ...past.map(h => ({text: h.q, history: true, key: 'h' + h.q})),
    ...sugg.value.filter(s => !seen.has(s.toLowerCase())).map(s => ({text: s, key: 's' + s}))
  ];
});

// DuckDuckGo autocomplete, debounced; a newer keystroke cancels the request in flight
function onInput() {
  sel.value = -1;
  typed.value = q.value;
  open.value = !!typed.value.trim();
  clearTimeout(timer);
  ctl?.abort();
  if (!opts.value.suggestions || !typed.value.trim()) {
    sugg.value = [];
    return;
  }
  const text = typed.value;
  timer = setTimeout(async () => {
    ctl = new AbortController();
    try {
      const r = await fetch('ddg-ac/ac/?type=list&q=' + encodeURIComponent(text), {signal: ctl.signal});
      const j = await r.json();
      sugg.value = Array.isArray(j?.[1]) ? j[1].slice(0, opts.value.suggestionsMax) : [];
    } catch {
    }
  }, 120);
}

function move(d) {
  const n = items.value.length;
  if (!n) return;
  const i = (sel.value + 1 + d + n + 1) % (n + 1); // 0 = typed text, 1..n = rows
  sel.value = i - 1;
  const it = items.value[i - 1];
  q.value = it?.text ?? typed.value; // a bookmark row does not replace the text: Enter opens it
}

function navigate(url) {
  closeMenus();
  if (opts.value.openIn === 'blank') window.open(url, '_blank', 'noopener');
  else location.href = url;
}

function go(e) {
  if (e?.isComposing) return; // Enter that confirms an IME composition is not a search
  const it = items.value[sel.value];
  if (it?.bookmark) return navigate(it.bookmark.url);
  const text = q.value.trim();
  if (!text) return;
  const direct = opts.value.directUrls && /^https?:\/\//i.test(text);
  if (!direct) record(text); // only real searches are remembered, never opened addresses
  navigate(direct ? text : engine.value.url.replace('%l', data.lang.split('-')[0]).replace('%s', encodeURIComponent(text)));
}

// Shift+Delete removes the selected history row (the Firefox convention)
function onDelete(e) {
  const it = items.value[sel.value];
  if (!e.shiftKey || !it?.history) return;
  e.preventDefault();
  forget(it.text);
  sel.value = -1;
}

function pick(it) {
  if (it.bookmark) return navigate(it.bookmark.url);
  q.value = it.text;
  go();
}

function pickEngine(i) {
  state.engine = i;
  menu.value = false;
}

function closeMenus() {
  menu.value = false;
  open.value = false;
  sugg.value = [];
}

const onKey = e => {
  if (e.key === 'Escape') closeMenus();
};
const onClick = e => {
  if (!e.target.closest('.search-box')) closeMenus();
};
onMounted(() => {
  if (opts.value.autofocus) input.value?.focus();
  addEventListener('keydown', onKey);
  addEventListener('click', onClick);
});
onUnmounted(() => {
  removeEventListener('keydown', onKey);
  removeEventListener('click', onClick);
  clearTimeout(timer);
  ctl?.abort();
});
</script>

<template>
  <section class="search">
    <h1>{{ t('searchTitle') }}</h1>
    <div class="search-box">
      <button :title="engine.name" class="engine-btn" type="button" @click="menu = !menu"><img :src="icon(engine.host)"
                                                                                               alt=""><span>▾</span>
      </button>
      <input
          ref="input" v-model="q" :placeholder="t('search') + ': ' + engine.name" autocomplete="off" spellcheck="false"
          @input="onInput" @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter="go" @keydown.delete="onDelete"
      >
      <ul v-if="menu" class="menu engines">
        <li v-for="(e, i) in ENGINES" :key="e.name" :class="{ on: i === state.engine }" @click="pickEngine(i)"><img
            :src="icon(e.host)" alt="">{{ e.name }}
        </li>
      </ul>
      <ul v-if="items.length" class="menu">
        <li v-for="(it, i) in items" :key="it.key" :class="{ on: i === sel, bm: !!it.bookmark, hist: !!it.history }"
            @mousedown.prevent="pick(it)">
          <template v-if="it.bookmark">
            <img :src="icon(it.bookmark.host)" alt="">
            <span class="t">{{ it.bookmark.title }}<small>{{ it.bookmark.host }}</small></span>
            <svg aria-hidden="true" class="bm-ic" viewBox="0 0 24 24">
              <path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4.2L6 21V4.5Z"/>
            </svg>
          </template>
          <template v-else-if="it.history">
            <svg aria-hidden="true" class="hist-ic" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="8.5"/>
              <path d="M12 7.5V12l3 2"/>
            </svg>
            <span class="t">{{ it.text }}</span>
            <button :aria-label="t('forget')" :title="t('forget')" class="hist-x" tabindex="-1" type="button" @mousedown.prevent.stop="forget(it.text)">×</button>
          </template>
          <template v-else>{{ it.text }}</template>
        </li>
      </ul>
    </div>
  </section>
</template>