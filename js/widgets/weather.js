// Clock + weather widget (Open-Meteo: free, no API key). Texts: weather/lang/<code>.js
const css = `
.wx{height:100%;padding:16px 24px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:28px;align-items:center}
.wx-time{font:500 clamp(40px,6vw,64px)/1 var(--serif);font-variant-numeric:tabular-nums}
.wx-date,.wx-place,.wx-sub{color:var(--muted);font-size:14px;margin-top:6px}
.wx-now{display:flex;align-items:center;gap:14px}.wx-ico{font-size:46px;line-height:1}.wx-temp{font:500 36px var(--serif)}.wx-sub{font-size:13px;margin-top:2px}
.wx-days{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:14px}
.wx-day{padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--bg);text-align:center;font-size:12px;color:var(--muted)}
.wx-day b{display:block;margin:2px 0;font-size:20px;font-weight:400;color:var(--text)}
.wx-msg{grid-column:1/-1;margin:auto;color:var(--muted)}
@media(max-width:620px){.wx{grid-template-columns:1fr;gap:12px;overflow-y:auto;align-content:start;padding:14px}.wx-time{font-size:44px}}`;

const KIND = c => c === 0 ? 'clear' : c <= 2 ? 'partly' : c === 3 ? 'overcast' : c <= 48 ? 'fog' : c <= 57 ? 'drizzle' : c <= 67 ? 'rain' : c <= 77 ? 'snow' : c <= 82 ? 'showers' : c <= 86 ? 'snow' : 'storm';
const ICON = { clear: '☀️', partly: '⛅', overcast: '☁️', fog: '🌫️', drizzle: '🌦️', rain: '🌧️', snow: '❄️', showers: '🌦️', storm: '⛈️' };
const fmt = (d, o, tz) => new Intl.DateTimeFormat(I18n.data.lang, { ...o, timeZone: tz }).format(d);

Widgets.define('weather', {
  props: ['config'],
  template: `<div class="wx">
    <p v-if="err" class="wx-msg">{{tr(err)}}</p>
    <template v-else>
      <div><div class="wx-time">{{time}}</div><div class="wx-date">{{date}}</div><div class="wx-place">{{place}}</div></div>
      <p v-if="!w" class="wx-msg">{{tr('loading')}}</p>
      <div v-else>
        <div class="wx-now"><span class="wx-ico">{{icon(w.current.weather_code)}}</span>
          <div><div class="wx-temp">{{Math.round(w.current.temperature_2m)}}°C</div>
            <div class="wx-sub">{{tr('wmo.'+kind(w.current.weather_code))}} · {{tr('feels')}} {{Math.round(w.current.apparent_temperature)}}°</div>
            <div class="wx-sub">{{tr('wind')}} {{Math.round(w.current.wind_speed_10m)}} {{tr('kmh')}} · {{w.current.relative_humidity_2m}}%</div></div></div>
        <div class="wx-days"><div class="wx-day" v-for="d in days" :key="d.k">{{d.name}}<b>{{d.ico}}</b>{{d.max}}° / {{d.min}}°</div></div>
      </div></template></div>`,
  data: () => ({ now: new Date(), tz: undefined, place: '', w: null, err: '' }),
  computed: {
    time() { return fmt(this.now, { hour: '2-digit', minute: '2-digit' }, this.tz); },
    date() { return fmt(this.now, { weekday: 'long', day: 'numeric', month: 'long' }, this.tz); },
    days() {
      const d = this.w.daily;
      return [1, 2, 3].map(i => ({ k: d.time[i], name: fmt(new Date(d.time[i] + 'T12:00:00Z'), { weekday: 'short' }, 'UTC'), ico: ICON[KIND(d.weather_code[i])], max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]) }));
    },
  },
  created() {
    this.load();
    this.t1 = setInterval(() => { this.now = new Date(); }, 1000);
    this.t2 = setInterval(() => this.geo && this.refresh().catch(() => {}), 9e5);
  },
  beforeUnmount() { clearInterval(this.t1); clearInterval(this.t2); },
  methods: {
    tr: (k, p) => I18n.wt('weather', k, p),
    kind: KIND, icon: c => ICON[KIND(c)],
    async load() {
      const loc = (this.config.location || '').trim(), k = 'wx:geo:' + loc.toLowerCase();
      try {
        let g = JSON.parse(localStorage.getItem(k) || 'null');
        if (!g) {
          const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc)}&count=1&language=${I18n.data.lang.split('-')[0]}`);
          const x = (await r.json()).results?.[0];
          if (!x) { this.err = 'notFound'; return; }
          g = { lat: x.latitude, lon: x.longitude, name: [x.name, x.country].filter(Boolean).join(', '), tz: x.timezone };
          localStorage.setItem(k, JSON.stringify(g));
        }
        this.geo = g; this.place = g.name; this.tz = g.tz;
        await this.refresh();
      } catch { this.err = 'loadError'; }
    },
    async refresh() { // cached for 10 min
      const g = this.geo, k = 'wx:data:' + g.lat + ',' + g.lon;
      let c = JSON.parse(localStorage.getItem(k) || 'null');
      if (!c || Date.now() - c.t > 6e5) {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${g.lat}&longitude=${g.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=4`);
        if (!r.ok) throw Error(r.status);
        c = { t: Date.now(), d: await r.json() }; localStorage.setItem(k, JSON.stringify(c));
      }
      this.w = c.d;
    },
  },
}, css);
