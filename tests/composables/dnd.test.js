import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {dnd} from '@/composables/dnd';

const items = (...ids) => ids.map(id => ({id}));
const order = list => list.map(x => x.id).join('');

const dragEvent = () => ({
	preventDefault: vi.fn(),
	currentTarget: {},
	dataTransfer: {effectAllowed: '', setData: vi.fn(), setDragImage: vi.fn()}
});
const touchEvent = (target, point = {clientX: 5, clientY: 5}) => ({target, preventDefault: vi.fn(), touches: [point]});

// The drag state lives in the module, so end any drag that a test left open.
afterEach(() => {
	dnd('x', [], 'x').onDragend();
	dnd('x', [], 'x').onTouchend();
	vi.useRealTimers();
	delete document.elementFromPoint;
});

describe('dnd: attributes', () => {
	it('exposes the group and id as data attributes', () => {
		expect(dnd('bookmarks', [], 'a')).toMatchObject({'data-dnd': 'bookmarks', 'data-id': 'a'});
	});
});

describe('dnd: mouse', () => {
	it('starts a move drag and stores the id', () => {
		const e = dragEvent();
		dnd('bookmarks', items('a'), 'a').onDragstart(e);
		expect(e.dataTransfer.effectAllowed).toBe('move');
		expect(e.dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'a');
		expect(e.dataTransfer.setDragImage).toHaveBeenCalled();
	});

	it('moves the dragged item to the position of the one it is dragged over', () => {
		const list = items('a', 'b', 'c');
		dnd('bookmarks', list, 'a').onDragstart(dragEvent());
		const over = dragEvent();
		dnd('bookmarks', list, 'c').onDragover(over);
		expect(order(list)).toBe('bca');
		expect(over.preventDefault).toHaveBeenCalled();

		dnd('bookmarks', list, 'b').onDragover(dragEvent()); // a is still being dragged
		expect(order(list)).toBe('abc');
	});

	it('moves an item backwards', () => {
		const list = items('a', 'b', 'c');
		dnd('bookmarks', list, 'c').onDragstart(dragEvent());
		dnd('bookmarks', list, 'a').onDragover(dragEvent());
		expect(order(list)).toBe('cab');
	});

	it('ignores dragging over itself', () => {
		const list = items('a', 'b');
		dnd('bookmarks', list, 'a').onDragstart(dragEvent());
		const over = dragEvent();
		dnd('bookmarks', list, 'a').onDragover(over);
		expect(order(list)).toBe('ab');
		expect(over.preventDefault).not.toHaveBeenCalled();
	});

	it('never moves items between groups', () => {
		const bookmarks = items('a', 'b');
		const widgets = items('x', 'y');
		dnd('bookmarks', bookmarks, 'a').onDragstart(dragEvent());
		const over = dragEvent();
		dnd('widgets', widgets, 'y').onDragover(over);
		expect(order(widgets)).toBe('xy');
		expect(order(bookmarks)).toBe('ab');
		expect(over.preventDefault).not.toHaveBeenCalled();
	});

	it('does nothing without an active drag, or after it ended', () => {
		const list = items('a', 'b');
		dnd('bookmarks', list, 'b').onDragover(dragEvent());
		expect(order(list)).toBe('ab');

		dnd('bookmarks', list, 'a').onDragstart(dragEvent());
		dnd('bookmarks', list, 'a').onDragend();
		dnd('bookmarks', list, 'b').onDragover(dragEvent());
		expect(order(list)).toBe('ab');
	});

	it('ignores ids that are not in the list', () => {
		const list = items('a', 'b');
		dnd('bookmarks', list, 'ghost').onDragstart(dragEvent());
		dnd('bookmarks', list, 'b').onDragover(dragEvent());
		expect(order(list)).toBe('ab');
	});
});

describe('dnd: touch', () => {
	let target;
	beforeEach(() => {
		target = document.createElement('div');
		target.dataset.dnd = 'bookmarks';
		target.dataset.id = 'c';
		document.elementFromPoint = vi.fn(() => target);
	});

	it('bookmarks: a long press starts the drag, then moving over another tile reorders', () => {
		vi.useFakeTimers();
		const list = items('a', 'b', 'c');
		const h = dnd('bookmarks', list, 'a');
		h.onTouchstart(touchEvent(document.createElement('div')));
		vi.advanceTimersByTime(350);

		const move = touchEvent(document.body);
		h.onTouchmove(move);
		expect(move.preventDefault).toHaveBeenCalled();
		expect(order(list)).toBe('bca');
	});

	it('bookmarks: moving before the long press is scrolling and does not drag', () => {
		vi.useFakeTimers();
		const list = items('a', 'b', 'c');
		const h = dnd('bookmarks', list, 'a');
		h.onTouchstart(touchEvent(document.createElement('div')));
		h.onTouchmove(touchEvent(document.body));
		vi.advanceTimersByTime(500);
		h.onTouchmove(touchEvent(document.body));
		expect(order(list)).toBe('abc');
	});

	it('bookmarks: lifting the finger before the long press cancels the drag', () => {
		vi.useFakeTimers();
		const list = items('a', 'b', 'c');
		const h = dnd('bookmarks', list, 'a');
		h.onTouchstart(touchEvent(document.createElement('div')));
		h.onTouchend();
		vi.advanceTimersByTime(500);
		h.onTouchmove(touchEvent(document.body));
		expect(order(list)).toBe('abc');
	});

	it('widgets: only the handle starts a drag', () => {
		const list = items('a', 'b', 'c');
		target.dataset.dnd = 'widgets';
		const h = dnd('widgets', list, 'a');

		h.onTouchstart(touchEvent(document.createElement('div')));
		h.onTouchmove(touchEvent(document.body));
		expect(order(list)).toBe('abc');

		const handle = document.createElement('span');
		handle.className = 'handle';
		h.onTouchstart(touchEvent(handle));
		h.onTouchmove(touchEvent(document.body));
		expect(order(list)).toBe('bca');
	});

	it('ignores a touch over a tile of another group, or over the dragged tile itself', () => {
		vi.useFakeTimers();
		const list = items('a', 'b', 'c');
		const h = dnd('bookmarks', list, 'a');
		h.onTouchstart(touchEvent(document.createElement('div')));
		vi.advanceTimersByTime(350);

		target.dataset.dnd = 'widgets';
		h.onTouchmove(touchEvent(document.body));
		target.dataset.dnd = 'bookmarks';
		target.dataset.id = 'a';
		h.onTouchmove(touchEvent(document.body));
		document.elementFromPoint = vi.fn(() => null);
		h.onTouchmove(touchEvent(document.body));
		expect(order(list)).toBe('abc');
	});

	it('touchend ends the drag', () => {
		vi.useFakeTimers();
		const list = items('a', 'b', 'c');
		const h = dnd('bookmarks', list, 'a');
		h.onTouchstart(touchEvent(document.createElement('div')));
		vi.advanceTimersByTime(350);
		h.onTouchend();
		h.onTouchmove(touchEvent(document.body));
		expect(order(list)).toBe('abc');
	});

	it('suppresses the click that follows a touch drag, but only once', () => {
		vi.useFakeTimers();
		const list = items('a', 'b', 'c');
		const h = dnd('bookmarks', list, 'a');
		h.onTouchstart(touchEvent(document.createElement('div')));
		vi.advanceTimersByTime(350);
		h.onTouchmove(touchEvent(document.body));
		h.onTouchend();

		const first = {preventDefault: vi.fn()};
		h.onClick(first);
		expect(first.preventDefault).toHaveBeenCalled();
		const second = {preventDefault: vi.fn()};
		h.onClick(second);
		expect(second.preventDefault).not.toHaveBeenCalled();
	});

	it('a new touch resets a stale "moved" flag so the next tap works', () => {
		vi.useFakeTimers();
		const list = items('a', 'b', 'c');
		const h = dnd('bookmarks', list, 'a');
		h.onTouchstart(touchEvent(document.createElement('div')));
		vi.advanceTimersByTime(350);
		h.onTouchmove(touchEvent(document.body));
		h.onTouchend();
		h.onTouchstart(touchEvent(document.createElement('div'))); // new tap, the old click never came
		h.onTouchend();
		const click = {preventDefault: vi.fn()};
		h.onClick(click);
		expect(click.preventDefault).not.toHaveBeenCalled();
	});

	it('blocks the context menu only during a touch drag', () => {
		vi.useFakeTimers();
		const h = dnd('bookmarks', items('a', 'b'), 'a');
		const idle = {preventDefault: vi.fn()};
		h.onContextmenu(idle);
		expect(idle.preventDefault).not.toHaveBeenCalled();

		h.onTouchstart(touchEvent(document.createElement('div')));
		vi.advanceTimersByTime(350);
		const active = {preventDefault: vi.fn()};
		h.onContextmenu(active);
		expect(active.preventDefault).toHaveBeenCalled();
	});
});