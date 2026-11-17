// Where things are on the canvas. Used both for drawing and for finding what was clicked.
import {MAX_PENS, PEN_SIZE} from './game';

const GAP = 10, PAD = 6;

// Tiles: one per pen, plus a "build a pen" tile while there is room. Each pen tile has PEN_SIZE slots in a 2x2 grid.
export function layout(w, h, penCount) {
	const tiles = penCount + (penCount < MAX_PENS ? 1 : 0);
	const cols = Math.min(tiles, w < 440 ? 2 : 3), rows = Math.ceil(tiles / cols);
	const tw = (w - GAP * (cols + 1)) / cols, th = (h - GAP * (rows + 1)) / rows;
	return Array.from({length: tiles}, (_, i) => {
		const r = {x: GAP + (i % cols) * (tw + GAP), y: GAP + Math.floor(i / cols) * (th + GAP), w: tw, h: th};
		if (i >= penCount) return {kind: 'add', ...r};
		const sw = (r.w - PAD * 3) / 2, sh = (r.h - PAD * 3) / 2;
		const slots = Array.from({length: PEN_SIZE}, (_, k) => ({x: r.x + PAD + (k % 2) * (sw + PAD), y: r.y + PAD + Math.floor(k / 2) * (sh + PAD), w: sw, h: sh}));
		return {kind: 'pen', pen: i, ...r, slots};
	});
}

const inside = (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// What is at (x, y): {kind: 'add'} | {kind: 'slot', pen, slot} | null
export function hit(tiles, x, y) {
	for (const t of tiles) {
		if (!inside(t, x, y)) continue;
		if (t.kind === 'add') return {kind: 'add'};
		const slot = t.slots.findIndex(s => inside({x: s.x - PAD / 2, y: s.y - PAD / 2, w: s.w + PAD, h: s.h + PAD}, x, y));
		return slot >= 0 ? {kind: 'slot', pen: t.pen, slot} : null;
	}
	return null;
}
