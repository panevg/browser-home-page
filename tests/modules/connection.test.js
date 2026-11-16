import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createConnection} from '@/modules/connection';

class FakeWS {
	static all = [];
	readyState = 0;
	sent = [];

	constructor(url) {
		this.url = url;
		FakeWS.all.push(this);
	}

	send(s) {
		this.sent.push(JSON.parse(s));
	}

	close(code) {
		this.readyState = 3;
		this.closeCode = code;
		queueMicrotask(() => this.onclose?.());
	}

	open() {
		this.readyState = 1;
		this.onopen?.();
	}

	recv(m) {
		this.onmessage?.({data: typeof m === 'string' ? m : JSON.stringify(m)});
	}
}

const UI = {type: 'ui', root: {type: 'text', text: 'hi'}};

function setup(options = {}) {
	const log = {status: [], ui: [], data: [], requests: []};
	const conn = createConnection({
		url: 'ws://x', WS: FakeWS, getOptions: () => options,
		handlers: {onStatus: (s, d) => log.status.push(d ? s + ':' + d : s), onUi: m => log.ui.push(m), onData: m => log.data.push(m), onRequest: m => log.requests.push(m)}
	});
	conn.connect();
	return {conn, log, ws: FakeWS.all.at(-1)};
}

beforeEach(() => {
	FakeWS.all = [];
	vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('connection: handshake', () => {
	it('becomes ready after the first ui message', () => {
		const {ws, log, conn} = setup();
		ws.open();
		expect(log.status).toEqual(['connecting', 'waiting']);
		expect(conn.ready).toBe(false);
		ws.recv(UI);
		expect(log.status.at(-1)).toBe('ready');
		expect(conn.ready).toBe(true);
		expect(log.ui).toHaveLength(1);
	});

	it('fails (and does not retry) when the first message is not ui', async () => {
		const {ws, log} = setup();
		ws.open();
		ws.recv({type: 'data', id: 'x', data: 1});
		await vi.runAllTimersAsync();
		expect(log.status).toContain('failed:firstNotUi');
		expect(ws.closeCode).toBe(4000);
		expect(FakeWS.all).toHaveLength(1);
	});

	it.each([['not json', 'protocol'], [{type: 'ui', root: {type: 'script'}}, 'ui'], [{type: 'nope'}, 'protocol']])('fails on a broken message %j', async (msg, detail) => {
		const {ws, log} = setup();
		ws.open();
		ws.recv(msg);
		await vi.runAllTimersAsync();
		expect(log.status).toContain('failed:' + detail);
	});

	it('fails when no ui arrives in time', async () => {
		const {ws, log} = setup({requestTimeout: 3});
		ws.open();
		await vi.advanceTimersByTimeAsync(3100);
		expect(log.status).toContain('failed:noUi');
		expect(ws.closeCode).toBe(4001);
	});

	it('reports an invalid address as failed', () => {
		const log = [];
		createConnection({url: 'x', WS: function () {
			throw new Error('bad');
		}, handlers: {onStatus: (s, d) => log.push(s + ':' + d)}}).connect();
		expect(log).toEqual(['connecting:', 'failed:badUrl']);
	});
});

describe('connection: messages', () => {
	it('routes ui updates, data and server requests to the handlers', () => {
		const {ws, log} = setup();
		ws.open();
		ws.recv(UI);
		ws.recv({type: 'data', id: 'count', data: 5});
		ws.recv({type: 'request', id: 'values', rid: 'r1'});
		ws.recv({...UI, title: 'second'});
		expect(log.data).toEqual([{type: 'data', id: 'count', data: 5, reply: null}]);
		expect(log.requests[0]).toMatchObject({id: 'values', rid: 'r1'});
		expect(log.ui.map(m => m.title)).toEqual(['', 'second']);
	});

	it('sends data and replies only when ready', () => {
		const {ws, conn} = setup();
		ws.open();
		expect(conn.send('a', 1)).toBe(false);
		ws.recv(UI);
		expect(conn.send('chat.say', {msg: 'x'})).toBe(true);
		conn.reply('r1', 7);
		conn.reply('r2', null, 'bad');
		expect(ws.sent).toEqual([
			{v: 1, type: 'data', id: 'chat.say', data: {msg: 'x'}},
			{v: 1, type: 'data', reply: 'r1', data: 7},
			{v: 1, type: 'data', reply: 'r2', error: 'bad'}
		]);
	});

	it('resolves a request with the reply data and rejects with the reply error', async () => {
		const {ws, conn} = setup();
		ws.open();
		ws.recv(UI);
		const ok = conn.request('time', null);
		expect(ws.sent[0]).toMatchObject({type: 'request', id: 'time', rid: 'c1'});
		ws.recv({type: 'data', reply: 'c1', data: 'noon'});
		await expect(ok).resolves.toBe('noon');
		const bad = conn.request('x', 1);
		ws.recv({type: 'data', reply: 'c2', error: 'nope'});
		await expect(bad).rejects.toThrow('nope');
	});

	it('rejects a request on timeout, when offline, and when the socket closes', async () => {
		const {ws, conn} = setup({requestTimeout: 2});
		await expect(conn.request('x')).rejects.toThrow('offline');
		ws.open();
		ws.recv(UI);
		const slow = conn.request('x');
		const caught = slow.catch(e => e.message);
		await vi.advanceTimersByTimeAsync(2100);
		expect(await caught).toBe('timeout');
		const lost = conn.request('y');
		const caught2 = lost.catch(e => e.message);
		ws.close();
		await vi.advanceTimersByTimeAsync(10);
		expect(await caught2).toBe('closed');
	});
});

describe('connection: reconnect and close', () => {
	it('reconnects with a growing delay and resets it after a good connection', async () => {
		const {ws} = setup({reconnect: true, reconnectDelay: 2});
		ws.open();
		ws.recv(UI);
		ws.close();
		await vi.advanceTimersByTimeAsync(10);
		expect(FakeWS.all).toHaveLength(1);
		await vi.advanceTimersByTimeAsync(2000);
		expect(FakeWS.all).toHaveLength(2);
		FakeWS.all[1].close(); // never became ready: next delay is 4 s
		await vi.advanceTimersByTimeAsync(3900);
		expect(FakeWS.all).toHaveLength(2);
		await vi.advanceTimersByTimeAsync(200);
		expect(FakeWS.all).toHaveLength(3);
	});

	it('does not reconnect when it is switched off or after close()', async () => {
		const a = setup({reconnect: false});
		a.ws.open();
		a.ws.recv(UI);
		a.ws.close();
		await vi.advanceTimersByTimeAsync(60000);
		expect(FakeWS.all).toHaveLength(1);

		FakeWS.all = [];
		const b = setup({reconnect: true, reconnectDelay: 1});
		b.ws.open();
		b.ws.recv(UI);
		b.conn.close();
		await vi.advanceTimersByTimeAsync(60000);
		expect(FakeWS.all).toHaveLength(1);
		expect(b.log.status.at(-1)).toBe('closed');
	});
});
