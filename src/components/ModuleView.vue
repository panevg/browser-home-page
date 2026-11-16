<script setup>
// The inside of a module panel: a status bar and the UI the server sent. Owns the module's runtime (connection).
import {computed, onBeforeUnmount, watch} from 'vue';
import {t} from '@/i18n';
import {acquire, release} from '@/modules/runtime';
import ModuleNode from './ModuleNode.vue';

const props = defineProps({module: {type: Object, required: true}});
const rt = acquire(props.module);
onBeforeUnmount(() => release(props.module.id));
watch(() => props.module.url, () => rt.connect());

const KNOWN = ['noUi', 'firstNotUi', 'protocol', 'ui', 'badUrl', 'offline', 'timeout', 'closed'];
const msg = code => (KNOWN.includes(code) ? t('mod.err.' + code) : code); // anything else is text from the server
const status = computed(() => t('mod.status.' + rt.status) + (rt.detail ? ': ' + msg(rt.detail) : ''));
</script>

<template>
  <div class="mv">
    <div class="mv-bar">
      <span :data-s="rt.status" class="dot"></span>
      <b>{{ rt.title || module.name }}</b>
      <small>{{ status }}</small>
      <button v-if="['idle', 'closed', 'failed'].includes(rt.status)" class="btn" type="button" @click="rt.connect()">{{ t('mod.connect') }}</button>
    </div>
    <div v-if="rt.error" class="mv-err">{{ msg(rt.error) }}</div>
    <div :class="{ lock: rt.status !== 'ready', busy: rt.pending }" class="mv-body scroll">
      <ModuleNode v-if="rt.root" :node="rt.root" :rt="rt"/>
      <p v-else class="widget-msg">{{ status }}</p>
    </div>
  </div>
</template>
