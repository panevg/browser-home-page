<script setup>
// Month calendar (week starts on Monday). Texts: ./lang/<code>.js
import {computed, onBeforeUnmount, ref} from 'vue';
import {data, wt} from '@/i18n';

defineProps({config: {type: Object, required: true}});

const tr = (k, p) => wt('calendar', k, p);
const fmt = (d, o) => new Intl.DateTimeFormat(data.lang, o).format(d);

const off = ref(0); // month offset from the current one
const today = ref(new Date());
const timer = setInterval(() => {
  today.value = new Date();
}, 6e4);
onBeforeUnmount(() => clearInterval(timer));

const base = computed(() => new Date(today.value.getFullYear(), today.value.getMonth() + off.value, 1));
const title = computed(() => fmt(base.value, {month: 'long', year: 'numeric'}).replace(/^./, c => c.toUpperCase()));
const names = computed(() => Array.from({length: 7}, (_, i) => fmt(new Date(2024, 0, 1 + i), {weekday: 'short'}))); // 2024-01-01 is a Monday
const cells = computed(() => {
  const y = base.value.getFullYear(), m = base.value.getMonth(), lead = (base.value.getDay() + 6) % 7, t = today.value,
      out = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, 1 - lead + i);
    out.push({k: +d, n: d.getDate(), out: d.getMonth() !== m, now: d.toDateString() === t.toDateString()});
  }
  return out;
});
</script>

<template>
  <div class="cal">
    <div class="cal-today">
      <div class="cal-num">{{ today.getDate() }}</div>
      <div>{{ fmt(today, {weekday: 'long'}) }}</div>
      <div class="cal-muted">{{ fmt(today, {month: 'long', year: 'numeric'}) }}</div>
    </div>
    <div class="cal-main">
      <div class="cal-nav">
        <button class="icon-btn" type="button" @click="off--">‹</button>
        <b :title="tr('today')" @click="off = 0">{{ title }}</b>
        <button class="icon-btn" type="button" @click="off++">›</button>
      </div>
      <div class="cal-grid"><span v-for="n in names" :key="n" class="cal-h">{{ n }}</span>
        <span v-for="c in cells" :key="c.k" :class="['cal-d', { out: c.out, now: c.now }]"><i>{{ c.n }}</i></span></div>
    </div>
  </div>
</template>

<style>
.cal {
  height: 100%;
  display: grid;
  grid-template-columns:200px minmax(0, 1fr);
  gap: 24px;
  padding: 16px 20px
}

.cal-today {
  display: flex;
  flex-direction: column;
  justify-content: center
}

.cal-num {
  font: 500 64px/1 var(--serif);
  color: var(--accent)
}

.cal-muted {
  color: var(--muted)
}

.cal-main {
  display: flex;
  flex-direction: column;
  min-height: 0
}

.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px
}

.cal-nav b {
  font: 500 16px var(--serif);
  cursor: pointer
}

.cal-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns:repeat(7, 1fr);
  grid-template-rows:auto repeat(6, minmax(0, 1fr));
  text-align: center;
  font-size: 13px
}

.cal-grid > span {
  display: grid;
  place-items: center
}

.cal-h {
  color: var(--muted);
  font-size: 12px
}

.cal-d i {
  font-style: normal;
  min-width: 26px;
  line-height: 26px;
  border-radius: 50%
}

.cal-d.out {
  color: var(--muted);
  opacity: .45
}

.cal-d.now i {
  background: var(--accent);
  color: #fff
}

@media (max-width: 620px) {
  .cal {
    grid-template-columns:1fr;
    padding: 12px
  }

  .cal-today {
    display: none
  }
}
</style>