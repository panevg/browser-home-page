export default {
	order: 50,
	fields: [{key: 'title', labelKey: 'titleLabel', placeholder: '', required: false}],
	summary: c => c.title || '',
	component: () => import('./NotesWidget.vue')
};