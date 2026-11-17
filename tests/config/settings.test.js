import {describe, expect, it} from 'vitest';
import en from '@/locales/en-GB.js';
import {ACCENTS, DEFAULTS, OPTIONS, normalizeSettings} from '@/config/settings';

describe('normalizeSettings', () => {
	it.each([[undefined], [null], ['x'], [[]], [{}], [{search: 5, ui: []}]])('returns the defaults for %j', raw => {
		expect(normalizeSettings(raw)).toEqual(DEFAULTS);
	});

	it('keeps every valid value', () => {
		const custom = {
			search: {
				openIn: 'blank',
				suggestions: false,
				suggestionsMax: 3,
				bookmarkSuggestions: false,
				history: false,
				autofocus: false,
				directUrls: false
			},
			ui: {
				theme: 'dark',
				accent: 'blue',
				showTitle: false,
				searchWidth: 'l',
				searchShape: 'square',
				tileSize: 's',
				tileLabels: false,
				bookmarksOpenIn: 'blank'
			},
			modules: {enabled: false, reconnect: false, reconnectDelay: 30, requestTimeout: 5}
		};
		expect(normalizeSettings(custom)).toEqual(custom);
	});

	it('replaces wrong types and unknown choices with the defaults, one by one', () => {
		const r = normalizeSettings({
			search: {openIn: 'popup', suggestions: 'no', suggestionsMax: '5'},
			ui: {theme: 'dark', accent: '__proto__', tileSize: 'xl'}
		});
		expect(r.search).toEqual(DEFAULTS.search);
		expect(r.ui).toEqual({...DEFAULTS.ui, theme: 'dark'});
	});

	it('drops unknown keys', () => {
		expect(normalizeSettings({search: {evil: 1}, other: {}})).toEqual(DEFAULTS);
	});
});

describe('DEFAULTS / OPTIONS', () => {
	it('every default is an allowed choice', () => {
		for (const group of Object.values(DEFAULTS)) {
			for (const [k, v] of Object.entries(group)) {
				if (OPTIONS[k]) expect(OPTIONS[k], k).toContain(v);
				else if (k === 'accent') expect(ACCENTS).toHaveProperty(v);
				else expect(typeof v, k).toBe('boolean');
			}
		}
	});

	it('has a hex colour pair for every accent', () => {
		for (const [name, c] of Object.entries(ACCENTS)) expect(c, name).toEqual([expect.stringMatching(/^#[0-9a-f]{6}$/i), expect.stringMatching(/^#[0-9a-f]{6}$/i)]);
	});
});

describe('labels', () => {
	it('has a label for every setting and every choice in the settings dialog', () => {
		for (const group of Object.values(DEFAULTS)) {
			for (const k of Object.keys(group)) {
				expect(en[`set.${k}`], `set.${k}`).toBeTruthy();
				for (const o of OPTIONS[k] || []) if (typeof o !== 'number') expect(en[`opt.${k}.${o}`], `opt.${k}.${o}`).toBeTruthy();
			}
		}
		for (const name of Object.keys(ACCENTS)) expect(en[`opt.accent.${name}`], name).toBeTruthy();
	});
});