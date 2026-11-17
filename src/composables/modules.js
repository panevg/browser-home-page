import {state} from '@/state';
import {uid} from '@/utils/misc';
import {parseWsUrl} from '@/modules/protocol';

// Adds a module; returns it, or null when the address is not a valid ws:// / wss:// address.
export function addModule({url, name}) {
	const p = parseWsUrl(url);
	if (!p) return null;
	state.modules.push({id: uid(), name: String(name || '').trim() || p.host, url: p.url, hidden: false, autoConnect: true, size: 'm', values: {}});
	return state.modules[state.modules.length - 1];
}

export function removeModule(id) {
	const i = state.modules.findIndex(m => m.id === id);
	if (i >= 0) state.modules.splice(i, 1);
}

// Changes the address of a module; returns false (and changes nothing) for an invalid one.
export function setModuleUrl(mod, input) {
	const p = parseWsUrl(input);
	if (p) mod.url = p.url;
	return !!p;
}
