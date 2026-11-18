/** @type {import('@/types').WidgetDefinition} */
export default {
	order: 60,
	fields: [
		{key: 'base', labelKey: 'baseLabel', placeholder: 'EUR', required: true},
		{key: 'targets', labelKey: 'targetsLabel', placeholder: 'USD, UAH, CZK', required: true}
	],
	summary: c => (c.base || '').toUpperCase() + ' → ' + (c.targets || '').toUpperCase(),
	component: () => import('./RatesWidget.vue')
};