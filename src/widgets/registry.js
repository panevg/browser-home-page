// Widget registry. Every folder src/widgets/<type>/ that contains an index.js is a widget; nothing else to register.
// index.js default export:
//   { order?, fields, summary(config), prepare?(config), component: () => import('./MyWidget.vue') }
// The component is loaded lazily (own JS + CSS chunk) the first time a widget of that type is rendered.
import {defineAsyncComponent, markRaw} from 'vue';
import WidgetSkeleton from '@/components/WidgetSkeleton.vue';
import WidgetError from '@/components/WidgetError.vue';

const defs = import.meta.glob('./*/index.js', {eager: true, import: 'default'});

export const widgetMeta = {};
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

// Order of the "new widget" picker: by `order` (default 100), then by type name.
export const widgetTypes = Object.keys(widgetMeta).sort(
	(a, b) => (widgetMeta[a].order ?? 100) - (widgetMeta[b].order ?? 100) || a.localeCompare(b)
);