// To-do list; items live in the widget config (saved instantly). Texts: todo/lang/<code>.js
const css = `
.td{height:100%;display:flex;flex-direction:column;gap:10px;padding:16px 20px}
.td-add{display:flex;gap:8px}
.td-add input{flex:1;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);outline:0}
.td-add input:focus{border-color:var(--accent)}
.td-list{flex:1;min-height:0;overflow-y:auto;margin:0;padding:0;list-style:none}
.td-list li{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--line)}
.td-list label{flex:1;display:flex;gap:10px;align-items:center;cursor:pointer;min-width:0}
.td-list input{accent-color:var(--accent);width:16px;height:16px}
.td-list .done span{text-decoration:line-through;color:var(--muted)}
.td-x{border:0;background:none;color:var(--muted);font-size:18px;line-height:1}.td-x:hover{color:#c0392b}
.td-empty{margin:auto;color:var(--muted)}`;

Widgets.define('todo', {
  props: ['config'],
  template: `<div class="td">
    <form class="td-add" @submit.prevent="add"><input v-model="text" :placeholder="tr('placeholder')"><button class="btn primary">{{tr('add')}}</button></form>
    <ul class="td-list scroll"><li v-for="i in items" :key="i.id" :class="{done:i.done}">
      <label><input type="checkbox" v-model="i.done"><span>{{i.text}}</span></label><button type="button" class="td-x" :title="tr('remove')" @click="del(i.id)">×</button></li></ul>
    <p v-if="!items.length" class="td-empty">{{tr('empty')}}</p></div>`,
  data: () => ({ text: '' }),
  computed: { items() { return this.config.items || []; } },
  created() { if (!this.config.items) this.config.items = []; },
  methods: {
    tr: (k, p) => I18n.wt('todo', k, p),
    add() { const t = this.text.trim(); if (!t) return; this.config.items.push({ id: Math.random().toString(36).slice(2, 8), text: t, done: false }); this.text = ''; },
    del(id) { this.config.items.splice(this.config.items.findIndex(i => i.id === id), 1); },
  },
}, css);
