// Applies the UI settings to <html>: attributes drive the CSS in style.css, the accent colour is set as CSS variables.
// Call applyAppearance() once at startup (before mounting, to avoid a flash of the wrong theme); it keeps itself in sync.
import {watchEffect} from 'vue';
import {state} from '@/state';
import {ACCENTS, DEFAULTS} from '@/config/settings';

const ATTRS = {
	theme: 'data-theme',
	searchWidth: 'data-search-width',
	searchShape: 'data-search-shape',
	tileSize: 'data-tile-size'
};

export function applyAppearance(root = document.documentElement) {
	return watchEffect(() => {
		const ui = state.settings.ui;
		for (const [key, attr] of Object.entries(ATTRS)) {
			// The default value means "no attribute": the CSS defaults apply (and `auto` follows the system theme).
			if (ui[key] === DEFAULTS.ui[key]) root.removeAttribute(attr); else root.setAttribute(attr, ui[key]);
		}
		root.toggleAttribute('data-title-off', !ui.showTitle);
		root.toggleAttribute('data-labels-off', !ui.tileLabels);

		const [accent, hover] = ACCENTS[ui.accent];
		if (ui.accent === DEFAULTS.ui.accent) {
			root.style.removeProperty('--accent');
			root.style.removeProperty('--accent-d');
		} else {
			root.style.setProperty('--accent', accent);
			root.style.setProperty('--accent-d', hover);
		}
	});
}