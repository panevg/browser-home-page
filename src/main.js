import { createApp } from 'vue';
import App from './App.vue';
import { state } from './state';
import * as i18n from './i18n';

async function main() {
  // The language is loaded before mounting, so there is no flash of untranslated text.
  state.lang = await i18n.use(state.lang || i18n.detect());
  createApp(App).mount('#app');
}

main();
