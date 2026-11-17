// Farm game rules. Pure functions: no Vue, no canvas, no timers, so everything here is covered by tests.
// The state lives in the widget config as `config.farm`; every time-dependent value is computed from timestamps,
// so animals keep growing and coins keep arriving while the page is closed.
export const HOUR = 36e5;
export const GROW_MS = 10 * 60e3;               // an animal is fully grown after 10 minutes (a lucky one: 20)
export const PEN_SIZE = 4;                      // animals per pen
export const MAX_PENS = 5;
export const PEN_COSTS = [0, 60, 150, 320, 600]; // price of pen number 1..5 (the first one is free)
export const MAX_PAYOUTS = 64;                  // coins of at most 64 missed hours are paid when you come back
export const SELL_RATE = 0.6;                   // a grown animal sells for 60% of its price: a small amount
export const START_COINS = 40;
export const TIER_EVERY = 5;                    // every 5 levels all prices go up

export const SPECIES = [
	{key: 'chicken', price: 10, unlock: 1},
	{key: 'pig', price: 30, unlock: 2},
	{key: 'sheep', price: 60, unlock: 4},
	{key: 'cow', price: 120, unlock: 7}
];

export const speciesOf = key => SPECIES.find(s => s.key === key);

// ---- Economy ----
export const income = level => 20 + 8 * (level - 1);               // coins per hour
export const tier = level => Math.floor(level / TIER_EVERY);       // 0 below level 5, 1 from level 5, 2 from level 10, ...
export const priceMult = level => 1 + 0.4 * tier(level);           // +40% of the base price per tier
export const priceOf = (key, level) => Math.round(speciesOf(key).price * priceMult(level));
export const sellOf = (animal, level) => Math.max(1, Math.round(priceOf(animal.s, level) * SELL_RATE)) * (animal.lucky ? 2 : 1);
export const penCost = count => PEN_COSTS[count] ?? Infinity;      // `count` = pens you already have

// ---- Animals ----
export const growMs = a => GROW_MS * (a.lucky ? 2 : 1);
export const progress = (a, now) => Math.min(1, Math.max(0, (now - a.t) / growMs(a)));
export const isGrown = (a, now) => progress(a, now) >= 1;

// Animals to sell to reach the next level: one or two kinds, taken from the animals that are already unlocked.
export function quotaOf(level) {
	const open = SPECIES.filter(s => s.unlock <= level);
	const quota = [{s: open[(level - 1) % open.length].key, n: 1 + Math.ceil(level / 2)}];
	if (level >= 3) {
		const k = open[(level + 1) % open.length].key;
		if (k !== quota[0].s) quota.push({s: k, n: 1 + Math.floor(level / 3)});
	}
	return quota;
}

// ---- State ----
const int = (v, d, min = 0) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.floor(v)) : d);

// Turns anything (a missing or damaged config) into a valid farm.
export function normalize(raw, now = Date.now()) {
	const f = raw && typeof raw === 'object' ? raw : {};
	const pens = (Array.isArray(f.pens) ? f.pens : []).slice(0, MAX_PENS).map(p =>
		Array.from({length: PEN_SIZE}, (_, i) => {
			const a = Array.isArray(p) ? p[i] : null;
			return a && speciesOf(a.s) && typeof a.t === 'number' && Number.isFinite(a.t) ? {s: a.s, t: a.t, lucky: a.lucky === true} : null;
		}));
	if (!pens.length) pens.push(Array(PEN_SIZE).fill(null));
	const sold = {};
	for (const sp of SPECIES) if (f.sold && int(f.sold[sp.key], 0) > 0) sold[sp.key] = int(f.sold[sp.key], 0);
	return {
		coins: int(f.coins, START_COINS), level: int(f.level, 1, 1), sold, pens,
		lastPay: typeof f.lastPay === 'number' && Number.isFinite(f.lastPay) ? Math.min(f.lastPay, now) : now,
		luckyTier: int(f.luckyTier, 0)
	};
}

// Pays the hourly coins that are due. Returns the amount paid.
export function tick(f, now) {
	const due = Math.floor((now - f.lastPay) / HOUR);
	if (due <= 0) return 0;
	const n = Math.min(due, MAX_PAYOUTS);
	f.lastPay = due > MAX_PAYOUTS ? now : f.lastPay + due * HOUR;
	const gain = n * income(f.level);
	f.coins += gain;
	return gain;
}

export const nextPayoutMs = (f, now) => Math.max(0, HOUR - (now - f.lastPay));

// Buys an animal into an empty slot. The first animal bought after a price tier was reached is a lucky one:
// it grows twice as long and sells for twice as much.
export function buy(f, key, pen, slot, now) {
	const sp = speciesOf(key), p = f.pens[pen];
	if (!sp || !p || slot < 0 || slot >= PEN_SIZE) return {error: 'slot'};
	if (p[slot]) return {error: 'taken'};
	if (f.level < sp.unlock) return {error: 'locked', level: sp.unlock};
	const cost = priceOf(key, f.level);
	if (f.coins < cost) return {error: 'coins', cost};
	const lucky = tier(f.level) > f.luckyTier;
	if (lucky) f.luckyTier = tier(f.level);
	f.coins -= cost;
	p[slot] = {s: key, t: now, lucky};
	return {ok: true, cost, lucky};
}

// Sells a grown animal. Counts it for the quota and raises the level when the quota is complete.
export function sell(f, pen, slot, now) {
	const a = f.pens[pen]?.[slot];
	if (!a) return {error: 'empty'};
	if (!isGrown(a, now)) return {error: 'growing', left: Math.ceil((1 - progress(a, now)) * growMs(a))};
	const gain = sellOf(a, f.level);
	f.pens[pen][slot] = null;
	f.coins += gain;
	f.sold[a.s] = (f.sold[a.s] || 0) + 1;
	const before = tier(f.level);
	const levelUp = quotaOf(f.level).every(q => (f.sold[q.s] || 0) >= q.n);
	if (levelUp) {
		f.level++;
		f.sold = {};
	}
	return {ok: true, gain, levelUp, tierUp: levelUp && tier(f.level) > before};
}

export function buildPen(f) {
	if (f.pens.length >= MAX_PENS) return {error: 'max'};
	const cost = penCost(f.pens.length);
	if (f.coins < cost) return {error: 'coins', cost};
	f.coins -= cost;
	f.pens.push(Array(PEN_SIZE).fill(null));
	return {ok: true, cost};
}
