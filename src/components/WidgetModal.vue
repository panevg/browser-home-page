<script setup>
import {computed, onMounted, reactive} from 'vue';
import {t, wt, loadWidgetPacks} from '@/i18n';
import {widgetMeta, widgetTypes} from '@/widgets/registry';
import {vFocus} from '@/directives/focus';
import BaseModal from './BaseModal.vue';

const emit = defineEmits(['close', 'add']);
const form = reactive({type: widgetTypes[0] || '', config: {}});

onMounted(loadWidgetPacks); // names and descriptions come from the language packs

const catalog = computed(() => widgetTypes.map(type => ({
  type,
  name: wt(type, 'name'),
  description: wt(type, 'description')
})));
const fields = computed(() => (widgetMeta[form.type]?.fields || []).map(f => ({
  ...f,
  label: wt(form.type, f.labelKey)
})));

function pick(type) {
  form.type = type;
  form.config = {};
}

function submit() {
  const meta = widgetMeta[form.type];
  if (!meta) return;
  let config = {};
  for (const f of meta.fields) {
    const v = String(form.config[f.key] ?? '').trim();
    if (f.required && !v) return;
    if (v) config[f.key] = v;
  }
  if (meta.prepare) config = meta.prepare(config);
  emit('add', {type: form.type, config});
}
</script>

<template>
  <BaseModal @close="emit('close')" @submit="submit">
    <h2>{{ t('newWidget') }}</h2>
    <div class="choices">
      <button v-for="c in catalog" :key="c.type" :class="{ on: form.type === c.type }" class="choice" type="button"
              @click="pick(c.type)">
        <b>{{ c.name }}</b><small>{{ c.description }}</small>
      </button>
    </div>
    <label v-for="(f, i) in fields" :key="form.type + f.key">{{ f.label }}
      <input v-model="form.config[f.key]" v-focus="i === 0" :placeholder="f.placeholder" :required="f.required">
    </label>
    <div class="actions">
      <button class="btn" type="button" @click="emit('close')">{{ t('cancel') }}</button>
      <button class="btn primary">{{ t('add') }}</button>
    </div>
  </BaseModal>
</template>