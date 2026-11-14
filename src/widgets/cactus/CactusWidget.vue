<script setup>
// Virtual cactus. It grows with real time (even while the page is closed); the hourly actions only speed it up.
// State lives in the widget config: planted (ms), bonus (hours of growth), last (action -> ms). Texts: ./lang/<code>.js
import { computed, onBeforeUnmount, ref } from 'vue';
import { wt } from '@/i18n';

const props = defineProps({ config: { type: Object, required: true } });

const TH = [0, 1, 24, 72, 168, 336]; // growth hours at which each stage starts
// Action icons: 24x24 outline paths, same stroke style as the settings icon. `b` = bonus growth hours per action
const acts = [
  { k: 'water', b: 0.25, i: ['M12 3.5c3 3.8 5.5 6.6 5.5 9.9a5.5 5.5 0 0 1-11 0c0-3.3 2.5-6.1 5.5-9.9Z'] },
  { k: 'light', b: 0.25, i: ['M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z', 'M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6'] },
  { k: 'feed', b: 0.5, i: ['M12 21v-8.5', 'M12 12.5C12 9 9.5 6.8 5.5 6.8c0 3.6 2.4 5.7 6.5 5.7Z', 'M12 14c0-3.2 2.2-5.2 6.5-5.2 0 3.4-2.3 5.2-6.5 5.2Z', 'M8 21h8'] },
];
const HOUR = 36e5; // each action can be used once per hour

const tr = (k, p) => wt('cactus', k, p);

// Defaults are set before the first render (never replace `config` itself, only mutate it)
const c = props.config;
c.planted ||= Date.now();
c.bonus ||= 0;
c.last ||= {};

const now = ref(Date.now());
const timer = setInterval(() => { now.value = Date.now(); }, 2e4);
onBeforeUnmount(() => clearInterval(timer));

const g = computed(() => Math.max(0, (now.value - c.planted) / HOUR + c.bonus)); // growth in hours
const cm = computed(() => 0.5 + 45 * (1 - Math.exp(-g.value / 200)));
const s = computed(() => Math.min(1, cm.value / 36));
const h = computed(() => 6 + 62 * s.value);
const ya = computed(() => 110 - h.value * 0.45);
const yb = computed(() => 110 - h.value * 0.62);
const stage = computed(() => TH.reduce((st, t, i) => (g.value >= t ? i : st), 0));
const pct = computed(() => { const i = stage.value; return i >= TH.length - 1 ? 100 : Math.round(100 * (g.value - TH[i]) / (TH[i + 1] - TH[i])); });
const age = computed(() => { const hrs = Math.floor((now.value - c.planted) / HOUR); return { d: Math.floor(hrs / 24), h: hrs % 24 }; });

// minutes until the action is ready
const left = k => Math.max(0, Math.ceil((HOUR - (now.value - (c.last[k] || 0))) / 6e4));
function act(a) {
  if (left(a.k)) return;
  c.last[a.k] = Date.now();
  c.bonus += a.b;
  now.value = Date.now();
}
</script>

<template>
  <div class="cx">
    <div class="cx-pic"><svg viewBox="0 0 120 140" aria-hidden="true">
      <g fill="none" stroke="#6f9d62" stroke-linecap="round" v-if="g >= 1">
        <path v-if="g >= 72" :d="'M60 ' + ya + 'H36V' + (ya - 12 - 14 * s)" stroke-width="12"/>
        <path v-if="g >= 168" :d="'M60 ' + yb + 'H84V' + (yb - 12 - 14 * s)" stroke-width="12"/>
        <path :d="'M60 110V' + (110 - h)" stroke-width="26"/>
        <path :d="'M54 108V' + (112 - h)" stroke="#8cb87d" stroke-width="3"/>
      </g>
      <circle v-else cx="60" cy="108" r="4" fill="#8a6a4f"/>
      <g v-if="g >= 336"><circle cx="60" :cy="94 - h" r="9" fill="#e8739a"/><circle cx="60" :cy="94 - h" r="3.5" fill="#f7d36b"/></g>
      <path d="M30 112h60l-6 24H36z" fill="var(--accent)"/><rect x="26" y="106" width="68" height="9" rx="3" fill="var(--accent-d)"/>
    </svg></div>
    <div>
      <h3>{{ config.name || tr('defaultName') }}</h3>
      <div class="cx-sub">{{ tr('stage.' + stage) }} · {{ tr('size', { v: cm.toFixed(1) }) }} · {{ tr('age', age) }}</div>
      <div class="cx-bar"><i :style="{ width: pct + '%' }"></i></div>
      <div class="cx-acts">
        <button v-for="a in acts" :key="a.k" type="button" class="btn" :disabled="left(a.k) > 0" @click="act(a)"><svg class="cx-ic" viewBox="0 0 24 24" aria-hidden="true"><path v-for="d in a.i" :key="d" :d="d"/></svg>{{ tr(a.k) }}<small v-if="left(a.k)"> · {{ tr('inMin', { m: left(a.k) }) }}</small></button>
      </div>
      <p class="cx-hint">{{ tr('hint') }}</p>
    </div>
  </div>
</template>

<style>
.cx{height:100%;display:grid;grid-template-columns:minmax(0,190px) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:24px;padding:14px 24px;align-items:center}
.cx-pic{height:100%;min-height:0}.cx-pic svg{width:100%;height:100%}
.cx h3{margin:0;font:500 22px var(--serif)}.cx-sub{margin:3px 0;color:var(--muted);font-size:13px}
.cx-bar{height:6px;margin:10px 0 12px;border-radius:6px;background:var(--soft);overflow:hidden}.cx-bar i{display:block;height:100%;background:var(--accent)}
.cx-acts{display:flex;flex-wrap:wrap;gap:8px}.cx-acts .btn{display:inline-flex;align-items:center;gap:7px}
.cx-ic{width:17px;height:17px;flex:none;fill:none;stroke:currentColor;stroke-width:1.65;stroke-linecap:round;stroke-linejoin:round}.cx-acts .btn:disabled{opacity:.5;cursor:default}.cx-acts small{color:var(--muted)}
.cx-hint{margin:10px 0 0;color:var(--muted);font-size:12px}
@media(max-width:620px){.cx{grid-template-columns:100px minmax(0,1fr);gap:12px;padding:12px}.cx-hint{display:none}}
</style>
