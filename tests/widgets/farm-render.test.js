import {describe, expect, it, vi} from 'vitest';
import {draw, readColors} from '@/widgets/farm/render';
import {layout} from '@/widgets/farm/layout';
import {normalize} from '@/widgets/farm/game';

// A recording stand-in for CanvasRenderingContext2D (jsdom has no canvas).
function fakeCtx() {
	const calls = [];
	return new Proxy({calls}, {
		get: (t, k) => (k in t ? t[k] : (...a) => calls.push([k, ...a])),
		set: (t, k, v) => ((t[k] = v), true)
	});
}

const T0 = 1_700_000_000_000, C = readColors(document.body);
const render = (farm, now = T0) => {
	const ctx = fakeCtx();
	draw(ctx, 600, 200, farm, now, C, layout(600, 200, farm.pens.length));
	return ctx.calls;
};
const names = calls => calls.map(c => c[0]);

describe('farm drawing', () => {
	it('draws an empty farm: the fence, empty places and the build tile', () => {
		const calls = render(normalize({}, T0));
		expect(names(calls)).toContain('strokeRect');
		expect(calls.filter(c => c[0] === 'fillText').map(c => c[1])).toEqual(['+', '+', '+', '+', '+ 60']);
	});

	it('draws a growing animal with a growth bar, and a grown one with a coin', () => {
		const farm = normalize({pens: [[{s: 'pig', t: T0 - 5 * 60e3, lucky: false}, {s: 'cow', t: T0 - 60 * 60e3, lucky: false}, null, null]]}, T0);
		const calls = render(farm);
		expect(names(calls).filter(n => n === 'ellipse')).toHaveLength(2);
		expect(names(calls).filter(n => n === 'arc')).toHaveLength(3); // two heads + one coin (only the grown animal)
	});

	it('marks lucky animals with a star', () => {
		const lucky = normalize({pens: [[{s: 'chicken', t: T0, lucky: true}, null, null, null]]}, T0);
		expect(render(lucky).some(c => c[0] === 'fillText' && c[1] === '★')).toBe(true);
		const plain = normalize({pens: [[{s: 'chicken', t: T0, lucky: false}, null, null, null]]}, T0);
		expect(render(plain).some(c => c[1] === '★')).toBe(false);
	});

	it('moves animals in a straight line at a constant speed and keeps them inside their place', () => {
		const farm = normalize({pens: [[{s: 'chicken', t: T0, lucky: false}, null, null, null]]}, T0);
		const slot = layout(600, 200, 1)[0].slots[0];
		const xs = [0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30].map(s => render(farm, T0 + s * 1000).find(c => c[0] === 'ellipse')[1]);
		for (const x of xs) {
			expect(x).toBeGreaterThanOrEqual(slot.x);
			expect(x).toBeLessThanOrEqual(slot.x + slot.w);
		}
		const steps = xs.slice(1).map((x, i) => Math.abs(x - xs[i]));
		expect(Math.max(...steps) - Math.min(...steps)).toBeLessThan(1e-6 + Math.max(...steps)); // no easing: equal steps (apart from the turn)
	});

	it('draws a full farm without a build tile', () => {
		const farm = normalize({pens: Array(5).fill([])}, T0);
		expect(render(farm).filter(c => c[0] === 'fillText' && String(c[1]).startsWith('+ '))).toHaveLength(0);
	});

	it('reads theme colours with fallbacks', () => {
		expect(C.card).toBeTruthy();
		expect(C.accent).toBeTruthy();
	});
});
