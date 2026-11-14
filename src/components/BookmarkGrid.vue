<script setup>
import {reactive} from 'vue';
import {state} from '@/state';
import {t} from '@/i18n';
import {icon, initial} from '@/utils/misc';
import {removeBookmark} from '@/composables/bookmarks';
import {dnd} from '@/composables/dnd';

// Icons that failed to load. Kept in memory only: a temporary network problem must not be saved forever.
const bad = reactive({});
</script>

<template>
  <section class="grid scroll">
    <a
        v-for="b in state.bookmarks" :key="b.id" :href="b.url" :target="state.settings.ui.bookmarksOpenIn === 'blank' ? '_blank' : null" :title="b.title" class="tile"
        draggable="true" rel="noopener"
        v-bind="dnd('bookmarks', state.bookmarks, b.id)"
    >
      <div class="ic">
        <img v-if="!bad[b.id]" :src="icon(b.host)" alt="" @error="bad[b.id] = true">
        <b v-else>{{ initial(b.title) }}</b>
      </div>
      <span>{{ b.title }}</span>
      <button :title="t('delete')" class="x" @click.prevent="removeBookmark(b.id)">×</button>
    </a>
  </section>
</template>