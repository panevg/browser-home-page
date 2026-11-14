<script setup>
// Exchange rates (open.er-api.com, no key, cached 1 h) with a small converter. Texts: ./lang/<code>.js
import {computed, ref} from 'vue';
import {data, wt} from '@/i18n';
import {cached} from '@/utils/cache';

const props = defineProps({config: {type: Object, required: true}});
const tr = (k, p) => wt('rates', k, p);

const amount = ref(1), rates = ref(null), updated = ref(''), err = ref('');

const base = computed(() => (props.config.base || '').trim().toUpperCase());
const targets = computed(() => (props.config.targets || '').toUpperCase().split(/[\s,;]+/).filter(Boolean));
const rows = computed(() => {
  if (!rates.value) return [];
  const nf = new Intl.NumberFormat(data.lang, {maximumFractionDigits: 4});
  return targets.value.filter(c => rates.value[c]).map(c => ({
    c,
    v: nf.format((Number(amount.value) || 0) * rates.value[c])
  }));
});

async function load() {
  if (!base.value) {
    err.value = 'loadError';
    return;
  }
  try {
    const c = await cached('fx:' + base.value, 36e5, async () => {
      const r = await fetch('https://open.er-api.com/v6/latest/' + encodeURIComponent(base.value));
      const j = await r.json();
      if (j.result !== 'success') throw new Error('rates: ' + j['error-type']);
      return {rates: j.rates, u: j.time_last_update_unix};
    });
    rates.value = c.rates;
    updated.value = new Date(c.u * 1000).toLocaleDateString(data.lang);
    if (!targets.value.some(x => rates.value[x])) err.value = 'noRates';
  } catch {
    err.value = 'loadError';
  }
}

load();
</script>

<template>
  <div class="fx">
    <p v-if="err" class="fx-msg">{{ tr(err) }}</p>
    <p v-else-if="!rows.length" class="fx-msg">{{ tr('loading') }}</p>
    <template v-else>
      <div class="fx-top"><label class="fx-amt"><input v-model.number="amount" min="0" step="any" type="number"><b>{{
          base
        }}</b></label><small>{{ tr('updated', {date: updated}) }}</small></div>
      <div class="fx-list scroll">
        <div v-for="r in rows" :key="r.c" class="fx-row"><span>{{ r.c }}</span><b>{{ r.v }}</b></div>
      </div>
    </template>
  </div>
</template>

<style>
.fx {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px
}

.fx-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap
}

.fx-top small, .fx-msg {
  color: var(--muted)
}

.fx-amt {
  display: flex;
  align-items: center;
  gap: 8px
}

.fx-amt input {
  width: 120px;
  padding: 8px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  outline: 0;
  font-size: 16px
}

.fx-amt input:focus {
  border-color: var(--accent)
}

.fx-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
  align-content: start
}

.fx-row {
  display: flex;
  flex-direction: column;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg)
}

.fx-row span {
  color: var(--muted);
  font-size: 12px
}

.fx-row b {
  font: 500 18px var(--serif)
}

.fx-msg {
  margin: auto
}
</style>