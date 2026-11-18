import {state} from '@/state';
import {uid} from '@/utils/misc';
import {parseWsUrl} from '@/modules/protocol';

/**
 * Adds a module (a panel driven by your WebSocket server, see docs/modules.md). The panel connects when it is shown.
 * @param {{url: string, name?: string}} module `url` is `ws://` or `wss://`; without a scheme `wss://` is assumed.
 *   `name` defaults to the host of the address.
 * @returns {import('@/types').ModuleEntry | null} The new module, or `null` when the address is not valid (nothing is added).
 * @example
 * addModule({url: 'ws://localhost:8787', name: 'Demo'});
 */
export function addModule({url, name}) {
	const p = parseWsUrl(url);
	if (!p) return null;
	state.modules.push({id: uid(), name: String(name || '').trim() || p.host, url: p.url, hidden: false, autoConnect: true, size: 'm', values: {}});
	return state.modules[state.modules.length - 1];
}

/**
 * Removes the module with this id. The panel disconnects when it disappears. An unknown id does nothing.
 * @param {string} id
 * @returns {void}
 */
export function removeModule(id) {
	const i = state.modules.findIndex(m => m.id === id);
	if (i >= 0) state.modules.splice(i, 1);
}

/**
 * Changes the address of a module (a shown panel reconnects to the new one).
 * @param {import('@/types').ModuleEntry} mod The module from `state.modules`.
 * @param {string} input The new `ws://` / `wss://` address.
 * @returns {boolean} `false` (and nothing is changed) when the address is not valid.
 */
export function setModuleUrl(mod, input) {
	const p = parseWsUrl(input);
	if (p) mod.url = p.url;
	return !!p;
}
