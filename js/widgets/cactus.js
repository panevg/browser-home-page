// Virtual cactus. It grows with real time (even while the page is closed); the hourly actions only speed it up.
// State lives in the widget config: planted (ms), bonus (hours of growth), last (action -> ms). Texts: cactus/lang/<code>.js
const css = `
.cx{height:100%;display:grid;grid-template-columns:minmax(0,190px) minmax(0,1fr);grid-template-rows:minmax(0,1fr);gap:24px;padding:14px 24px;align-items:center}
.cx-pic{height:100%;min-height:0}.cx-pic svg{width:100%;height:100%}
.cx h3{margin:0;font:500 22px var(--serif)}.cx-sub{margin:3px 0;color:var(--muted);font-size:13px}
.cx-bar{height:6px;margin:10px 0 12px;border-radius:6px;background:var(--soft);overflow:hidden}.cx-bar i{display:block;height:100%;background:var(--accent)}
.cx-acts{display:flex;flex-wrap:wrap;gap:8px}.cx-acts .btn:disabled{opacity:.5;cursor:default}.cx-acts small{color:var(--muted)}
.cx-hint{margin:10px 0 0;color:var(--muted);font-size:12px}
@media(max-width:620px){.cx{grid-template-columns:100px minmax(0,1fr);gap:12px;padding:12px}.cx-hint{display:none}}`;

const TH = [0, 1, 24, 72, 168, 336]; // growth hours at which each stage starts
const ACTS = [
  { k: "water", i: "💧", b: 0.25 },
  { k: "light", i: "☀️", b: 0.25 },
  { k: "feed", i: "🌱", b: 0.5 },
]; // bonus growth hours per action
const HOUR = 36e5; // each action can be used once per hour

Widgets.define(
  "cactus",
  {
    props: ["config"],
    template: `<div class="cx">
    <div class="cx-pic"><svg viewBox="0 0 120 140" aria-hidden="true">
      <g fill="none" stroke="#6f9d62" stroke-linecap="round" v-if="g>=1">
        <path v-if="g>=72" :d="'M60 '+ya+'H36V'+(ya-12-14*s)" stroke-width="12"/>
        <path v-if="g>=168" :d="'M60 '+yb+'H84V'+(yb-12-14*s)" stroke-width="12"/>
        <path :d="'M60 110V'+(110-h)" stroke-width="26"/>
        <path :d="'M54 108V'+(112-h)" stroke="#8cb87d" stroke-width="3"/>
      </g>
      <circle v-else cx="60" cy="108" r="4" fill="#8a6a4f"/>
      <g v-if="g>=336"><circle cx="60" :cy="94-h" r="9" fill="#e8739a"/><circle cx="60" :cy="94-h" r="3.5" fill="#f7d36b"/></g>
      <path d="M30 112h60l-6 24H36z" fill="var(--accent)"/><rect x="26" y="106" width="68" height="9" rx="3" fill="var(--accent-d)"/>
    </svg></div>
    <div>
      <h3>{{config.name||tr('defaultName')}}</h3>
      <div class="cx-sub">{{tr('stage.'+stage)}} · {{tr('size',{v:cm.toFixed(1)})}} · {{tr('age',age)}}</div>
      <div class="cx-bar"><i :style="{width:pct+'%'}"></i></div>
      <div class="cx-acts"><button class="btn" v-for="a in acts" :key="a.k" :disabled="left(a.k)>0" @click="act(a)">{{a.i}} {{tr(a.k)}}<small v-if="left(a.k)"> · {{tr('inMin',{m:left(a.k)})}}</small></button></div>
      <p class="cx-hint">{{tr('hint')}}</p>
    </div></div>`,
    data: () => ({ now: Date.now(), acts: ACTS }),
    computed: {
      g() {
        return Math.max(
          0,
          (this.now - this.config.planted) / HOUR + this.config.bonus
        );
      }, // growth in hours
      cm() {
        return 0.5 + 45 * (1 - Math.exp(-this.g / 200));
      },
      s() {
        return Math.min(1, this.cm / 36);
      },
      h() {
        return 6 + 62 * this.s;
      },
      ya() {
        return 110 - this.h * 0.45;
      },
      yb() {
        return 110 - this.h * 0.62;
      },
      stage() {
        return TH.reduce((st, t, i) => (this.g >= t ? i : st), 0);
      },
      pct() {
        const i = this.stage;
        return i >= TH.length - 1
          ? 100
          : Math.round((100 * (this.g - TH[i])) / (TH[i + 1] - TH[i]));
      },
      age() {
        const hrs = Math.floor((this.now - this.config.planted) / HOUR);
        return { d: Math.floor(hrs / 24), h: hrs % 24 };
      },
    },
    created() {
      const c = this.config;
      c.planted ||= Date.now();
      c.bonus ||= 0;
      c.last ||= {};
      this.t = setInterval(() => {
        this.now = Date.now();
      }, 2e4);
    },
    beforeUnmount() {
      clearInterval(this.t);
    },
    methods: {
      tr: (k, p) => I18n.wt("cactus", k, p),
      left(k) {
        return Math.max(
          0,
          Math.ceil((HOUR - (this.now - (this.config.last[k] || 0))) / 6e4)
        );
      }, // minutes until the action is ready
      act(a) {
        if (this.left(a.k)) return;
        this.config.last[a.k] = Date.now();
        this.config.bonus += a.b;
        this.now = Date.now();
      },
    },
  },
  css
);
