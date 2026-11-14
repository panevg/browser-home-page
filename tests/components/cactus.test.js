import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';
import {reactive} from 'vue';
import {loadWidgetPacks, use} from '@/i18n';
import CactusWidget from '@/widgets/cactus/CactusWidget.vue';

const HOUR = 36e5;
let wrapper;

beforeAll(async () => {
	await use('en-GB');
	await loadWidgetPacks();
});
afterEach(() => wrapper?.unmount());

const show = (config = {}) => {
	wrapper = mount(CactusWidget, {props: {config: reactive(config)}});
	return wrapper;
};
 
describe('CactusWidget', () => {
	it('plants a new cactus: sets defaults on the config and shows the seed stage', () => {
		const config = reactive({});
		wrapper = mount(CactusWidget, {props: {config}});
		expect(config.planted).toBeGreaterThan(0);
		expect(config.bonus).toBe(0);
		expect(config.last).toEqual({});
		expect(wrapper.text()).toContain('My cactus');
		expect(wrapper.text()).toContain('Seed');
	});

	it('shows a custom name', () => {
		expect(show({name: 'Spike'}).find('h3').text()).toBe('Spike');
	});

	it('grows with real time', () => {
		expect(show({planted: Date.now() - 2 * HOUR}).text()).toContain('Sprout');
		wrapper.unmount();
		expect(show({planted: Date.now() - 100 * HOUR}).text()).toContain('Cactus');
		wrapper.unmount();
		expect(show({planted: Date.now() - 400 * HOUR}).text()).toContain('In bloom');
		expect(wrapper.html()).toContain('#e8739a'); // the flower
	});

	it('has three care actions with SVG icons and no emoji', () => {
		show();
		const buttons = wrapper.findAll('.cx-acts button');
		expect(buttons.map(b => b.text())).toEqual(['Water', 'Sunlight', 'Fertilise']);
		buttons.forEach(b => expect(b.find('svg.cx-ic path').exists()).toBe(true));
		expect(wrapper.text()).not.toMatch(/\p{Extended_Pictographic}/u);
	});

	it('an action adds bonus growth, is saved in the config and is locked for an hour', async () => {
		const config = reactive({});
		wrapper = mount(CactusWidget, {props: {config}});
		const [water, light, feed] = wrapper.findAll('.cx-acts button');

		await water.trigger('click');
		expect(config.bonus).toBe(0.25);
		expect(config.last.water).toBeGreaterThan(0);
		expect(water.attributes('disabled')).toBeDefined();
		expect(water.text()).toContain('in 60 min');

		await water.trigger('click'); // locked: nothing happens
		expect(config.bonus).toBe(0.25);

		await light.trigger('click');
		await feed.trigger('click');
		expect(config.bonus).toBe(1); // 0.25 + 0.25 + 0.5
	});

	it('unlocks an action after an hour', () => {
		show({planted: Date.now() - 10 * HOUR, last: {water: Date.now() - 2 * HOUR}});
		expect(wrapper.findAll('.cx-acts button')[0].attributes('disabled')).toBeUndefined();
	});

	it('stops its timer when removed', () => {
		show();
		expect(() => wrapper.unmount()).not.toThrow();
	});
});