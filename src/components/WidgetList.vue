<script setup>
import {watch} from 'vue';
import {state} from '@/state';
import {t, wt, loadWidgetPacks} from '@/i18n';
import {components, widgetMeta} from '@/widgets/registry';
import {removeWidget} from '@/composables/widgets';
import {useAfterLoad} from '@/composables/afterLoad';
import {dnd} from '@/composables/dnd';

defineEmits(['add']);

// Widget code (and language packs) is fetched only after the page has loaded; until then a skeleton is shown.
const ready = useAfterLoad();
watch(ready, v => {
  if (v) loadWidgetPacks();
}, {immediate: true});
</script>

<template>
  <section class="widgets">
    <div v-for="w in state.widgets" :key="w.id" class="wrow" v-bind="dnd('widgets', state.widgets, w.id)">
      <span :title="t('drag')" class="handle" draggable="true">⠿</span>
      <template v-if="!w.hidden">
        <div class="widget">
          <component :is="components[w.type]" v-if="ready" :config="w.config"/>
          <div v-else class="skeleton"></div>
        </div>
        <button :title="t('hide')" class="icon-btn" type="button" @click="w.hidden = true">−</button>
      </template>
      <div v-else class="widget-hidden">
        <div><b>{{ wt(w.type, 'name') }}</b><small>{{ widgetMeta[w.type].summary(w.config) }}</small></div>
        <button class="btn" type="button" @click="w.hidden = false">{{ t('show') }}</button>
        <button class="btn danger" type="button" @click="removeWidget(w.id)">{{ t('delete') }}</button>
      </div>
    </div>
    <div class="wadd">
      <button :title="t('addWidget')" class="icon-btn" type="button" @click="$emit('add')">+</button>
    </div>
  </section>
</template>