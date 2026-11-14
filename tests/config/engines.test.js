import {describe, expect, it} from 'vitest';
import {ENGINES} from '@/config/engines';

describe('ENGINES', () => {
	it('keeps the existing order (the choice is stored as an index: only append new engines)', () => {
		expect(ENGINES.map(e => e.name)).toEqual(['DuckDuckGo', 'Google', 'Bing', 'Startpage', 'Brave', 'Wikipedia', 'YouTube']);
	});

	it('has unique names and hosts', () => {
		expect(new Set(ENGINES.map(e => e.name)).size).toBe(ENGINES.length);
		expect(new Set(ENGINES.map(e => e.host)).size).toBe(ENGINES.length);
	});

	it('has an https address with a %s placeholder for every engine', () => {
		for (const e of ENGINES) {
			expect(e.url, e.name).toMatch(/^https:\/\//);
			expect(e.url, e.name).toContain('%s');
		}
	});

	it('uses the interface language (%l) only for Wikipedia', () => {
		expect(ENGINES.filter(e => e.url.includes('%l')).map(e => e.name)).toEqual(['Wikipedia']);
	});
});