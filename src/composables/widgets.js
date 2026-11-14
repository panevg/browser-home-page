import { state } from '@/state';
import { uid } from '@/utils/misc';

export function addWidget(type, config) {
  state.widgets.push({ id: uid(), type, config, hidden: false });
}

export function removeWidget(id) {
  const i = state.widgets.findIndex(w => w.id === id);
  if (i >= 0) state.widgets.splice(i, 1);
}
