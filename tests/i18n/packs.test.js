// Guards translations: every language must have the same keys as English (UK), for the app and for every widget.
import { describe, expect, it } from 'vitest';
import { languages, FALLBACK } from '@/locales';

const app = import.meta.glob('/src/locales/*.js', { eager: true, import: 'default' });
const packs = import.meta.glob('/src/widgets/*/lang/*.js', { eager: true, import: 'default' });
const indexes = import.meta.glob('/src/widgets/*/index.js', { eager: true, import: 'default' });

const keys = o => Object.keys(o).sort();
const widgetTypes = Object.keys(indexes).map(p => p.split('/')[3]);

describe('languages', () => {
  it('lists the fallback language', () => {
    expect(languages.map(l => l.code)).toContain(FALLBACK);
  });

  it.each(languages.map(l => l.code))('has app strings for %s with the same keys as the fallback', code => {
    const strings = app[`/src/locales/${code}.js`];
    expect(strings, `src/locales/${code}.js`).toBeDefined();
    expect(keys(strings)).toEqual(keys(app[`/src/locales/${FALLBACK}.js`]));
  });
});

describe.each(widgetTypes)('widget "%s" language packs', type => {
  const pack = code => packs[`/src/widgets/${type}/lang/${code}.js`];

  it.each(languages.map(l => l.code))('has a pack for %s with the same keys as the fallback', code => {
    expect(pack(code), `${type}/lang/${code}.js`).toBeDefined();
    expect(keys(pack(code))).toEqual(keys(pack(FALLBACK)));
  });

  it('has a name, a description and a label for every form field', () => {
    const en = pack(FALLBACK);
    expect(en.name).toBeTruthy();
    expect(en.description).toBeTruthy();
    for (const f of indexes[`/src/widgets/${type}/index.js`].fields) expect(en[f.labelKey], f.labelKey).toBeTruthy();
  });
});
