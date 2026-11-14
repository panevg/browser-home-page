<script setup>
import { state } from '@/state';
import { t, use, languages } from '@/i18n';
import BaseModal from './BaseModal.vue';

const emit = defineEmits(['close']);
const setLang = async code => { state.lang = await use(code); };
</script>

<template>
  <BaseModal @close="emit('close')" @submit="emit('close')">
    <h2>{{ t('settings') }}</h2>
    <label>{{ t('language') }}
      <select class="language-select" :value="state.lang" @change="setLang($event.target.value)">
        <option v-for="l in languages" :key="l.code" :value="l.code">{{ l.name }}</option>
      </select>
    </label>
    <div class="actions"><button class="btn primary">{{ t('done') }}</button></div>
  </BaseModal>
</template>
