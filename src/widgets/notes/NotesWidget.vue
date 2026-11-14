<script setup>
// Free-form note; the text lives in the widget config, so it is saved on every keystroke. Texts: ./lang/<code>.js
import { wt } from '@/i18n';

defineProps({ config: { type: Object, required: true } });
const tr = (k, p) => wt('notes', k, p);
</script>

<template>
  <div class="nt"><b v-if="config.title">{{ config.title }}</b>
    <textarea class="scroll" :value="config.text || ''" :placeholder="tr('placeholder')" spellcheck="false" @input="config.text = $event.target.value"></textarea></div>
</template>

<style>
.nt{height:100%;display:flex;flex-direction:column;padding:12px 16px}
.nt b{font:500 16px var(--serif);margin-bottom:6px}
.nt textarea{flex:1;resize:none;border:0;outline:0;background:none;font:inherit;line-height:1.5;color:inherit}
</style>
