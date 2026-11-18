import {state} from '@/state';
import {uid} from '@/utils/misc';

/**
 * Puts a new widget on the page (it appears at the end of the list and is loaded on demand).
 * @param {string} type  A widget type: the folder name under `src/widgets/` (see `widgetTypes`).
 * @param {object} config The settings entered in the "new widget" dialog, already passed through the widget's `prepare`.
 * @returns {void}
 * @example
 * addWidget('weather', {location: 'Nitra'});
 */
export function addWidget(type, config) {
	state.widgets.push({id: uid(), type, config, hidden: false});
}

/**
 * Removes the widget with this id together with its saved `config`. An unknown id does nothing.
 * @param {string} id
 * @returns {void}
 */
export function removeWidget(id) {
	const i = state.widgets.findIndex(w => w.id === id);
	if (i >= 0) state.widgets.splice(i, 1);
}