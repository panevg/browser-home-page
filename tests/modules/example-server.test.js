// @vitest-environment node
// End to end: the real client connection talks to the real example server over a real WebSocket (Node 22+ has one built in).
import {afterAll, beforeAll, describe, expect, it} from 'vitest';
import {startServer} from '../../examples/module-server.mjs';
import {createConnection} from '@/modules/connection';

describe.skipIf(typeof WebSocket === 'undefined')('example module server', () => {
	let srv, conn;
	const uis = [], data = [], statuses = [];
	const until = async (fn, ms = 3000) => {
		const t = Date.now();
		while (!fn()) {
			if (Date.now() - t > ms) throw new Error('timeout');
			await new Promise(r => setTimeout(r, 10));
		}
	};

	beforeAll(async () => {
		srv = await startServer(0);
		conn = createConnection({
			url: `ws://localhost:${srv.port}`, WS: WebSocket, getOptions: () => ({reconnect: false, requestTimeout: 3}),
			handlers: {onStatus: s => statuses.push(s), onUi: m => uis.push(m), onData: m => data.push(m)}
		});
		conn.connect();
		await until(() => conn.ready);
	});
	afterAll(() => {
		conn?.close();
		srv?.server.close();
	});

	it('sends the interface first', () => {
		expect(statuses).toContain('ready');
		expect(uis[0].title).toBe('Demo module');
		expect(uis[0].root.type).toBe('column');
	});

	it('answers data messages with data messages', async () => {
		conn.send('counter.inc', null);
		conn.send('counter.inc', null);
		await until(() => data.some(d => d.id === 'count' && d.data === 2));
		conn.send('chat.say', '  hello  ');
		await until(() => data.some(d => d.id === 'log' && d.data.includes('hello')));
	});

	it('answers requests, including unknown ones', async () => {
		await expect(conn.request('time', null)).resolves.toMatch(/^Server time:/);
		await expect(conn.request('nope', null)).rejects.toThrow('unknown request');
	});

	it('replaces the interface when asked to navigate', async () => {
		conn.send('nav', 'about');
		await until(() => uis.length === 2);
		expect(uis[1].title).toBe('About');
	});
});
