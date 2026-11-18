/**
 * Widget registry.
 *
 * Every folder `src/widgets/<type>/` that contains an `index.js` is a widget; nothing else has to be registered.
 * The folder name is the widget *type*: it is saved in the user's state, so never rename it.
 * `index.js` default-exports a `WidgetDefinition` (see src/types.js). Its component is loaded lazily, as its own JS and
 * CSS chunk, the first time a widget of that type is rendered. Guide: docs/widgets.md
 */
import {defineAsyncComponent, markRaw} from 'vue';
import WidgetSkeleton from '@/components/WidgetSkeleton.vue';
import WidgetError from '@/components/WidgetError.vue';

const defs = /** @type {Record<string, import('@/types').WidgetDefinition>} */ (import.meta.glob('./*/index.js', {eager: true, import: 'default'}));

/** Definitions by type. @type {Record<string, import('@/types').WidgetDefinition>} */
export const widgetMeta = {};
/** Async components by type, wrapped with a loading skeleton and an error placeholder. @type {Record<string, import('vue').Component>} */
export const components = {};

for (const [path, def] of Object.entries(defs)) {
	const type = path.split('/')[1];
	widgetMeta[type] = def;
	components[type] = markRaw(defineAsyncComponent({
		loader: def.component,
		loadingComponent: WidgetSkeleton,
		errorComponent: WidgetError,
		delay: 0
	}));
}

/** Types in the order of the "new widget" picker: by `order` (default 100), then by name. @type {string[]} */
export const widgetTypes = Object.keys(widgetMeta).sort(
	(a, b) => (widgetMeta[a].order ?? 100) - (widgetMeta[b].order ?? 100) || a.localeCompare(b)
);