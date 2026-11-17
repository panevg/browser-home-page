<script setup>
// Manages modules: add (the server address is recorded first), per-module settings, remove.
import {ref} from 'vue';
import {state} from '@/state';
import {t} from '@/i18n';
import {runtimes} from '@/modules/runtime';
import {addModule, removeModule, setModuleUrl} from '@/composables/modules';
import {vFocus} from '@/directives/focus';
import BaseModal from './BaseModal.vue';

const emit = defineEmits(['close']);
const url = ref(''), name = ref(''), invalid = ref(false);
const editing = ref(null), badEdit = ref(false);
const SIZES = ['s', 'm', 'l'];

function submit() {
  if (!addModule({url: url.value, name: name.value})) {
    invalid.value = true;
    return;
  }
  url.value = name.value = '';
}

function changeUrl(m, e) {
  badEdit.value = !setModuleUrl(m, e.target.value);
  if (!badEdit.value) e.target.value = m.url;
}

const toggle = id => {
  editing.value = editing.value === id ? null : id;
  badEdit.value = false;
};
</script>

<template>
  <BaseModal @close="emit('close')" @submit="submit">
    <h2>{{ t('mod.title') }}</h2>
    <p class="hint">{{ t('mod.hint') }}</p>

    <ul v-if="state.modules.length" class="mlist">
      <li v-for="m in state.modules" :key="m.id" class="mitem">
        <div class="mrow">
          <span :data-s="runtimes[m.id]?.status || 'idle'" class="dot"></span>
          <div class="grow"><b>{{ m.name }}</b><small>{{ m.url }}</small></div>
          <button class="btn" type="button" @click="toggle(m.id)">{{ t('mod.edit') }}</button>
          <button class="btn danger" type="button" @click="removeModule(m.id)">{{ t('delete') }}</button>
        </div>
        <div v-if="editing === m.id" class="medit">
          <label>{{ t('name') }}<input v-model="m.name" maxlength="60" @keydown.enter.prevent="$event.target.blur()"></label>
          <label>{{ t('mod.address') }}<input :value="m.url" @change="changeUrl(m, $event)" @keydown.enter.prevent="$event.target.blur()"></label>
          <p v-if="badEdit" class="form-error">{{ t('mod.invalidUrl') }}</p>
          <div class="srow"><span>{{ t('mod.autoConnect') }}</span>
            <button :aria-checked="m.autoConnect" :aria-label="t('mod.autoConnect')" class="switch" role="switch" type="button"
                    @click="m.autoConnect = !m.autoConnect"/>
          </div>
          <div class="srow"><span>{{ t('mod.size') }}</span>
            <div class="seg" role="group">
              <button v-for="s in SIZES" :key="s" :class="{ on: m.size === s }" :aria-pressed="m.size === s" type="button" @click="m.size = s">
                {{ t('opt.moduleSize.' + s) }}
              </button>
            </div>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="hint">{{ t('mod.empty') }}</p>

    <h3 class="sec">{{ t('mod.add') }}</h3>
    <label>{{ t('mod.address') }}<input v-model="url" v-focus placeholder="wss://example.com/module" required @input="invalid = false"></label>
    <p v-if="invalid" class="form-error">{{ t('mod.invalidUrl') }}</p>
    <label>{{ t('name') }} <small>{{ t('optionalTitle') }}</small><input v-model="name" maxlength="60"></label>
    <div class="actions">
      <button class="btn" type="button" @click="emit('close')">{{ t('done') }}</button>
      <button class="btn primary">{{ t('add') }}</button>
    </div>
  </BaseModal>
</template>
