import {wt} from '@/i18n';

/** @type {import('@/types').WidgetDefinition} */
export default {
	order: 80,
	fields: [{key: 'name', labelKey: 'nameLabel', placeholder: 'Spike', required: false}],
	summary: c => c.name || wt('cactus', 'defaultName'),
	component: () => import('./CactusWidget.vue')
};