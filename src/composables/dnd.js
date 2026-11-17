// Drag & drop reordering. dnd(group, list, id) returns the attributes / handlers for ONE item (use with v-bind).
// Items move only inside their own group ('bookmarks', 'widgets' or 'modules').
let drag = null, timer = null, moved = false;

function reorder(list, from, to) {
	const a = list.findIndex(x => x.id === from), b = list.findIndex(x => x.id === to);
	if (a >= 0 && b >= 0 && a !== b) list.splice(b, 0, list.splice(a, 1)[0]);
}

export function dnd(group, list, id) {
	return {
		'data-dnd': group,
		'data-id': id,
		// Mouse (HTML5 drag & drop)
		onDragstart(e) {
			drag = {group, id};
			e.dataTransfer.effectAllowed = 'move';
			e.dataTransfer.setData('text/plain', id);
			e.dataTransfer.setDragImage(e.currentTarget, 16, 16);
		},
		onDragover(e) {
			if (!drag || drag.group !== group || drag.id === id) return;
			e.preventDefault();
			reorder(list, drag.id, id);
		},
		onDragend() {
			drag = null;
		},
		// Touch: widgets are dragged by their handle, bookmarks by a long press (scrolling and taps keep working)
		onTouchstart(e) {
			moved = false; // a stale flag must never swallow a later tap
			const start = () => {
				drag = {group, id, touch: true};
				navigator.vibrate?.(10);
			};
			if (group !== 'bookmarks') { // widgets and modules: by the handle
				if (e.target.closest('.handle')) start();
			} else {
				clearTimeout(timer);
				timer = setTimeout(start, 350);
			}
		},
		onTouchmove(e) {
			if (!drag || !drag.touch) {
				clearTimeout(timer);
				return;
			} // moved before the long press = scrolling
			e.preventDefault();
			const t = e.touches[0];
			const el = document.elementFromPoint(t.clientX, t.clientY)?.closest('[data-dnd]');
			if (el && el.dataset.dnd === group && el.dataset.id !== drag.id) {
				reorder(list, drag.id, el.dataset.id);
				moved = true;
			}
		},
		onTouchend() {
			clearTimeout(timer);
			if (drag?.touch) drag = null;
		},
		onContextmenu(e) {
			if (drag?.touch) e.preventDefault();
		},
		onClick(e) {
			if (moved) {
				e.preventDefault();
				moved = false;
			}
		} // no navigation after a touch drag
	};
}