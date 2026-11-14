<script setup>
import {ref} from 'vue';
import {t} from '@/i18n';
import {parseHttpUrl} from '@/utils/url';
import {vFocus} from '@/directives/focus';
import BaseModal from './BaseModal.vue';

const emit = defineEmits(['close', 'add']);
const url = ref(''), title = ref(''), invalid = ref(false);

function submit() {
  const parsed = parseHttpUrl(url.value);
  if (!parsed) {
    invalid.value = true;
    return;
  }
  emit('add', {...parsed, title: title.value.trim()});
}
</script>

<template>
  <BaseModal @close="emit('close')" @submit="submit">
    <h2>{{ t('newBookmark') }}</h2>
    <label>{{ t('url') }}<input v-model="url" v-focus placeholder="example.com" required
                                @input="invalid = false"></label>
    <p v-if="invalid" class="form-error">{{ t('invalidUrl') }}</p>
    <label>{{ t('name') }} <small>{{ t('optionalTitle') }}</small><input v-model="title"></label>
    <div class="actions">
      <button class="btn" type="button" @click="emit('close')">{{ t('cancel') }}</button>
      <button class="btn primary">{{ t('add') }}</button>
    </div>
  </BaseModal>
</template>