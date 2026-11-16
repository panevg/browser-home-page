import {afterEach, beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {mount} from '@vue/test-utils';
import {reactive} from 'vue';
import {use} from '@/i18n';
import {state} from '@/state';
import ModuleNode from '@/components/ModuleNode.vue';
import ModulesModal from '@/components/ModulesModal.vue';
import {sanitizeNode} from '@/modules/protocol';

beforeAll(() => use('en-GB'));
let wrapper;
afterEach(() => wrapper?.unmount());

const rtFor = (over = {}) => reactive({status: 'ready', pending: false, data: {}, values: {}, run: vi.fn(), setValue: vi.fn(function (id, v) {
	this.values[id] = v;
}), ...over});
const show = (raw, rt) => (wrapper = mount(ModuleNode, {props: {node: sanitizeNode(raw), rt}}));

describe('ModuleNode', () => {
	it('renders text as plain text, never as markup', () => {
		show({type: 'text', text: '<img src=x onerror=alert(1)><b>bold</b>'}, rtFor());
		expect(wrapper.find('img').exists()).toBe(false);
		expect(wrapper.find('b').exists()).toBe(false);
		expect(wrapper.text()).toContain('<b>bold</b>');
	});

	it('shows server data for {bind} and its default before data arrives', async () => {
		const rt = rtFor();
		show({type: 'text', text: {bind: 'count', default: 'zero'}}, rt);
		expect(wrapper.text()).toBe('zero');
		rt.data.count = 5;
		await wrapper.vm.$nextTick();
		expect(wrapper.text()).toBe('5');
	});

	it('runs the click actions of a button, and not while locked', async () => {
		const rt = rtFor();
		show({type: 'button', text: 'Go', on: {click: {send: 'go'}}}, rt);
		await wrapper.find('button').trigger('click');
		expect(rt.run).toHaveBeenCalledWith([expect.objectContaining({do: 'send', id: 'go'})]);
		rt.pending = true;
		await wrapper.vm.$nextTick();
		expect(wrapper.find('button').attributes('disabled')).toBeDefined();
	});

	it('writes input changes to the runtime and submits on Enter', async () => {
		const rt = rtFor({values: {msg: ''}});
		show({type: 'input', id: 'msg', on: {submit: {send: 'say', from: 'msg'}}}, rt);
		await wrapper.find('input').setValue('hi');
		expect(rt.setValue).toHaveBeenCalledWith('msg', 'hi');
		await wrapper.find('input').trigger('keydown.enter');
		expect(rt.run).toHaveBeenCalledTimes(1);
	});

	it('renders nested layouts, lists and only http(s) links', () => {
		show({type: 'column', children: [{type: 'row', children: [{type: 'text', text: 'a'}, {type: 'link', text: 'x', href: 'javascript:alert(1)'}]}, {type: 'list', items: ['one', 'two']}]}, rtFor());
		expect(wrapper.findAll('li').map(l => l.text())).toEqual(['one', 'two']);
		expect(wrapper.find('a').attributes('href')).toBeUndefined();
	});

	it('disables inputs while the connection is not ready', () => {
		show({type: 'checkbox', id: 'c', label: 'Check'}, rtFor({status: 'closed', values: {c: false}}));
		expect(wrapper.find('input').attributes('disabled')).toBeDefined();
	});
});

describe('ModulesModal', () => {
	beforeEach(() => {
		state.modules.splice(0);
	});

	it('adds a module with a valid address and uses the host as the default name', async () => {
		wrapper = mount(ModulesModal);
		await wrapper.find('input[required]').setValue('ws://localhost:8787');
		await wrapper.find('form').trigger('submit');
		expect(state.modules).toHaveLength(1);
		expect(state.modules[0]).toMatchObject({url: 'ws://localhost:8787/', name: 'localhost:8787', autoConnect: true, size: 'm', hidden: false});
	});

	it('rejects an address that is not ws:// or wss://', async () => {
		wrapper = mount(ModulesModal);
		await wrapper.find('input[required]').setValue('http://example.com');
		await wrapper.find('form').trigger('submit');
		expect(state.modules).toHaveLength(0);
		expect(wrapper.find('.form-error').exists()).toBe(true);
	});

	it('edits settings of a module and removes it', async () => {
		state.modules.push({id: 'a', name: 'A', url: 'wss://a.example/', hidden: false, autoConnect: true, size: 'm', values: {}});
		wrapper = mount(ModulesModal);
		await wrapper.findAll('.mitem .btn')[0].trigger('click'); // Settings
		await wrapper.find('.switch').trigger('click');
		await wrapper.findAll('.seg button')[2].trigger('click');
		expect(state.modules[0]).toMatchObject({autoConnect: false, size: 'l'});
		await wrapper.findAll('.mitem .btn')[1].trigger('click'); // Delete
		expect(state.modules).toHaveLength(0);
	});
});
