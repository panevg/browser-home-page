<script setup>
import {state} from '@/state';
import {t, use, languages} from '@/i18n';
import {ENGINES} from '@/config/engines';
import {ACCENTS, DEFAULTS, OPTIONS} from '@/config/settings';
import BaseModal from './BaseModal.vue';

const emit = defineEmits(['close']);
const setLang = async code => {
  state.lang = await use(code);
};

// One row per setting. type: 'seg' (buttons) | 'switch' | 'select' | 'accent'. `dep` greys a row out when another one is off.
// Option labels come from the locale key `opt.<key>.<value>`; numbers are shown as they are.
const sections = [
  {
    title: 'secSearch', group: 'search', rows: [
      {key: 'openIn', type: 'seg'},
      {key: 'suggestions', type: 'switch'},
      {key: 'suggestionsMax', type: 'select', dep: 'suggestions'},
      {key: 'bookmarkSuggestions', type: 'switch'},
      {key: 'autofocus', type: 'switch'},
      {key: 'directUrls', type: 'switch'}
    ]
  },
  {
    title: 'secAppearance', group: 'ui', rows: [
      {key: 'theme', type: 'seg'},
      {key: 'accent', type: 'accent'},
      {key: 'showTitle', type: 'switch'},
      {key: 'searchWidth', type: 'seg'},
      {key: 'searchShape', type: 'seg'}
    ]
  },
  {
    title: 'secBookmarks', group: 'ui', rows: [
      {key: 'tileSize', type: 'seg'},
      {key: 'tileLabels', type: 'switch'},
      {key: 'bookmarksOpenIn', type: 'seg'}
    ]
  }
];

const label = (key, o) => (typeof o === 'number' ? o : t(`opt.${key}.${o}`));
const set = (group, key, v) => {
  state.settings[group][key] = v;
};
const off = (group, r) => r.dep && !state.settings[group][r.dep];

function reset() {
  state.engine = 0;
  for (const g of Object.keys(DEFAULTS)) Object.assign(state.settings[g], DEFAULTS[g]);
}
</script>

<template>
  <BaseModal @close="emit('close')" @submit="emit('close')">
    <h2>{{ t('settings') }}</h2>

    <div class="srow">
      <span>{{ t('language') }}</span>
      <select :value="state.lang" class="language-select" @change="setLang($event.target.value)">
        <option v-for="l in languages" :key="l.code" :value="l.code">{{ l.name }}</option>
      </select>
    </div>

    <template v-for="sec in sections" :key="sec.title">
      <h3 class="sec">{{ t(sec.title) }}</h3>

      <div v-if="sec.group === 'search'" class="srow">
        <span>{{ t('defaultEngine') }}</span>
        <select :value="state.engine" class="language-select" @change="state.engine = +$event.target.value">
          <option v-for="(e, i) in ENGINES" :key="e.name" :value="i">{{ e.name }}</option>
        </select>
      </div>

      <div v-for="r in sec.rows" :key="r.key" :class="{ off: off(sec.group, r) }" class="srow">
        <span>{{ t('set.' + r.key) }}</span>

        <div v-if="r.type === 'seg'" :aria-label="t('set.' + r.key)" class="seg" role="group">
          <button
              v-for="o in OPTIONS[r.key]" :key="o" :aria-pressed="state.settings[sec.group][r.key] === o" :class="{ on: state.settings[sec.group][r.key] === o }"
              type="button" @click="set(sec.group, r.key, o)"
          >{{ label(r.key, o) }}
          </button>
        </div>

        <button
            v-else-if="r.type === 'switch'" :aria-checked="state.settings[sec.group][r.key]" :aria-label="t('set.' + r.key)" class="switch" role="switch"
            type="button"
            @click="set(sec.group, r.key, !state.settings[sec.group][r.key])"
        />

        <select
            v-else-if="r.type === 'select'" :disabled="off(sec.group, r)" :value="state.settings[sec.group][r.key]"
            class="language-select" @change="set(sec.group, r.key, +$event.target.value)"
        >
          <option v-for="o in OPTIONS[r.key]" :key="o" :value="o">{{ label(r.key, o) }}</option>
        </select>

        <div v-else-if="r.type === 'accent'" :aria-label="t('set.accent')" class="swatches" role="group">
          <button
              v-for="(c, name) in ACCENTS" :key="name" :aria-label="t('opt.accent.' + name)" :aria-pressed="state.settings.ui.accent === name"
              :class="{ on: state.settings.ui.accent === name }"
              :style="{ background: c[0] }" :title="t('opt.accent.' + name)" class="swatch"
              type="button" @click="set('ui', 'accent', name)"
          />
        </div>
      </div>
    </template>

    <button class="reset" type="button" @click="reset">{{ t('resetSettings') }}</button>
    <div class="actions">
      <button class="btn primary">{{ t('done') }}</button>
    </div>
  </BaseModal>
</template>