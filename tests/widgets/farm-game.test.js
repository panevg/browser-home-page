import {describe, expect, it} from 'vitest';
import * as G from '@/widgets/farm/game';
import {hit, layout} from '@/widgets/farm/layout';

const MIN = 60e3, T0 = 1_700_000_000_000;
const farm = (over = {}) => ({...G.normalize({}, T0), ...over});
const grown = (s = 'chicken', lucky = false) => ({s, t: T0 - 25 * MIN, lucky});

describe('farm economy', () => {
	it('income rises with the level', () => {
		expect([1, 2, 5, 10].map(G.income)).toEqual([20, 28, 52, 92]);
	});

	it('all prices rise by one tier every 5 levels', () => {
		expect([1, 4, 5, 9, 10].map(G.tier)).toEqual([0, 0, 1, 1, 2]);
		expect([1, 4, 5, 9, 10].map(l => G.priceOf('chicken', l))).toEqual([10, 10, 14, 14, 18]);
		expect(G.priceOf('cow', 5)).toBe(168);
	});

	it('every animal has its own price, and a grown one sells for a small part of it', () => {
		expect(G.SPECIES.map(s => G.priceOf(s.key, 1))).toEqual([10, 30, 60, 120]);
		expect(G.sellOf({s: 'pig'}, 1)).toBe(18);
		expect(G.sellOf({s: 'pig'}, 1)).toBeLessThan(G.priceOf('pig', 1));
	});

	it('a lucky animal sells for double', () => {
		expect(G.sellOf({s: 'chicken', lucky: true}, 1)).toBe(2 * G.sellOf({s: 'chicken'}, 1));
	});

	it('pens get more expensive; the first one is free', () => {
		expect([1, 2, 3, 4, 5].map(n => G.penCost(n - 1))).toEqual([0, 60, 150, 320, 600]);
		expect(G.penCost(5)).toBe(Infinity);
	});
});

describe('farm quota', () => {
	it('asks for one or two kinds of already unlocked animals', () => {
		expect(G.quotaOf(1)).toEqual([{s: 'chicken', n: 2}]);
		expect(G.quotaOf(2)).toEqual([{s: 'pig', n: 2}]);
		expect(G.quotaOf(3)).toEqual([{s: 'chicken', n: 3}]);
		expect(G.quotaOf(4)).toEqual([{s: 'chicken', n: 3}, {s: 'sheep', n: 2}]);
	});

	it.each([1, 2, 3, 4, 5, 8, 12, 20, 40])('level %i only asks for unlocked animals', level => {
		for (const q of G.quotaOf(level)) {
			expect(G.speciesOf(q.s).unlock).toBeLessThanOrEqual(level);
			expect(q.n).toBeGreaterThan(0);
		}
	});
});

describe('normalize', () => {
	it('starts a new farm: one empty pen, starting coins, level 1', () => {
		const f = G.normalize(undefined, T0);
		expect(f).toEqual({coins: G.START_COINS, level: 1, sold: {}, pens: [[null, null, null, null]], lastPay: T0, luckyTier: 0});
	});

	it.each([null, 5, 'x', [], {pens: 'no'}, {coins: 'many', level: NaN, pens: [[1, 2]]}])('survives damaged data: %j', raw => {
		const f = G.normalize(raw, T0);
		expect(f.pens.length).toBeGreaterThanOrEqual(1);
		expect(f.level).toBeGreaterThanOrEqual(1);
		expect(Number.isFinite(f.coins)).toBe(true);
	});

	it('keeps valid animals and drops unknown species and broken ones', () => {
		const f = G.normalize({pens: [[{s: 'pig', t: 5, lucky: true}, {s: 'dragon', t: 5}, {s: 'cow'}, null, {s: 'cow', t: 1}]], coins: 12.9, level: 3}, T0);
		expect(f.pens[0]).toEqual([{s: 'pig', t: 5, lucky: true}, null, null, null]);
		expect(f.coins).toBe(12);
		expect(f.level).toBe(3);
	});

	it('limits the number of pens and never lets time run backwards', () => {
		expect(G.normalize({pens: Array(9).fill([])}, T0).pens).toHaveLength(G.MAX_PENS);
		expect(G.normalize({lastPay: T0 + 1e9}, T0).lastPay).toBe(T0);
	});

	it('keeps only known, positive quota counters', () => {
		expect(G.normalize({sold: {chicken: 2, dragon: 9, pig: -1}}, T0).sold).toEqual({chicken: 2});
	});
});

describe('hourly payout', () => {
	it('pays nothing before an hour has passed, then pays the income of the level', () => {
		const f = farm({coins: 0});
		expect(G.tick(f, T0 + 59 * MIN)).toBe(0);
		expect(G.tick(f, T0 + 61 * MIN)).toBe(20);
		expect(f.coins).toBe(20);
		expect(f.lastPay).toBe(T0 + G.HOUR);
		expect(G.nextPayoutMs(f, T0 + 61 * MIN)).toBe(59 * MIN);
	});

	it('pays every missed hour, but at most a day', () => {
		const f = farm({coins: 0, level: 2});
		expect(G.tick(f, T0 + 3.5 * G.HOUR)).toBe(3 * 28);
		const g = farm({coins: 0});
		expect(G.tick(g, T0 + 100 * G.HOUR)).toBe(24 * 20);
		expect(g.lastPay).toBe(T0 + 100 * G.HOUR);
		expect(G.tick(g, T0 + 100 * G.HOUR + 30 * MIN)).toBe(0);
	});

	it('does not pay twice for the same hour', () => {
		const f = farm({coins: 0});
		G.tick(f, T0 + 2 * G.HOUR);
		expect(G.tick(f, T0 + 2 * G.HOUR + 1000)).toBe(0);
		expect(f.coins).toBe(40);
	});
});

describe('animals grow', () => {
	it('an animal is grown after 10 minutes, a lucky one after 20', () => {
		const a = {s: 'chicken', t: T0, lucky: false}, l = {...a, lucky: true};
		expect(G.progress(a, T0 + 5 * MIN)).toBeCloseTo(0.5);
		expect(G.isGrown(a, T0 + 9.9 * MIN)).toBe(false);
		expect(G.isGrown(a, T0 + 10 * MIN)).toBe(true);
		expect(G.isGrown(l, T0 + 10 * MIN)).toBe(false);
		expect(G.isGrown(l, T0 + 20 * MIN)).toBe(true);
		expect(G.progress(a, T0 - 5000)).toBe(0);
		expect(G.progress(a, T0 + 99 * MIN)).toBe(1);
	});
});

describe('buy', () => {
	it('puts a new animal in an empty slot and takes the price', () => {
		const f = farm();
		expect(G.buy(f, 'chicken', 0, 2, T0)).toEqual({ok: true, cost: 10, lucky: false});
		expect(f.pens[0][2]).toEqual({s: 'chicken', t: T0, lucky: false});
		expect(f.coins).toBe(30);
	});

	it('refuses: taken slot, bad slot, locked animal, too few coins', () => {
		const f = farm();
		G.buy(f, 'chicken', 0, 0, T0);
		expect(G.buy(f, 'chicken', 0, 0, T0).error).toBe('taken');
		expect(G.buy(f, 'chicken', 0, 9, T0).error).toBe('slot');
		expect(G.buy(f, 'chicken', 3, 0, T0).error).toBe('slot');
		expect(G.buy(f, 'pig', 0, 1, T0)).toEqual({error: 'locked', level: 2});
		expect(G.buy(farm({coins: 5}), 'chicken', 0, 0, T0)).toEqual({error: 'coins', cost: 10});
		expect(f.coins).toBe(30);
	});

	it('no animal is lucky before level 5', () => {
		const f = farm({coins: 999, level: 4});
		expect(G.buy(f, 'chicken', 0, 0, T0).lucky).toBe(false);
		expect(G.buy(f, 'chicken', 0, 1, T0).lucky).toBe(false);
	});

	it('the first animal bought at a new price tier is lucky, the next ones are not', () => {
		const f = farm({coins: 999, level: 5});
		const first = G.buy(f, 'chicken', 0, 0, T0);
		expect(first).toEqual({ok: true, cost: 14, lucky: true}); // paid the raised price
		expect(f.pens[0][0].lucky).toBe(true);
		expect(G.buy(f, 'chicken', 0, 1, T0).lucky).toBe(false);
		expect(G.buy(f, 'pig', 0, 2, T0).lucky).toBe(false);
	});

	it('a failed purchase does not use up the lucky animal', () => {
		const f = farm({coins: 1, level: 5});
		expect(G.buy(f, 'chicken', 0, 0, T0).error).toBe('coins');
		f.coins = 100;
		expect(G.buy(f, 'chicken', 0, 0, T0).lucky).toBe(true);
	});

	it('every further tier brings another lucky animal', () => {
		const f = farm({coins: 9999, level: 5});
		G.buy(f, 'chicken', 0, 0, T0);
		f.level = 10;
		expect(G.buy(f, 'chicken', 0, 1, T0).lucky).toBe(true);
		expect(G.buy(f, 'chicken', 0, 2, T0).lucky).toBe(false);
	});
});

describe('sell', () => {
	it('a growing animal cannot be sold', () => {
		const f = farm();
		G.buy(f, 'chicken', 0, 0, T0);
		const r = G.sell(f, 0, 0, T0 + 4 * MIN);
		expect(r).toEqual({error: 'growing', left: 6 * MIN});
		expect(f.pens[0][0]).not.toBeNull();
	});

	it('a grown animal is sold for a small amount, the slot becomes free and it counts for the quota', () => {
		const f = farm({coins: 0, pens: [[grown(), null, null, null]]});
		const r = G.sell(f, 0, 0, T0);
		expect(r).toMatchObject({ok: true, gain: 6, levelUp: false});
		expect(f.coins).toBe(6);
		expect(f.pens[0][0]).toBeNull();
		expect(f.sold).toEqual({chicken: 1});
		expect(G.sell(f, 0, 0, T0).error).toBe('empty');
	});

	it('animals that are not in the quota are paid but do not count', () => {
		const f = farm({pens: [[grown('chicken'), null, null, null]], level: 2});
		G.sell(f, 0, 0, T0);
		expect(f.level).toBe(2);
		expect(f.sold).toEqual({chicken: 1});
		expect(G.quotaOf(2).map(q => q.s)).toEqual(['pig']);
	});

	it('completing the quota raises the level and starts a new quota', () => {
		const f = farm({coins: 0, pens: [[grown(), grown(), null, null]]});
		expect(G.sell(f, 0, 0, T0).levelUp).toBe(false);
		const r = G.sell(f, 0, 1, T0);
		expect(r).toMatchObject({levelUp: true, tierUp: false});
		expect(f.level).toBe(2);
		expect(f.sold).toEqual({});
		expect(G.income(f.level)).toBeGreaterThan(G.income(1));
	});

	it('needs every kind of animal of a two-kind quota', () => {
		const f = farm({level: 4, pens: [[grown('chicken'), grown('chicken'), grown('chicken'), grown('sheep')], [grown('sheep'), null, null, null]], sold: {}});
		for (let i = 0; i < 3; i++) expect(G.sell(f, 0, i, T0).levelUp).toBe(false); // 3 chickens: half of the quota
		expect(G.sell(f, 0, 3, T0).levelUp).toBe(false);
		expect(G.sell(f, 1, 0, T0).levelUp).toBe(true);
	});

	it('reaching level 5 is reported as a price tier change', () => {
		const f = farm({level: 4, sold: {chicken: 2}, pens: [[grown('chicken'), grown('sheep'), grown('sheep'), null]]});
		G.sell(f, 0, 1, T0);
		const r = G.sell(f, 0, 0, T0);
		expect(r.levelUp).toBe(false);
		G.sell(f, 0, 2, T0);
		expect(f.level).toBe(5);
		expect(G.priceOf('chicken', f.level)).toBe(14);
	});

	it('a lucky animal brings double coins and counts as one', () => {
		const f = farm({coins: 0, pens: [[grown('chicken', true), null, null, null]]});
		expect(G.sell(f, 0, 0, T0).gain).toBe(12);
		expect(f.sold.chicken).toBe(1);
	});
});

describe('build a pen', () => {
	it('costs coins and adds an empty pen, up to the maximum', () => {
		const f = farm({coins: 5000});
		expect(G.buildPen(f)).toEqual({ok: true, cost: 60});
		expect(G.buildPen(f).cost).toBe(150);
		G.buildPen(f);
		G.buildPen(f);
		expect(f.pens).toHaveLength(5);
		expect(G.buildPen(f)).toEqual({error: 'max'});
		expect(f.coins).toBe(5000 - 60 - 150 - 320 - 600);
	});

	it('is refused without enough coins', () => {
		const f = farm({coins: 59});
		expect(G.buildPen(f)).toEqual({error: 'coins', cost: 60});
		expect(f.pens).toHaveLength(1);
	});
});

describe('the first minutes of a game', () => {
	it('start coins buy two chickens; ten minutes later selling them reaches level 2', () => {
		const f = G.normalize({}, T0);
		expect(G.buy(f, 'chicken', 0, 0, T0).ok).toBe(true);
		expect(G.buy(f, 'chicken', 0, 1, T0).ok).toBe(true);
		expect(f.coins).toBe(20);
		expect(G.sell(f, 0, 0, T0 + 9 * MIN).error).toBe('growing');
		G.sell(f, 0, 0, T0 + 10 * MIN);
		G.sell(f, 0, 1, T0 + 10 * MIN);
		expect(f.level).toBe(2);
		expect(f.coins).toBe(32);
		expect(G.tick(f, T0 + G.HOUR)).toBe(28);
	});
});

describe('layout', () => {
	it('has a pen tile per pen and a build tile while there is room', () => {
		expect(layout(600, 200, 1).map(t => t.kind)).toEqual(['pen', 'add']);
		expect(layout(600, 200, 3).map(t => t.kind)).toEqual(['pen', 'pen', 'pen', 'add']);
		expect(layout(600, 200, 5).map(t => t.kind)).toEqual(Array(5).fill('pen'));
	});

	it('every pen has four slots that fit inside its tile', () => {
		for (const t of layout(600, 200, 4).filter(t => t.kind === 'pen')) {
			expect(t.slots).toHaveLength(4);
			for (const s of t.slots) {
				expect(s.x).toBeGreaterThanOrEqual(t.x);
				expect(s.y + s.h).toBeLessThanOrEqual(t.y + t.h);
				expect(s.x + s.w).toBeLessThanOrEqual(t.x + t.w);
			}
		}
	});

	it('uses two columns on a narrow canvas', () => {
		const xs = new Set(layout(380, 200, 3).map(t => Math.round(t.x)));
		expect(xs.size).toBe(2);
	});

	it('finds the slot or the build tile under a point', () => {
		const tiles = layout(600, 200, 1);
		const [s0, s3] = [tiles[0].slots[0], tiles[0].slots[3]];
		expect(hit(tiles, s0.x + 5, s0.y + 5)).toEqual({kind: 'slot', pen: 0, slot: 0});
		expect(hit(tiles, s3.x + s3.w / 2, s3.y + s3.h / 2)).toEqual({kind: 'slot', pen: 0, slot: 3});
		expect(hit(tiles, tiles[1].x + 10, tiles[1].y + 10)).toEqual({kind: 'add'});
		expect(hit(tiles, 1, 1)).toBeNull();
		expect(hit(tiles, 9999, 9999)).toBeNull();
	});
});
