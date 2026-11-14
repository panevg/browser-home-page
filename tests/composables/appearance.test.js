import {afterEach, beforeEach, describe, expect, it} from 'vitest';
import {nextTick} from 'vue';
import {state} from '@/state';
import {DEFAULTS} from '@/config/settings';
import {applyAppearance} from '@/composables/appearance';

let root, stop;
beforeEach(() => {
	Object.assign(state.settings.ui, DEFAULTS.ui);
	root = document.createElement('html');
	stop = applyAppearance(root);
});
afterEach(() => stop());

describe('applyAppearance', () => {
	it('leaves the root untouched with default settings', () => {
		expect(root.getAttributeNames()).toEqual([]);
		expect(root.style.getPropertyValue('--accent')).toBe('');
	});
 
	it('sets attributes for non-default choices and removes them again', async () => {
		state.settings.ui.theme = 'dark';
		state.settings.ui.searchWidth = 'l';
		state.settings.ui.showTitle = false;
		state.settings.ui.tileLabels = false;
		await nextTick();
		expect(root.getAttribute('data-theme')).toBe('dark');
		expect(root.getAttribute('data-search-width')).toBe('l');
		expect(root.hasAttribute('data-title-off')).toBe(true);
		expect(root.hasAttribute('data-labels-off')).toBe(true);

		Object.assign(state.settings.ui, DEFAULTS.ui);
		await nextTick();
		expect(root.getAttributeNames()).toEqual([]);
	});

	it('sets the accent colour variables', async () => {
		state.settings.ui.accent = 'blue';
		await nextTick();
		expect(root.style.getPropertyValue('--accent')).toBe('#4f7fd9');
		expect(root.style.getPropertyValue('--accent-d')).toBe('#3d68b8');
		state.settings.ui.accent = 'terracotta';
		await nextTick();
		expect(root.style.getPropertyValue('--accent')).toBe('');
	});
});