export default {
	order: 70,
	fields: [
		{key: 'feed', labelKey: 'feedLabel', placeholder: 'https://feeds.bbci.co.uk/news/rss.xml', required: true},
		{key: 'title', labelKey: 'titleLabel', placeholder: '', required: false}
	],
	summary: c => {
		try {
			return c.title || new URL(c.feed).hostname;
		} catch {
			return c.feed || '';
		}
	},
	component: () => import('./NewsWidget.vue')
};