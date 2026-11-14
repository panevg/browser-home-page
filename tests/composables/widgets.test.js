import { beforeEach, describe, expect, it } from 'vitest';
import { state } from '@/state';
import { addWidget, removeWidget } from '@/composables/widgets';

beforeEach(() => state.widgets.splice(0));

describe('addWidget', () => {
  it('appends a visible widget with a generated id', () => {
    addWidget('todo', { items: [] });
    expect(state.widgets).toHaveLength(1);
    expect(state.widgets[0]).toMatchObject({ type: 'todo', config: { items: [] }, hidden: false });
    expect(state.widgets[0].id).toBeTruthy();
  });

  it('allows several widgets of the same type, each with its own id', () => {
    addWidget('notes', {});
    addWidget('notes', {});
    expect(state.widgets).toHaveLength(2);
    expect(state.widgets[0].id).not.toBe(state.widgets[1].id);
  });
});

describe('removeWidget', () => {
  it('removes the widget with the given id', () => {
    addWidget('notes', {});
    addWidget('todo', {});
    removeWidget(state.widgets[0].id);
    expect(state.widgets.map(w => w.type)).toEqual(['todo']);
  });

  it('does nothing for an unknown id (it must not delete the last item)', () => {
    addWidget('notes', {});
    addWidget('todo', {});
    removeWidget('missing');
    expect(state.widgets).toHaveLength(2);
  });
});
