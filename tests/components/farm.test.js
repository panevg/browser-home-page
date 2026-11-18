import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import {reactive} from 'vue';
import {loadWidgetPacks, use} from '@/i18n';
import FarmWidget from '@/widgets/farm/FarmWidget.vue';
import {layout} from '@/widgets/farm/layout';

const MIN = 60e3;
let wrapper;

beforeAll(async () => {
	await use('en-GB');
	await loadWidgetPacks();
});
beforeEach(() => vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)); // jsdom has no canvas
afterEach(() => {
	wrapper?.unmount();
	vi.restoreAllMocks();
});

const show = (farm) => {
	const config = reactive(farm ? {farm} : {});
	wrapper = mount(FarmWidget, {props: {config}});
	return config;
};
// jsdom has no layout: the component falls back to a 600 x 200 canvas, so these are real canvas coordinates
const click = async (x, y) => wrapper.find('canvas').trigger('click', {clientX: x, clientY: y});
const tiles = () => layout(600, 200, wrapper.vm.f?.pens.length ?? 1);
const slotPoint = (tile, slot) => [tile.slots[slot].x + 8, tile.slots[slot].y + 8];

describe('FarmWidget', () => {
	it('starts a new farm and shows the numbers', () => {
		const config = show();
		expect(config.farm).toMatchObject({coins: 40, level: 1});
		const text = wrapper.text();
		expect(text).toContain('40 coins');
		expect(text).toContain('Level 1');
		expect(text).toContain('+20 / hour');
		expect(wrapper.findAll('.fm-top')[1].text()).toBe('Sell:Chicken 0/2'); // the quota of level 1
	});

	it('shows the animals that can be bought; locked ones are disabled until their level', () => {
		show();
		const buttons = wrapper.findAll('.fm-pick .btn');
		expect(buttons.map(b => b.text())).toEqual(['Chicken · 10', 'Pig · 30', 'Sheep · 60', 'Cow · 120']);
		expect(buttons.map(b => b.attributes('disabled') !== undefined)).toEqual([false, true, true, true]);
	});

	it('pays the hourly coins that arrived while the page was closed', () => {
		const config = show({coins: 0, level: 1, pens: [[null, null, null, null]], lastPay: Date.now() - 3.2 * 36e5});
		expect(config.farm.coins).toBe(60);
		expect(wrapper.text()).toContain('Payout: +60 coins');
	});

	it('buys the selected animal when an empty slot is clicked', async () => {
		const config = show();
		await click(...slotPoint(layout(600, 200, 1)[0], 1));
		expect(config.farm.pens[0][1]).toMatchObject({s: 'chicken', lucky: false});
		expect(config.farm.coins).toBe(30);
		expect(wrapper.text()).toContain('Bought for 10 coins');
	});

	it('does not buy without enough coins', async () => {
		const config = show({coins: 3, level: 1, pens: [[null, null, null, null]], lastPay: Date.now()});
		await click(...slotPoint(layout(600, 200, 1)[0], 0));
		expect(config.farm.pens[0][0]).toBeNull();
		expect(wrapper.text()).toContain('Not enough coins (10 needed)');
	});

	it('does not sell an animal that is still growing', async () => {
		const config = show({coins: 0, level: 1, pens: [[{s: 'chicken', t: Date.now() - 4 * MIN, lucky: false}, null, null, null]], lastPay: Date.now()});
		await click(...slotPoint(layout(600, 200, 1)[0], 0));
		expect(config.farm.pens[0][0]).not.toBeNull();
		expect(wrapper.text()).toContain('Still growing: 6 min left');
	});

	it('sells a grown animal, and levels up when the quota is complete', async () => {
		const grown = () => ({s: 'chicken', t: Date.now() - 11 * MIN, lucky: false});
		const config = show({coins: 0, level: 1, pens: [[grown(), grown(), null, null]], lastPay: Date.now()});
		const tile = layout(600, 200, 1)[0];
		await click(...slotPoint(tile, 0));
		expect(config.farm.coins).toBe(6);
		expect(wrapper.text()).toContain('Sold for 6 coins');
		await click(...slotPoint(tile, 1));
		expect(config.farm.level).toBe(2);
		expect(wrapper.text()).toContain('Level 2! Income is now +28 per hour.');
		expect(wrapper.findAll('.fm-top')[1].text()).toBe('Sell:Pig 0/2'); // the quota of level 2
		expect(wrapper.findAll('.fm-pick .btn')[1].attributes('disabled')).toBeUndefined(); // pigs are unlocked
	});

	it('announces a lucky animal and a price tier', async () => {
		const config = show({coins: 500, level: 5, pens: [[null, null, null, null]], lastPay: Date.now()});
		await click(...slotPoint(layout(600, 200, 1)[0], 0));
		expect(config.farm.pens[0][0].lucky).toBe(true);
		expect(wrapper.text()).toContain('Lucky animal!');
		expect(wrapper.text()).toContain('Chicken · 14');
	});

	it('builds a pen when the + tile is clicked, if there are enough coins', async () => {
		const config = show({coins: 59, level: 1, pens: [[null, null, null, null]], lastPay: Date.now()});
		const add = layout(600, 200, 1)[1];
		await click(add.x + 20, add.y + 20);
		expect(config.farm.pens).toHaveLength(1);
		expect(wrapper.text()).toContain('Not enough coins (60 needed)');
		config.farm.coins = 100;
		await click(add.x + 20, add.y + 20);
		expect(config.farm.pens).toHaveLength(2);
		expect(config.farm.coins).toBe(40);
	});

	it('survives a damaged saved farm', () => {
		const config = show({coins: 'lots', pens: 7, level: -4});
		expect(config.farm.level).toBe(1);
		expect(config.farm.pens).toHaveLength(1);
		expect(wrapper.text()).toContain('Level 1');
	});

	it('stops its timers when it is removed', () => {
		const clear = vi.spyOn(globalThis, 'clearInterval');
		show();
		wrapper.unmount();
		expect(clear).toHaveBeenCalled();
	});
});
