export default {
	order: 40,
	fields: [],
	summary: c => {
		const a = c.items || [];
		return a.filter(i => !i.done).length + ' / ' + a.length;
	},
	component: () => import('./TodoWidget.vue')
};