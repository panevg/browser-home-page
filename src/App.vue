<script setup>
import {ref, watchEffect, onMounted, onUnmounted} from 'vue';
import {t} from '@/i18n';
import {addBookmark} from '@/composables/bookmarks';
import {addWidget} from '@/composables/widgets';
import SearchBox from '@/components/SearchBox.vue';
import BookmarkGrid from '@/components/BookmarkGrid.vue';
import WidgetList from '@/components/WidgetList.vue';
import SettingsModal from '@/components/SettingsModal.vue';
import BookmarkModal from '@/components/BookmarkModal.vue';
import WidgetModal from '@/components/WidgetModal.vue';

// Only one dialog can be open at a time: null | 'settings' | 'bookmark' | 'widget'
const modal = ref(null);

watchEffect(() => {
  document.title = t('pageTitle');
});

const onAddBookmark = b => {
  addBookmark(b);
  modal.value = null;
};
const onAddWidget = ({type, config}) => {
  addWidget(type, config);
  modal.value = null;
};

function onKey(e) {
  if (e.key === 'Escape') {
    modal.value = null;
    return;
  }
  // Shift + "+" opens the bookmark dialog. Ctrl/Cmd/Alt + "+" is the browser zoom and must keep working.
  const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if (e.key === '+' && !e.ctrlKey && !e.metaKey && !e.altKey && !typing && !modal.value) {
    e.preventDefault();
    modal.value = 'bookmark';
  }
}

onMounted(() => addEventListener('keydown', onKey));
onUnmounted(() => removeEventListener('keydown', onKey));
</script>

<template>
  <button :aria-label="t('settings')" :title="t('settings')" class="icon-btn top-settings" @click="modal = 'settings'">
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"/>
      <path
          d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.78.55l-.05.07h-3.4l-.03-.08a1.7 1.7 0 0 0-1.52-1.1 1.7 1.7 0 0 0-1.52 1.1l-.03.08H6.29l-.05-.07a1.7 1.7 0 0 0-1.78-.55l-.08.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 3.08 15l-.08-.04v-3.4l.08-.04a1.7 1.7 0 0 0-.34-1.88l-.06-.06 1.7-2.94.08.02a1.7 1.7 0 0 0 1.78-.55l.05-.07h3.4l.03.08a1.7 1.7 0 0 0 1.52 1.1 1.7 1.7 0 0 0 1.52-1.1l.03-.08h3.4l.05.07a1.7 1.7 0 0 0 1.78.55l.08-.02 1.7 2.94-.06.06A1.7 1.7 0 0 0 19.4 11.5l.08.04v3.4l-.08.06Z"/>
    </svg>
  </button>
  <button :title="t('addBookmark')" class="icon-btn top-add" type="button" @click="modal = 'bookmark'">+</button>

  <SearchBox/>
  <BookmarkGrid/>
  <WidgetList @add="modal = 'widget'"/>

  <SettingsModal v-if="modal === 'settings'" @close="modal = null"/>
  <BookmarkModal v-if="modal === 'bookmark'" @add="onAddBookmark" @close="modal = null"/>
  <WidgetModal v-if="modal === 'widget'" @add="onAddWidget" @close="modal = null"/>
</template>