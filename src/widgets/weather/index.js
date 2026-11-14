export default {
	order: 20,
	fields: [{key: 'location', labelKey: 'locationLabel', placeholder: 'Berlin', required: true}],
	summary: c => c.location || '',
	component: () => import('./WeatherWidget.vue')
};