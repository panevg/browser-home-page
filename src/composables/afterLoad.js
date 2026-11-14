import { ref } from 'vue';

// A ref that becomes true once the window has fully loaded AND the browser is idle.
// Widgets are rendered only then, so the page, search and bookmarks always appear first.
const ready = ref(false);
let started = false;

export function useAfterLoad() {
  if (!started) {
    started = true;
    const go = () => (window.requestIdleCallback || setTimeout)(() => { ready.value = true; });
    document.readyState === 'complete' ? go() : addEventListener('load', go, { once: true });
  }
  return ready;
}
