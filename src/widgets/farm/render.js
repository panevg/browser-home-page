// Draws the farm on a canvas. Deliberately primitive: flat shapes, no sprites. Animals only move in a straight line
// back and forth at a constant speed inside their own slot.
import {isGrown, penCost, progress} from './game';

const BODY = {chicken: '#f2c14e', pig: '#f0a6b8', sheep: '#ececec', cow: '#a98467'};
const GOLD = '#e8b923';

// Canvas cannot use CSS variables, so the theme colours are read from the element.
export function readColors(el) {
	const cs = getComputedStyle(el), v = (n, d) => cs.getPropertyValue(n).trim() || d;
	return {bg: v('--soft', '#f0eee6'), card: v('--card', '#ffffff'), line: v('--line', '#e6e3d8'), muted: v('--muted', '#73726c'), text: v('--text', '#141413'), accent: v('--accent', '#d97757')};
}

function animal(ctx, s, a, now, i, C) {
	const p = progress(a, now);
	const size = Math.min(40, Math.min(s.w, s.h) * 0.75) * (0.45 + 0.55 * p); // grows with time
	const span = Math.max(0, s.w - size * 1.5);
	const ph = ((now / 1000) * 0.06 + i * 0.37) % 2, k = ph < 1 ? ph : 2 - ph, dir = ph < 1 ? 1 : -1; // linear ping-pong
	const cx = s.x + size * 0.75 + span * k, cy = s.y + s.h / 2;

	ctx.fillStyle = BODY[a.s] || '#ccc';
	ctx.beginPath();
	ctx.ellipse(cx, cy, size / 2, size * 0.35, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.beginPath();
	ctx.arc(cx + dir * size * 0.42, cy - size * 0.2, size * 0.2, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#222';
	ctx.fillRect(cx + dir * size * 0.5 - 1, cy - size * 0.25, 2, 2);
	if (a.lucky) { // lucky animals have a gold outline and a star
		ctx.strokeStyle = GOLD;
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.ellipse(cx, cy, size / 2 + 1, size * 0.35 + 1, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.fillStyle = GOLD;
		ctx.fillText('★', cx - 4, cy - size * 0.45);
	}
	if (p < 1) { // growth bar
		ctx.fillStyle = C.line;
		ctx.fillRect(s.x + s.w * 0.2, s.y + s.h - 5, s.w * 0.6, 3);
		ctx.fillStyle = C.accent;
		ctx.fillRect(s.x + s.w * 0.2, s.y + s.h - 5, s.w * 0.6 * p, 3);
	} else { // a coin: ready to sell
		ctx.fillStyle = GOLD;
		ctx.beginPath();
		ctx.arc(s.x + s.w - 7, s.y + 8, 4, 0, Math.PI * 2);
		ctx.fill();
	}
}

export function draw(ctx, w, h, farm, now, C, tiles) {
	ctx.clearRect(0, 0, w, h);
	ctx.fillStyle = C.bg;
	ctx.fillRect(0, 0, w, h);
	ctx.font = '13px system-ui, sans-serif';
	ctx.textBaseline = 'middle';
	for (const t of tiles) {
		if (t.kind === 'add') {
			ctx.setLineDash([5, 4]);
			ctx.strokeStyle = C.muted;
			ctx.lineWidth = 1.5;
			ctx.strokeRect(t.x, t.y, t.w, t.h);
			ctx.setLineDash([]);
			ctx.fillStyle = C.muted;
			ctx.textAlign = 'center';
			ctx.fillText('+ ' + penCost(farm.pens.length), t.x + t.w / 2, t.y + t.h / 2);
			continue;
		}
		ctx.fillStyle = C.card;
		ctx.fillRect(t.x, t.y, t.w, t.h);
		ctx.strokeStyle = C.muted;
		ctx.lineWidth = 2;
		ctx.strokeRect(t.x, t.y, t.w, t.h); // the fence
		ctx.textAlign = 'left';
		t.slots.forEach((s, i) => {
			const a = farm.pens[t.pen][i];
			if (a) return animal(ctx, s, a, now, i, C);
			ctx.fillStyle = C.line;
			ctx.textAlign = 'center';
			ctx.fillText('+', s.x + s.w / 2, s.y + s.h / 2); // an empty slot: click to buy
			ctx.textAlign = 'left';
		});
	}
	return farm.pens.flat().some(a => a && isGrown(a, now));
}
