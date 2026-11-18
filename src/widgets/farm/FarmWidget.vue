<script setup>
// Farm mini game on a canvas. Rules: ./game.js, geometry: ./layout.js, drawing: ./render.js.
// State: config.farm (saved with the widget on every change). Texts: ./lang/<code>.js
import {computed, onBeforeUnmount, onMounted, reactive, ref} from 'vue';
import {wt} from '@/i18n';
import * as G from './game';
import {hit, layout} from './layout';
import {draw, readColors} from './render';

const props = defineProps({config: {type: Object, required: true}});
const tr = (k, p) => wt('farm', k, p);

// Defaults are set before the first render (never replace `config` itself, only mutate it)
const f = reactive(G.normalize(props.config.farm));
props.config.farm = f;

const now = ref(Date.now()), sel = ref('chicken'), msg = ref('');
let msgTimer;

function say(key, p) {
  msg.value = tr(key, p);
  clearTimeout(msgTimer);
  msgTimer = setTimeout(() => (msg.value = ''), 5000);
}

const welcome = G.tick(f, Date.now()); // coins that arrived while the page was closed
if (welcome) say('paid', {n: welcome});

const inc = computed(() => G.income(f.level));
const list = computed(() => G.SPECIES.map(s => ({key: s.key, price: G.priceOf(s.key, f.level), locked: f.level < s.unlock, unlock: s.unlock})));
const quota = computed(() => G.quotaOf(f.level).map(q => ({...q, done: Math.min(q.n, f.sold[q.s] || 0)})));
const next = computed(() => {
  const s = Math.ceil(G.nextPayoutMs(f, now.value) / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
});

// ---- Canvas ----
const wrap = ref(null), cv = ref(null);
const size = {w: 600, h: 200};
let ctx = null, dpr = 1, timer, observer, lastSec = 0;

function frame() {
  if (!ctx || document.hidden) return;
  const t = Date.now();
  if (Math.floor(t / 1000) !== lastSec) { // once a second: header numbers and the hourly payout
    lastSec = Math.floor(t / 1000);
    now.value = t;
    const gain = G.tick(f, t);
    if (gain) say('paid', {n: gain});
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw(ctx, size.w, size.h, f, t, readColors(cv.value), layout(size.w, size.h, f.pens.length));
}

function resize() {
  size.w = wrap.value?.clientWidth || 600;
  size.h = wrap.value?.clientHeight || 200;
  dpr = window.devicePixelRatio || 1;
  cv.value.width = Math.round(size.w * dpr);
  cv.value.height = Math.round(size.h * dpr);
  frame();
}

onMounted(() => {
  ctx = cv.value.getContext?.('2d') ?? null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(resize);
    observer.observe(wrap.value);
  }
  resize();
  timer = setInterval(frame, 100);
});
onBeforeUnmount(() => {
  clearInterval(timer);
  clearTimeout(msgTimer);
  observer?.disconnect();
});

// ---- Clicks: empty slot = buy the selected animal, grown animal = sell it, "+" tile = build a pen ----
function onClick(e) {
  const box = cv.value.getBoundingClientRect();
  const x = (e.clientX - box.left) * (size.w / (box.width || size.w)), y = (e.clientY - box.top) * (size.h / (box.height || size.h));
  const h = hit(layout(size.w, size.h, f.pens.length), x, y);
  if (!h) return;

  if (h.kind === 'add') {
    const r = G.buildPen(f);
    return say(r.ok ? 'built' : r.error === 'max' ? 'maxPens' : 'needCoins', {n: r.cost});
  }
  if (f.pens[h.pen][h.slot]) {
    const s = G.sell(f, h.pen, h.slot, Date.now());
    if (s.error) return say('growing', {m: Math.ceil(s.left / 6e4)});
    const p = Math.round((G.priceMult(f.level) - 1) * 100); // total price increase in %
    return say(s.tierUp ? 'tierUp' : s.levelUp ? 'levelUp' : 'sold', {n: s.gain, level: f.level, inc: inc.value, p});
  }
  const b = G.buy(f, sel.value, h.pen, h.slot, Date.now());
  if (b.ok) return say(b.lucky ? 'lucky' : 'bought', {n: b.cost});
  say(b.error === 'locked' ? 'locked' : 'needCoins', {n: b.cost, level: b.level});
}
</script>

<template>
  <div class="fm">
    <div class="fm-top">
      <b>{{ tr('coins', {n: f.coins}) }}</b>
      <span>{{ tr('level', {n: f.level}) }}</span>
      <span>{{ tr('income', {n: inc}) }}</span>
      <span class="fm-muted">{{ tr('next', {t: next}) }}</span>
    </div>
    <div class="fm-top">
      <span class="fm-muted">{{ tr('quota') }}:</span>
      <span v-for="q in quota" :key="q.s" :class="{ done: q.done >= q.n }">{{ tr('sp.' + q.s) }} {{ q.done }}/{{ q.n }}</span>
    </div>
    <div class="fm-pick">
      <button v-for="s in list" :key="s.key" :class="['btn', { on: sel === s.key }]" :disabled="s.locked"
              :title="s.locked ? tr('locked', {level: s.unlock}) : ''" type="button" @click="sel = s.key">
        {{ tr('sp.' + s.key) }} · {{ s.price }}
      </button>
      <span class="fm-msg">{{ msg || tr('hint') }}</span>
    </div>
    <div ref="wrap" class="fm-cv"><canvas ref="cv" @click="onClick"></canvas></div>
  </div>
</template>

<style>
.fm {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  overflow-y: auto
}

.fm-top {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 14px;
  font-size: 13px
}

.fm-top b {
  font: 500 16px var(--serif)
}

.fm-top .done {
  color: #4a9a66
}

.fm-muted {
  color: var(--muted)
}

.fm-pick {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px
}

.fm-pick .btn {
  padding: 4px 10px;
  font-size: 13px
}

.fm-pick .btn.on {
  border-color: var(--accent);
  color: var(--accent)
}

.fm-msg {
  flex: 1;
  min-width: 160px;
  color: var(--muted);
  font-size: 12px
}

.fm-cv {
  position: relative;
  flex: 1;
  min-height: 140px
}

.fm-cv canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: 10px;
  cursor: pointer
}
</style>
