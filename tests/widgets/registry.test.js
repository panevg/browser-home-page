import {beforeAll, describe, expect, it} from 'vitest';
import {loadWidgetPacks, use} from '@/i18n';
import {components, widgetMeta, widgetTypes} from '@/widgets/registry';

describe('widget registry', () => {
	it('discovers every widget folder', () => {
		expect(Object.keys(widgetMeta).sort()).toEqual(['cactus', 'calendar', 'farm', 'github', 'news', 'notes', 'rates', 'todo', 'weather']);
	});

	it('sorts the picker by `order`', () => {
		expect(widgetTypes).toEqual(['github', 'weather', 'calendar', 'todo', 'notes', 'rates', 'news', 'cactus', 'farm']);
	});

	it('has a lazy component for every widget', () => {
		for (const type of widgetTypes) expect(components[type], type).toBeDefined();
	});

	it.each(Object.keys(widgetMeta))('"%s" has a valid definition', type => {
		const m = widgetMeta[type];
		expect(Array.isArray(m.fields)).toBe(true);
		expect(typeof m.summary).toBe('function');
		expect(typeof m.component).toBe('function');
		for (const f of m.fields) {
			expect(f.key).toBeTruthy();
			expect(f.labelKey).toBeTruthy();
			expect(typeof f.required).toBe('boolean');
		}
	});

	it.each(Object.keys(widgetMeta))('"%s" component module can be loaded', async type => {
		const mod = await widgetMeta[type].component();
		expect(mod.default).toBeDefined();
	});
});

describe('widget summaries (shown for hidden widgets)', () => {
	beforeAll(async () => {
		await use('en-GB');
		await loadWidgetPacks();
	});

	it('github', () => expect(widgetMeta.github.summary({user: 'torvalds'})).toBe('@torvalds'));
	it('weather', () => {
		expect(widgetMeta.weather.summary({location: 'Berlin'})).toBe('Berlin');
		expect(widgetMeta.weather.summary({})).toBe('');
	});
	it('calendar', () => expect(widgetMeta.calendar.summary({})).toBe(''));
	it('notes', () => {
		expect(widgetMeta.notes.summary({title: 'Ideas'})).toBe('Ideas');
		expect(widgetMeta.notes.summary({})).toBe('');
	});
	it('todo counts open tasks', () => {
		expect(widgetMeta.todo.summary({})).toBe('0 / 0');
		expect(widgetMeta.todo.summary({items: [{done: true}, {done: false}, {done: false}]})).toBe('2 / 3');
	});
	it('rates', () => expect(widgetMeta.rates.summary({base: 'eur', targets: 'usd, uah'})).toBe('EUR → USD, UAH'));
	it('news: title, else the host, else the raw text', () => {
		expect(widgetMeta.news.summary({title: 'BBC', feed: 'https://x.com/rss'})).toBe('BBC');
		expect(widgetMeta.news.summary({feed: 'https://feeds.bbci.co.uk/news/rss.xml'})).toBe('feeds.bbci.co.uk');
		expect(widgetMeta.news.summary({feed: 'not a url'})).toBe('not a url');
		expect(widgetMeta.news.summary({})).toBe('');
	});
	it('farm: level and coins, else the name', () => {
		expect(widgetMeta.farm.summary({farm: {level: 3, coins: 120}})).toBe('Level 3 · 120 coins');
		expect(widgetMeta.farm.summary({})).toBe('Farm');
	});
	it('cactus: name, else the default name', () => {
		expect(widgetMeta.cactus.summary({name: 'Spike'})).toBe('Spike');
		expect(widgetMeta.cactus.summary({})).toBe('My cactus');
	});
});

describe('github prepare', () => {
	it('strips leading @ characters from the user name', () => {
		expect(widgetMeta.github.prepare({user: '@torvalds'})).toEqual({user: 'torvalds'});
		expect(widgetMeta.github.prepare({user: '@@torvalds'}).user).toBe('torvalds');
		expect(widgetMeta.github.prepare({user: 'torvalds'}).user).toBe('torvalds');
	});
});