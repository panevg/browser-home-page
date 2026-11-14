// Exchange rates (open.er-api.com, no key, cached 1 h) with a small converter. Texts: rates/lang/<code>.js
const css = `
.fx{height:100%;display:flex;flex-direction:column;gap:10px;padding:16px 20px}
.fx-top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.fx-top small,.fx-msg{color:var(--muted)}
.fx-amt{display:flex;align-items:center;gap:8px}
.fx-amt input{width:120px;padding:8px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);outline:0;font-size:16px}
.fx-amt input:focus{border-color:var(--accent)}
.fx-list{flex:1;min-height:0;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;align-content:start}
.fx-row{display:flex;flex-direction:column;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg)}
.fx-row span{color:var(--muted);font-size:12px}.fx-row b{font:500 18px var(--serif)}
.fx-msg{margin:auto}`;

Widgets.define('rates', {
  props: ['config'],
  template: `<div class="fx">
    <p v-if="err" class="fx-msg">{{tr(err)}}</p>
    <p v-else-if="!rows.length" class="fx-msg">{{tr('loading')}}</p>
    <template v-else>
      <div class="fx-top"><label class="fx-amt"><input type="number" v-model.number="amount" min="0" step="any"><b>{{base}}</b></label><small>{{tr('updated',{date:updated})}}</small></div>
      <div class="fx-list scroll"><div class="fx-row" v-for="r in rows" :key="r.c"><span>{{r.c}}</span><b>{{r.v}}</b></div></div>
    </template></div>`,
  data: () => ({ amount: 1, rates: null, updated: '', err: '' }),
  computed: {
    base() { return (this.config.base || '').trim().toUpperCase(); },
    targets() { return (this.config.targets || '').toUpperCase().split(/[\s,;]+/).filter(Boolean); },
    rows() {
      if (!this.rates) return [];
      const nf = new Intl.NumberFormat(I18n.data.lang, { maximumFractionDigits: 4 });
      return this.targets.filter(c => this.rates[c]).map(c => ({ c, v: nf.format((this.amount || 0) * this.rates[c]) }));
    },
  },
  created() { this.load(); },
  methods: {
    tr: (k, p) => I18n.wt('rates', k, p),
    async load() {
      const k = 'fx:' + this.base;
      try {
        let c = JSON.parse(localStorage.getItem(k) || 'null');
        if (!c || Date.now() - c.t > 36e5) {
          const j = await (await fetch('https://open.er-api.com/v6/latest/' + encodeURIComponent(this.base))).json();
          if (j.result !== 'success') throw 0;
          c = { t: Date.now(), rates: j.rates, u: j.time_last_update_unix }; localStorage.setItem(k, JSON.stringify(c));
        }
        this.rates = c.rates; this.updated = new Date(c.u * 1000).toLocaleDateString(I18n.data.lang);
        if (!this.targets.some(x => this.rates[x])) this.err = 'noRates';
      } catch { this.err = 'loadError'; }
    },
  },
}, css);
