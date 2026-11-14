import { afterEach, describe, expect, it, vi } from 'vitest';

// The i18n module keeps its state at module level, so every test gets a fresh copy.
async function fresh() {
  vi.resetModules();
  return import('@/i18n');
}

const setLanguages = list => vi.spyOn(navigator, 'languages', 'get').mockReturnValue(list);

afterEach(() => vi.restoreAllMocks());

describe('detect', () => {
  it('picks an exact match', async () => {
    const { detect } = await fresh();
    setLanguages(['uk']);
    expect(detect()).toBe('uk');
  });

  it('falls back to the base language (uk-UA -> uk, en-US -> en-GB)', async () => {
    const { detect } = await fresh();
    setLanguages(['uk-UA']);
    expect(detect()).toBe('uk');
    setLanguages(['en-US']);
    expect(detect()).toBe('en-GB');
  });

  it('ignores case and honours the order of preference', async () => {
    const { detect } = await fresh();
    setLanguages(['fr', 'EN-gb', 'uk']);
    expect(detect()).toBe('en-GB');
    setLanguages(['fr', 'uk']);
    expect(detect()).toBe('uk');
  });

  it('uses English (UK) when nothing matches', async () => {
    const { detect, FALLBACK } = await fresh();
    setLanguages(['fr', 'de']);
    expect(detect()).toBe(FALLBACK);
  });
});

describe('use / t', () => {
  it('loads a language and translates with it', async () => {
    const { use, t, data } = await fresh();
    expect(await use('uk')).toBe('uk');
    expect(data.lang).toBe('uk');
    expect(document.documentElement.lang).toBe('uk');
    expect(t('settings')).toBe('Налаштування');
  });

  it('falls back to English (UK) for an unknown language code', async () => {
    const { use, t } = await fresh();
    expect(await use('xx')).toBe('en-GB');
    expect(t('settings')).toBe('Settings');
  });

  it('returns the key itself for an unknown key', async () => {
    const { use, t } = await fresh();
    await use('en-GB');
    expect(t('no.such.key')).toBe('no.such.key');
  });

  it('uses English strings when the selected language failed to load', async () => {
    const { use, t, languages } = await fresh();
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    languages.find(l => l.code === 'uk').load = () => Promise.reject(new Error('offline'));
    await use('uk');
    expect(error).toHaveBeenCalled();
    expect(t('settings')).toBe('Settings');
  });
});

describe('wt (widget strings)', () => {
  it('inserts {params} and keeps unknown placeholders', async () => {
    const { use, loadWidgetPacks, wt } = await fresh();
    await use('en-GB');
    await loadWidgetPacks();
    expect(wt('cactus', 'size', { v: '5.0' })).toBe('Height 5.0 cm');
    expect(wt('cactus', 'size')).toBe('Height {v} cm');
    expect(wt('cactus', 'age', { d: 2, h: 3 })).toBe('2 d 3 h old');
  });

  it('falls back to English (UK) per key, then to the key', async () => {
    const { data, wt } = await fresh();
    data.widget.demo = { 'en-GB': { a: 'English A' }, uk: { b: 'Українська B' } };
    data.lang = 'uk';
    expect(wt('demo', 'b')).toBe('Українська B');
    expect(wt('demo', 'a')).toBe('English A');
    expect(wt('demo', 'zzz')).toBe('zzz');
    expect(wt('unknown-widget', 'k')).toBe('k');
  });

  it('loads packs for the fallback and the current language, including a later language switch', async () => {
    const { use, loadWidgetPacks, data } = await fresh();
    await use('en-GB');
    await loadWidgetPacks();
    expect(data.widget.todo['en-GB'].name).toBe('To-do list');
    expect(data.widget.todo.uk).toBeUndefined();
    await use('uk');
    await loadWidgetPacks(); // after the first call, switching language loads the new packs too
    expect(data.widget.todo.uk.name).toBeTruthy();
  });
});

describe('ago', () => {
  it('formats minutes, hours and days', async () => {
    const { use, ago } = await fresh();
    await use('en-GB');
    const now = Date.now();
    expect(ago(now - 5 * 60e3)).toMatch(/5 minutes ago/);
    expect(ago(now - 3 * 36e5)).toMatch(/3 hours ago/);
    expect(ago(now - 2 * 864e5)).toMatch(/2 days ago/);
  });

  it('returns an empty string for an unparsable date', async () => {
    const { ago } = await fresh();
    expect(ago('definitely not a date')).toBe('');
  });
});
