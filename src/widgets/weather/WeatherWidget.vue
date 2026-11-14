<script setup>
// Clock + weather widget (Open-Meteo: free, no API key). Texts: ./lang/<code>.js
import { computed, onBeforeUnmount, ref } from 'vue';
import { data, wt } from '@/i18n';
import { cached } from '@/utils/cache';

const props = defineProps({ config: { type: Object, required: true } });
const tr = (k, p) => wt('weather', k, p);

const KIND = c => c === 0 ? 'clear' : c <= 2 ? 'partly' : c === 3 ? 'overcast' : c <= 48 ? 'fog' : c <= 57 ? 'drizzle' : c <= 67 ? 'rain' : c <= 77 ? 'snow' : c <= 82 ? 'showers' : c <= 86 ? 'snow' : 'storm';
const ICON = { clear: '☀️', partly: '⛅', overcast: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', snow: '❄️', showers: '🌦️', storm: '⛈️' };
const icon = c => ICON[KIND(c)];
const fmt = (d, o, tz) => new Intl.DateTimeFormat(data.lang, { ...o, timeZone: tz }).format(d);

class NotFound extends Error {}

const now = ref(new Date()), tz = ref(undefined), place = ref(''), w = ref(null), err = ref('');
let geo = null;

const time = computed(() => fmt(now.value, { hour: '2-digit', minute: '2-digit' }, tz.value));
const date = computed(() => fmt(now.value, { weekday: 'long', day: 'numeric', month: 'long' }, tz.value));
const days = computed(() => {
  const d = w.value.daily;
  return [1, 2, 3].map(i => ({
    k: d.time[i],
    name: fmt(new Date(d.time[i] + 'T12:00:00Z'), { weekday: 'short' }, 'UTC'),
    ico: icon(d.weather_code[i]),
    max: Math.round(d.temperature_2m_max[i]),
    min: Math.round(d.temperature_2m_min[i]),
  }));
});

async function refresh() { // cached for 10 min
  const g = geo;
  w.value = await cached(`wx:data:${g.lat},${g.lon}`, 6e5, async () => {
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  });
}

async function load() {
  const loc = (props.config.location || '').trim(), lang = data.lang.split('-')[0];
  try {
    geo = await cached(`wx:geo:${lang}:${loc.toLowerCase()}`, Infinity, async () => { // a place never moves: cached forever
      const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=${lang}`);
      const x = (await r.json()).results?.[0];
      if (!x) throw new NotFound();
      return { lat: x.latitude, lon: x.longitude, name: [x.name, x.country].filter(Boolean).join(', '), tz: x.timezone };
    });
    place.value = geo.name;
    tz.value = geo.tz;
    await refresh();
  } catch (e) {
    err.value = e instanceof NotFound ? 'notFound' : 'loadError';
  }
}
load();

const t1 = setInterval(() => { now.value = new Date(); }, 1000);
const t2 = setInterval(() => { if (geo) refresh().catch(() => {}); }, 9e5);
onBeforeUnmount(() => { clearInterval(t1); clearInterval(t2); });
</script>

<template>
  <div class="wx">
    <p v-if="err" class="wx-msg">{{ tr(err) }}</p>
    <template v-else>
      <div><div class="wx-time">{{ time }}</div><div class="wx-date">{{ date }}</div><div class="wx-place">{{ place }}</div></div>
      <p v-if="!w" class="wx-msg">{{ tr('loading') }}</p>
      <div v-else>
        <div class="wx-now"><span class="wx-ico">{{ icon(w.current.weather_code) }}</span>
          <div><div class="wx-temp">{{ Math.round(w.current.temperature_2m) }}°C</div>
            <div class="wx-sub">{{ tr('wmo.' + KIND(w.current.weather_code)) }} · {{ tr('feels') }} {{ Math.round(w.current.apparent_temperature) }}°</div>
            <div class="wx-sub">{{ tr('wind') }} {{ Math.round(w.current.wind_speed_10m) }} {{ tr('kmh') }} · {{ w.current.relative_humidity_2m }}%</div></div></div>
        <div class="wx-days"><div class="wx-day" v-for="d in days" :key="d.k">{{ d.name }}<b>{{ d.ico }}</b>{{ d.max }}° / {{ d.min }}°</div></div>
      </div>
    </template>
  </div>
</template>

<style>
.wx{height:100%;padding:16px 24px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:28px;align-items:center}
.wx-time{font:500 clamp(40px,6vw,64px)/1 var(--serif);font-variant-numeric:tabular-nums}
.wx-date,.wx-place,.wx-sub{color:var(--muted);font-size:14px;margin-top:6px}
.wx-now{display:flex;align-items:center;gap:14px}.wx-ico{font-size:46px;line-height:1}.wx-temp{font:500 36px var(--serif)}.wx-sub{font-size:13px;margin-top:2px}
.wx-days{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.wx-day{padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--bg);text-align:center;font-size:12px;color:var(--muted)}
.wx-day b{display:block;margin:2px 0;font-size:20px;font-weight:400;color:var(--text)}
.wx-msg{grid-column:1/-1;margin:auto;color:var(--muted)}
@media(max-width:620px){.wx{grid-template-columns:1fr;gap:12px;overflow-y:auto;align-content:start;padding:14px}.wx-time{font-size:44px}}
</style>
