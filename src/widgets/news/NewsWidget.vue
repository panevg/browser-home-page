<script setup>
// Latest news from any RSS/Atom feed (fetched through a CORS proxy, cached 10 min). Texts: ./lang/<code>.js
import { ref } from 'vue';
import { ago, wt } from '@/i18n';
import { cached } from '@/utils/cache';
import { fetchText } from '@/utils/net';
import { isFeed, parseFeed } from '@/utils/feed';

const props = defineProps({ config: { type: Object, required: true } });
const tr = (k, p) => wt('news', k, p);

const items = ref(null), err = ref('');

async function load() {
  const feed = (props.config.feed || '').trim();
  try {
    const list = await cached('news:' + feed, 6e5, async () => {
      return parseFeed(await fetchText(feed, { accept: isFeed }));
    }, l => l.length > 0);
    if (!list.length) { err.value = 'empty'; return; }
    items.value = list;
  } catch {
    err.value = 'loadError';
  }
}
load();
</script>

<template>
  <div class="nw">
    <p v-if="err" class="nw-msg">{{ tr(err) }}</p>
    <p v-else-if="!items" class="nw-msg">{{ tr('loading') }}</p>
    <template v-else>
      <h4 v-if="config.title">{{ config.title }}</h4>
      <ul class="nw-list scroll"><li v-for="(n, i) in items" :key="i"><a :href="n.url" target="_blank" rel="noopener">{{ n.title }}</a><time v-if="n.date && ago(n.date)">{{ ago(n.date) }}</time></li></ul>
    </template>
  </div>
</template>

<style>
.nw{height:100%;display:flex;flex-direction:column;padding:14px 20px}
.nw h4{margin:0 0 6px;font:500 16px var(--serif)}
.nw-list{flex:1;min-height:0;overflow-y:auto;margin:0;padding:0;list-style:none}
.nw-list li{padding:8px 0;border-bottom:1px solid var(--line)}
.nw-list a{color:var(--text);text-decoration:none;font-size:14px;line-height:1.35}.nw-list a:hover{color:var(--accent)}
.nw-list time{display:block;margin-top:2px;color:var(--muted);font-size:12px}
.nw-msg{margin:auto;color:var(--muted);text-align:center}
</style>
