import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {nextTick, reactive} from 'vue';
import {acquire, createRuntime, release, runtimes} from '@/modules/runtime';
import {FakeWS, UI} from './fakews';

const SETTINGS = {enabled: true, reconnect: false, reconnectDelay: 5, requestTimeout: 3};
const FORM = {
	type: 'column', children: [
		{type: 'input', id: 'msg', value: 'hello', persist: true},
		{type: 'input', id: 'tmp'},
		{type: 'checkbox', id: 'on', value: true},
		{type: 'text', text: {bind: 'count', default: '0'}}
	]
};

function setup(modOverrides = {}, settings = SETTINGS) {
	FakeWS.all = [];
	const mod = reactive({id: 'm1', name: 'Demo', url: 'ws://x/', autoConnect: true, values: {}, ...modOverrides});
	const rt = createRuntime(mod, {getSettings: () => settings, getClient: () => ({lang: 'uk', theme: 'dark'}), WS: FakeWS});
	rt.start();
	const ws = FakeWS.all.at(-1);
	return {mod, rt, ws, serve: (root = FORM, title = '') => (ws?.open(), ws?.recv(UI(root, title)))};
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('runtime: lifecycle', () => {
	it('connects, shows the ui and initialises input values', () => {
		const {rt, serve} = setup();
		expect(rt.status).toBe('connecting');
		serve(FORM, 'Demo title');
		expect(rt.status).toBe('ready');
		expect(rt.title).toBe('Demo title');
		expect(rt.values).toEqual({msg: 'hello', tmp: '', on: true});
	});

	it('stays idle when auto-connect is off and does not connect when modules are disabled', () => {
		expect(setup({autoConnect: false}).rt.status).toBe('idle');
		const off = setup({}, {...SETTINGS, enabled: false});
		expect(off.rt.status).toBe('disabled');
		expect(FakeWS.all).toHaveLength(0);
	});

	it('keeps typed values when a new ui arrives, and drops those whose input disappeared', () => {
		const {rt, ws, serve} = setup();
		serve();
		rt.setValue('msg', 'typed');
		rt.setValue('tmp', 'temp');
		ws.recv(UI({type: 'column', children: [{type: 'input', id: 'msg', value: 'other default'}]}));
		expect(rt.values).toEqual({msg: 'typed'});
	});

	it('saves only `persist` inputs with the module and restores them next time', () => {
		const first = setup();
		first.serve();
		first.rt.setValue('msg', 'saved text');
		first.rt.setValue('tmp', 'not saved');
		expect(first.mod.values).toEqual({msg: 'saved text'});

		const second = setup({values: {...first.mod.values}});
		second.serve();
		expect(second.rt.values.msg).toBe('saved text');
		expect(second.rt.values.tmp).toBe('');
	});

	it('ignores a saved value of the wrong type', () => {
		const {rt, serve} = setup({values: {msg: 42}});
		serve();
		expect(rt.values.msg).toBe('hello');
	});

	it('stores data messages for {bind} and reconnects on connect()', () => {
		const {rt, ws, serve} = setup();
		serve();
		ws.recv({type: 'data', id: 'count', data: 7});
		expect(rt.data.count).toBe(7);
		rt.connect();
		expect(FakeWS.all).toHaveLength(2);
		expect(rt.root).toBeNull();
	});
});

describe('runtime: actions', () => {
	it('send: collects values with `from`, sends them with the id and clears inputs', async () => {
		const {rt, ws, serve} = setup();
		serve();
		rt.setValue('msg', 'hi there');
		await rt.run([{do: 'send', id: 'chat.say', from: ['msg', 'on', 'missing'], value: undefined, clear: ['msg']}]);
		expect(ws.sent).toEqual([{v: 1, type: 'data', id: 'chat.say', data: {msg: 'hi there', on: true}}]);
		expect(rt.values.msg).toBe('hello'); // back to the initial value
		expect(rt.error).toBe('');
	});

	it('send: a single component id sends its value; a literal `value` wins', async () => {
		const {rt, ws, serve} = setup();
		serve();
		await rt.run([{do: 'send', id: 'a', from: 'msg', value: undefined, clear: []}, {do: 'send', id: 'b', from: 'msg', value: {x: 1}, clear: []}, {do: 'send', id: 'c', from: null, value: undefined, clear: []}]);
		expect(ws.sent.map(m => m.data)).toEqual(['hello', {x: 1}, null]);
	});

	it('reports `offline` when not connected', async () => {
		const {rt} = setup({autoConnect: false});
		await rt.run([{do: 'send', id: 'a', from: null, value: undefined, clear: []}]);
		expect(rt.error).toBe('offline');
	});

	it('request: stores the reply in data[into]', async () => {
		const {rt, ws, serve} = setup();
		serve();
		const p = rt.run([{do: 'request', id: 'time', from: null, value: undefined, into: 'now'}]);
		ws.recv({type: 'data', reply: ws.sent[0].rid, data: 'noon'});
		await p;
		expect(rt.data.now).toBe('noon');
	});

	it('request: a reply with an error is shown as the module error', async () => {
		const {rt, ws, serve} = setup();
		serve();
		const p = rt.run([{do: 'request', id: 'x', from: null, value: undefined, into: null}]);
		ws.recv({type: 'data', reply: ws.sent[0].rid, error: 'Server says no'});
		await p;
		expect(rt.error).toBe('Server says no');
	});

	it('wait: blocks until the next ui, then runs the following steps', async () => {
		const {rt, ws, serve} = setup();
		serve();
		const p = rt.run([{do: 'send', id: 'nav', from: null, value: 'about', clear: []}, {do: 'wait'}, {do: 'send', id: 'after', from: null, value: undefined, clear: []}]);
		await nextTick();
		expect(rt.pending).toBe(true);
		expect(ws.sent.map(m => m.id)).toEqual(['nav']);
		ws.recv(UI({type: 'text', text: 'page 2'}));
		await p;
		expect(rt.pending).toBe(false);
		expect(ws.sent.map(m => m.id)).toEqual(['nav', 'after']);
	});

	it('wait: times out with an error', async () => {
		const {rt, serve} = setup();
		serve();
		const p = rt.run([{do: 'wait'}]);
		await vi.advanceTimersByTimeAsync(3100);
		await p;
		expect(rt.error).toBe('timeout');
		expect(rt.pending).toBe(false);
	});

	it('wait: is cancelled when the connection drops', async () => {
		const {rt, ws, serve} = setup();
		serve();
		const p = rt.run([{do: 'wait'}]);
		ws.close();
		await vi.advanceTimersByTimeAsync(10);
		await p;
		expect(rt.error).toBe('closed');
		expect(rt.pending).toBe(false);
	});
});

describe('runtime: requests from the server', () => {
	const ask = (ws, id, data) => ws.recv({type: 'request', id, rid: 'r9', data});
	const answer = ws => ws.sent.find(m => m.reply === 'r9');

	it('values / value / client', () => {
		const {ws, serve, rt} = setup();
		serve();
		rt.setValue('msg', 'abc');
		ask(ws, 'values');
		expect(answer(ws).data).toEqual({msg: 'abc', tmp: '', on: true});
		ws.sent.length = 0;
		ask(ws, 'value', 'msg');
		expect(answer(ws).data).toBe('abc');
		ws.sent.length = 0;
		ask(ws, 'client');
		expect(answer(ws).data).toEqual({protocol: 1, lang: 'uk', theme: 'dark'});
	});

	it('answers unknown requests and unknown components with an error', () => {
		const {ws, serve} = setup();
		serve();
		ask(ws, 'launch-missiles');
		expect(answer(ws).error).toBe('unknown request');
		ws.sent.length = 0;
		ask(ws, 'value', 'toString');
		expect(answer(ws).error).toBe('unknown component');
	});
});

describe('acquire / release', () => {
	it('registers the runtime by module id and disconnects on release', () => {
		FakeWS.all = [];
		vi.stubGlobal('WebSocket', FakeWS);
		const mod = reactive({id: 'acq', name: 'A', url: 'ws://x/', autoConnect: true, values: {}});
		const rt = acquire(mod, {getSettings: () => SETTINGS, getClient: () => ({}), WS: FakeWS});
		expect(runtimes.acq).toBe(rt);
		release('acq');
		expect(runtimes.acq).toBeUndefined();
		expect(FakeWS.all[0].closeCode).toBe(1000);
		vi.unstubAllGlobals();
	});
});
