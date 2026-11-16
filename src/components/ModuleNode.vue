<script setup>
// Draws one node of a module's abstract UI. Only the components defined in src/modules/protocol.js exist and
// all text is rendered as plain text, so a server cannot inject markup or styles.
import {computed} from 'vue';

const props = defineProps({node: {type: Object, required: true}, rt: {type: Object, required: true}});

const locked = computed(() => props.rt.pending || props.rt.status !== 'ready');
// {bind: 'key'} reads the value the server last sent with a `data` message of that id.
const res = v => (v && typeof v === 'object' && 'bind' in v ? (props.rt.data[v.bind] ?? v.default) : v);
const items = computed(() => {
  const v = res(props.node.items);
  return Array.isArray(v) ? v.map(String) : [];
});
const pct = computed(() => Math.min(100, Math.max(0, Number(res(props.node.value)) || 0)));
const val = computed(() => props.rt.values[props.node.id]);

const fire = ev => {
  const steps = props.node.on?.[ev];
  if (steps && !locked.value) props.rt.run(steps);
};
const set = v => props.rt.setValue(props.node.id, v);
const onText = e => set(props.node.kind === 'number' && e.target.value !== '' ? e.target.valueAsNumber : e.target.value);
const onCheck = e => {
  set(e.target.checked);
  fire('change');
};
const onPick = e => {
  set(e.target.value);
  fire('change');
};
const onSlide = e => set(e.target.valueAsNumber);
</script>

<template>
  <div v-if="node.type === 'column' || node.type === 'row'" :class="['m-' + node.type, 'gap-' + node.gap, { wrap: node.wrap }]">
    <ModuleNode v-for="(c, i) in node.children" :key="c.id || i" :node="c" :rt="rt"/>
  </div>
  <hr v-else-if="node.type === 'divider'" class="m-div">
  <div v-else-if="node.type === 'heading'" :aria-level="node.level + 1" :class="'l' + node.level" class="m-h" role="heading">{{ res(node.text) }}</div>
  <p v-else-if="node.type === 'text'" :class="{ muted: node.muted, mono: node.mono }" class="m-text">{{ res(node.text) }}</p>
  <a v-else-if="node.type === 'link'" :href="node.href || undefined" class="m-link" rel="noopener noreferrer" target="_blank">{{ res(node.text) || node.href }}</a>
  <img v-else-if="node.type === 'image' && node.src" :alt="node.alt" :src="node.src" class="m-img" loading="lazy" referrerpolicy="no-referrer">
  <div v-else-if="node.type === 'progress'" class="m-prog">
    <span v-if="res(node.label)">{{ res(node.label) }}</span>
    <div class="bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: pct + '%' }"></i></div>
  </div>
  <component :is="node.ordered ? 'ol' : 'ul'" v-else-if="node.type === 'list'" class="m-list"><li v-for="(it, i) in items" :key="i">{{ it }}</li></component>
  <button v-else-if="node.type === 'button'" :class="['btn', node.variant]" :disabled="node.disabled || locked" type="button" @click="fire('click')">
    {{ res(node.text) }}
  </button>
  <label v-else-if="node.type === 'input'" class="m-field"><span v-if="node.label">{{ node.label }}</span>
    <input :disabled="locked" :placeholder="node.placeholder" :type="node.kind" :value="val" @change="fire('change')" @input="onText"
           @keydown.enter="fire('submit')"></label>
  <label v-else-if="node.type === 'textarea'" class="m-field"><span v-if="node.label">{{ node.label }}</span>
    <textarea :disabled="locked" :placeholder="node.placeholder" :rows="node.rows" :value="val" @change="fire('change')"
              @input="onText"></textarea></label>
  <label v-else-if="node.type === 'checkbox'" class="m-check"><input :checked="!!val" :disabled="locked" type="checkbox" @change="onCheck">{{ node.label }}</label>
  <label v-else-if="node.type === 'select'" class="m-field"><span v-if="node.label">{{ node.label }}</span>
    <select :disabled="locked" :value="val" @change="onPick"><option v-for="o in node.options" :key="o.value" :value="o.value">{{ o.label }}</option></select></label>
  <label v-else-if="node.type === 'slider'" class="m-field"><span>{{ node.label }} <b>{{ val }}</b></span>
    <input :disabled="locked" :max="node.max" :min="node.min" :step="node.step" :value="val" type="range" @change="fire('change')"
           @input="onSlide"></label>
</template>
