import {wt} from '@/i18n';

export default {
	order: 90,
	fields: [],
	summary: c => (c.farm ? wt('farm', 'summary', {level: c.farm.level, coins: c.farm.coins}) : wt('farm', 'name')),
	component: () => import('./FarmWidget.vue')
};
