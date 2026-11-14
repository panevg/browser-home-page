<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { state } from '@/state';
import { t, data } from '@/i18n';
import { ENGINES } from '@/config/engines';
import { icon } from '@/utils/misc';

const q = ref(''), sugg = ref([]), sel = ref(-1), menu = ref(false);
const engine = computed(() => ENGINES[state.engine] || ENGINES[0]);
let timer, ctl, typed = '';

// DuckDuckGo autocomplete, debounced; a newer keystroke cancels the request in flight
function onInput() {
  sel.value = -1;
  typed = q.value;
  clearTimeout(timer);
  ctl?.abort();
  if (!typed.trim()) { sugg.value = []; return; }
  timer = setTimeout(async () => {
    ctl = new AbortController();
    try {
      const r = await fetch('ddg-ac/ac/?type=list&q=' + encodeURIComponent(typed), { signal: ctl.signal });
      const j = await r.json();
      sugg.value = Array.isArray(j?.[1]) ? j[1] : [];
    } catch {}
  }, 120);
}

function move(d) {
  const n = sugg.value.length;
  if (!n) return;
  const i = (sel.value + 1 + d + n + 1) % (n + 1); // 0 = typed text, 1..n = suggestions
  sel.value = i - 1;
  q.value = i ? sugg.value[i - 1] : typed;
}

function go(e) {
  if (e?.isComposing) return; // Enter that confirms an IME composition is not a search
  const text = q.value.trim();
  if (!text) return;
  location.href = /^https?:\/\//i.test(text)
    ? text
    : engine.value.url.replace('%l', data.lang.split('-')[0]).replace('%s', encodeURIComponent(text));
}

function pick(s) { q.value = s; go(); }
function pickEngine(i) { state.engine = i; menu.value = false; }
function closeMenus() { menu.value = false; sugg.value = []; }

const onKey = e => { if (e.key === 'Escape') closeMenus(); };
const onClick = e => { if (!e.target.closest('.search-box')) closeMenus(); };
onMounted(() => { addEventListener('keydown', onKey); addEventListener('click', onClick); });
onUnmounted(() => { removeEventListener('keydown', onKey); removeEventListener('click', onClick); clearTimeout(timer); ctl?.abort(); });
</script>

<template>
  <section class="search">
    <h1>{{ t('searchTitle') }}</h1>
    <div class="search-box">
      <button class="engine-btn" type="button" :title="engine.name" @click="menu = !menu"><img :src="icon(engine.host)" alt=""><span>▾</span></button>
      <input
        v-model="q" :placeholder="t('search') + ': ' + engine.name" autofocus autocomplete="off" spellcheck="false"
        @input="onInput" @keydown.down.prevent="move(1)" @keydown.up.prevent="move(-1)" @keydown.enter="go"
      >
      <ul v-if="menu" class="menu engines">
        <li v-for="(e, i) in ENGINES" :key="e.name" :class="{ on: i === state.engine }" @click="pickEngine(i)"><img :src="icon(e.host)" alt="">{{ e.name }}</li>
      </ul>
      <ul v-if="sugg.length" class="menu">
        <li v-for="(s, i) in sugg" :key="s" :class="{ on: i === sel }" @mousedown.prevent="pick(s)">{{ s }}</li>
      </ul>
    </div>
  </section>
</template>
