// Free-form note; the text lives in the widget config, so it is saved on every keystroke. Texts: notes/lang/<code>.js
const css = `
.nt{height:100%;display:flex;flex-direction:column;padding:12px 16px}
.nt b{font:500 16px var(--serif);margin-bottom:6px}
.nt textarea{flex:1;resize:none;border:0;outline:0;background:none;font:inherit;line-height:1.5;color:inherit}`;

Widgets.define('notes', {
  props: ['config'],
  template: `<div class="nt"><b v-if="config.title">{{config.title}}</b>
    <textarea class="scroll" :value="config.text||''" @input="config.text=$event.target.value" :placeholder="tr('placeholder')" spellcheck="false"></textarea></div>`,
  methods: { tr: (k, p) => I18n.wt('notes', k, p) },
}, css);
