import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('@/utils/net', () => ({ fetchText: vi.fn(), proxied: vi.fn() }));

import { fetchText } from '@/utils/net';
import { loadWidgetPacks, use } from '@/i18n';
import NewsWidget from '@/widgets/news/NewsWidget.vue';

const RSS = `<rss><channel>
  <item><title>First story</title><link>https://example.com/1</link><pubDate>${new Date(Date.now() - 36e5).toUTCString()}</pubDate></item>
  <item><title>Second story</title><link>https://example.com/2</link></item>
</channel></rss>`;
const FEED = 'https://example.com/rss.xml';

beforeAll(async () => { await use('en-GB'); await loadWidgetPacks(); });
beforeEach(() => { localStorage.clear(); fetchText.mockReset(); });

const show = async (config = { feed: FEED }) => {
  const w = mount(NewsWidget, { props: { config } });
  await flushPromises();
  return w;
};

describe('NewsWidget', () => {
  it('shows a loading message first', () => {
    fetchText.mockReturnValue(new Promise(() => {}));
    const w = mount(NewsWidget, { props: { config: { feed: FEED } } });
    expect(w.text()).toBe('Loading news…');
  });

  it('lists the headlines as safe external links', async () => {
    fetchText.mockResolvedValue(RSS);
    const w = await show();
    const links = w.findAll('.nw-list a');
    expect(links.map(a => a.text())).toEqual(['First story', 'Second story']);
    expect(links[0].attributes()).toMatchObject({ href: 'https://example.com/1', target: '_blank', rel: 'noopener' });
    expect(w.findAll('time')).toHaveLength(1); // only the first item has a date
    expect(w.find('time').text()).toMatch(/hour ago|60 minutes ago/);
  });

  it('requests the configured feed and validates the response', async () => {
    fetchText.mockResolvedValue(RSS);
    await show({ feed: `  ${FEED}  ` });
    expect(fetchText).toHaveBeenCalledWith(FEED, expect.objectContaining({ accept: expect.any(Function) }));
  });

  it('shows the optional title', async () => {
    fetchText.mockResolvedValue(RSS);
    expect((await show({ feed: FEED, title: 'World news' })).find('h4').text()).toBe('World news');
    expect((await show()).find('h4').exists()).toBe(false);
  });

  it('shows an error when the feed cannot be loaded', async () => {
    fetchText.mockRejectedValue(new Error('offline'));
    expect((await show()).text()).toBe('Could not load the feed. Check the address and try again.');
  });

  it('shows a message for a feed without usable items', async () => {
    fetchText.mockResolvedValue('<rss><channel><title>empty</title></channel></rss>');
    expect((await show()).text()).toBe('No items found in this feed');
  });

  it('shows an error when the response is not a feed', async () => {
    fetchText.mockResolvedValue('<html><body><p>broken</body>');
    expect((await show()).text()).toContain('Could not load the feed');
  });

  it('caches a good feed for the next mount', async () => {
    fetchText.mockResolvedValue(RSS);
    await show();
    await show();
    expect(fetchText).toHaveBeenCalledTimes(1);
  });

  it('does not cache an empty result', async () => {
    fetchText.mockResolvedValue('<rss><channel/></rss>');
    await show();
    await show();
    expect(fetchText).toHaveBeenCalledTimes(2);
  });
});
