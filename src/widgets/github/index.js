/** @type {import('@/types').WidgetDefinition} */
export default {
	order: 10,
	fields: [{key: 'user', labelKey: 'userLabel', placeholder: 'torvalds', required: true}],
	summary: c => '@' + (c.user || ''),
	prepare: c => ({...c, user: c.user.replace(/^@+/, '')}), // "@torvalds" -> "torvalds"
	component: () => import('./GithubWidget.vue')
};