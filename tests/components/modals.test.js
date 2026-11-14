import {afterEach, beforeAll, describe, expect, it} from 'vitest';
import {flushPromises, mount} from '@vue/test-utils';
import {loadWidgetPacks, use} from '@/i18n';
import {widgetTypes} from '@/widgets/registry';
import BookmarkModal from '@/components/BookmarkModal.vue';
import WidgetModal from '@/components/WidgetModal.vue';

beforeAll(async () => {
	await use('en-GB');
	await loadWidgetPacks();
});

let wrapper;
afterEach(() => wrapper?.unmount());

describe('BookmarkModal', () => {
	const show = (options = {}) => {
		wrapper = mount(BookmarkModal, options);
		return wrapper;
	};
 
	it('emits the parsed address and the trimmed title', async () => {
		show();
		const [url, title] = wrapper.findAll('input');
		await url.setValue('example.com');
		await title.setValue('  My site ');
		await wrapper.find('form').trigger('submit');
		expect(wrapper.emitted('add')).toEqual([[{
			url: 'https://example.com/',
			host: 'example.com',
			title: 'My site'
		}]]);
	});

	it('emits an empty title when none is given (the page title is looked up later)', async () => {
		show();
		await wrapper.find('input').setValue('example.com');
		await wrapper.find('form').trigger('submit');
		expect(wrapper.emitted('add')[0][0].title).toBe('');
	});

	it('shows an error for an invalid address and clears it when typing', async () => {
		show();
		const url = wrapper.find('input');
		await url.setValue('javascript:alert(1)');
		await wrapper.find('form').trigger('submit');
		expect(wrapper.emitted('add')).toBeUndefined();
		expect(wrapper.find('.form-error').text()).toBe('Enter a valid web address (http or https)');
		await url.setValue('example.com');
		expect(wrapper.find('.form-error').exists()).toBe(false);
	});

	it('closes with the Cancel button and by clicking the backdrop, but not by clicking the dialog', async () => {
		show();
		await wrapper.find('button[type=button]').trigger('click');
		expect(wrapper.emitted('close')).toHaveLength(1);
		await wrapper.find('.modal').trigger('mousedown');
		expect(wrapper.emitted('close')).toHaveLength(1);
		await wrapper.find('.backdrop').trigger('mousedown');
		expect(wrapper.emitted('close')).toHaveLength(2);
	});

	it('focuses the address field', () => {
		show({attachTo: document.body});
		expect(document.activeElement).toBe(wrapper.find('input').element);
	});
});

describe('WidgetModal', () => {
	const show = async () => {
		wrapper = mount(WidgetModal);
		await flushPromises();
		return wrapper;
	};
	const pick = async type => {
		await wrapper.findAll('.choice')[widgetTypes.indexOf(type)].trigger('click');
	};
	const fill = async values => {
		const inputs = wrapper.findAll('label input');
		for (const [i, v] of values.entries()) await inputs[i].setValue(v);
	};
	const submit = () => wrapper.find('form').trigger('submit');

	it('offers every widget type, the first one selected', async () => {
		await show();
		expect(wrapper.findAll('.choice')).toHaveLength(widgetTypes.length);
		expect(wrapper.findAll('.choice.on')).toHaveLength(1);
		expect(wrapper.findAll('.choice')[0].classes()).toContain('on');
	});

	it('adds a widget and cleans the config with `prepare` (@name -> name)', async () => {
		await show();
		await fill(['@@torvalds']);
		await submit();
		expect(wrapper.emitted('add')).toEqual([[{type: 'github', config: {user: 'torvalds'}}]]);
	});

	it('does not submit while a required field is empty', async () => {
		await show();
		await fill(['   ']);
		await submit();
		expect(wrapper.emitted('add')).toBeUndefined();
	});

	it('shows the fields of the picked type and trims their values', async () => {
		await show();
		await pick('rates');
		expect(wrapper.findAll('label input')).toHaveLength(2);
		await fill([' EUR ', ' USD, UAH ']);
		await submit();
		expect(wrapper.emitted('add')).toEqual([[{type: 'rates', config: {base: 'EUR', targets: 'USD, UAH'}}]]);
	});

	it('leaves out optional fields that are empty', async () => {
		await show();
		await pick('news');
		await fill(['https://example.com/rss']);
		await submit();
		expect(wrapper.emitted('add')).toEqual([[{type: 'news', config: {feed: 'https://example.com/rss'}}]]);
	});

	it('adds a widget without fields straight away', async () => {
		await show();
		await pick('calendar');
		expect(wrapper.findAll('label input')).toHaveLength(0);
		await submit();
		expect(wrapper.emitted('add')).toEqual([[{type: 'calendar', config: {}}]]);
	});

	it('forgets typed values when another type is picked', async () => {
		await show();
		await fill(['torvalds']);
		await pick('weather');
		expect(wrapper.find('label input').element.value).toBe('');
		await submit();
		expect(wrapper.emitted('add')).toBeUndefined(); // location is required
	});

	it('closes with Cancel', async () => {
		await show();
		await wrapper.find('button[type=button].btn').trigger('click');
		expect(wrapper.emitted('close')).toHaveLength(1);
	});
});