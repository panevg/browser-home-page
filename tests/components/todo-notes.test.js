import {beforeAll, describe, expect, it} from 'vitest';
import {mount} from '@vue/test-utils';
import {reactive} from 'vue';
import {loadWidgetPacks, use} from '@/i18n';
import TodoWidget from '@/widgets/todo/TodoWidget.vue';
import NotesWidget from '@/widgets/notes/NotesWidget.vue';

beforeAll(async () => {
	await use('en-GB');
	await loadWidgetPacks();
});

describe('TodoWidget', () => {
	const show = (config = {}) => mount(TodoWidget, {props: {config: reactive(config)}});

	it('shows an empty state and creates the list in the config', () => {
		const config = reactive({});
		const w = mount(TodoWidget, {props: {config}});
		expect(config.items).toEqual([]);
		expect(w.find('.td-empty').text()).toBe('Nothing to do');
	});
 
	it('adds a trimmed task and clears the field', async () => {
		const config = reactive({});
		const w = mount(TodoWidget, {props: {config}});
		await w.find('.td-add input').setValue('  Buy milk  ');
		await w.find('form').trigger('submit');
		expect(config.items).toHaveLength(1);
		expect(config.items[0]).toMatchObject({text: 'Buy milk', done: false});
		expect(w.find('.td-add input').element.value).toBe('');
		expect(w.find('.td-empty').exists()).toBe(false);
		expect(w.findAll('li')).toHaveLength(1);
	});

	it('ignores blank input', async () => {
		const config = reactive({});
		const w = mount(TodoWidget, {props: {config}});
		await w.find('.td-add input').setValue('   ');
		await w.find('form').trigger('submit');
		expect(config.items).toEqual([]);
	});

	it('marks a task as done', async () => {
		const config = reactive({items: [{id: 'a', text: 'Task', done: false}]});
		const w = mount(TodoWidget, {props: {config}});
		await w.find('input[type=checkbox]').setValue(true);
		expect(config.items[0].done).toBe(true);
		expect(w.find('li').classes()).toContain('done');
	});

	it('deletes a task', async () => {
		const config = reactive({items: [{id: 'a', text: 'One', done: false}, {id: 'b', text: 'Two', done: false}]});
		const w = mount(TodoWidget, {props: {config}});
		await w.findAll('.td-x')[0].trigger('click');
		expect(config.items.map(i => i.text)).toEqual(['Two']);
	});

	it('renders existing tasks', () => {
		const w = show({items: [{id: 'a', text: 'One', done: true}]});
		expect(w.find('li').text()).toContain('One');
		expect(w.find('input[type=checkbox]').element.checked).toBe(true);
	});
});

describe('NotesWidget', () => {
	it('shows the saved text and the optional title', () => {
		const w = mount(NotesWidget, {props: {config: {text: 'Remember', title: 'Ideas'}}});
		expect(w.find('textarea').element.value).toBe('Remember');
		expect(w.find('b').text()).toBe('Ideas');
	});

	it('has no title element and an empty field by default', () => {
		const w = mount(NotesWidget, {props: {config: {}}});
		expect(w.find('b').exists()).toBe(false);
		expect(w.find('textarea').element.value).toBe('');
		expect(w.find('textarea').attributes('placeholder')).toBe('Write something…');
	});

	it('saves every keystroke into the config', async () => {
		const config = reactive({});
		const w = mount(NotesWidget, {props: {config}});
		await w.find('textarea').setValue('Hello');
		expect(config.text).toBe('Hello');
	});
});