// Demo module server for the start page. It has no dependencies (a tiny WebSocket server on node:http).
//   node examples/module-server.mjs [port]      then add  ws://localhost:8787  in the Modules dialog (bottom-left button)
// It shows the whole protocol: the first message is the UI, buttons send data, a button makes a request,
// the server pushes data that the UI is bound to, and "Next page" waits for a new UI. See docs/modules.md.
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

// ---- Minimal WebSocket framing (text frames, no fragmentation, no extensions) ----
function encode(text) {
	const p = Buffer.from(text), n = p.length;
	const head = n < 126 ? Buffer.from([0x81, n])
		: n < 65536 ? Buffer.from([0x81, 126, n >> 8, n & 255])
			: Buffer.concat([Buffer.from([0x81, 127]), (b => (b.writeBigUInt64BE(BigInt(n)), b))(Buffer.alloc(8))]);
	return Buffer.concat([head, p]);
}

function decode(buf) {
	const frames = [];
	for (; ;) {
		if (buf.length < 2) break;
		const op = buf[0] & 15, masked = (buf[1] & 128) !== 0;
		let len = buf[1] & 127, off = 2;
		if (len === 126) {
			if (buf.length < 4) break;
			len = buf.readUInt16BE(2);
			off = 4;
		} else if (len === 127) {
			if (buf.length < 10) break;
			len = Number(buf.readBigUInt64BE(2));
			off = 10;
		}
		const mask = masked ? 4 : 0;
		if (buf.length < off + mask + len) break;
		const payload = Buffer.from(buf.subarray(off + mask, off + mask + len));
		if (masked) for (let i = 0; i < len; i++) payload[i] ^= buf[off + (i % 4)];
		frames.push({op, payload});
		buf = buf.subarray(off + mask + len);
	}
	return {frames, rest: buf};
}

// ---- The module itself: one session per connection ----
function createSession(send) {
	let count = 0;
	const log = [];

	const say = {send: 'chat.say', from: 'msg', clear: ['msg']};
	const home = () => ({
		type: 'ui', title: 'Demo module', root: {
			type: 'column', gap: 'm', children: [
				{type: 'text', text: {bind: 'status', default: 'Connected to the demo server.'}, muted: true},
				{
					type: 'row', children: [
						{type: 'button', text: '−', on: {click: {send: 'counter.dec'}}},
						{type: 'heading', text: {bind: 'count', default: '0'}},
						{type: 'button', text: '+', variant: 'primary', on: {click: {send: 'counter.inc'}}}
					]
				},
				{type: 'input', id: 'msg', label: 'Message (kept after reload)', persist: true, on: {submit: [say]}},
				{type: 'row', children: [
					{type: 'button', text: 'Send', on: {click: [say]}},
					{type: 'button', text: 'Server time', on: {click: {request: 'time', into: 'status'}}},
					{type: 'button', text: 'Next page', on: {click: [{send: 'nav', value: 'about'}, {wait: 'ui'}]}}
				]},
				{type: 'list', items: {bind: 'log', default: []}}
			]
		}
	});
	const about = () => ({
		type: 'ui', title: 'About', root: {
			type: 'column', children: [
				{type: 'heading', text: 'About this demo', level: 2},
				{type: 'text', text: 'This page replaced the previous one because the server sent a new ui message after the button waited for it.'},
				{type: 'button', text: 'Back', on: {click: [{send: 'nav', value: 'home'}, {wait: 'ui'}]}}
			]
		}
	});

	return {
		start: () => send(home()), // the first message of every connection must be a ui
		onMessage(raw) {
			let m;
			try {
				m = JSON.parse(raw);
			} catch {
				return;
			}
			if (m.type === 'data') {
				if (m.id === 'counter.inc' || m.id === 'counter.dec') {
					count += m.id === 'counter.inc' ? 1 : -1;
					send({type: 'data', id: 'count', data: count});
				} else if (m.id === 'chat.say' && typeof m.data === 'string' && m.data.trim()) {
					log.push(m.data.trim().slice(0, 200));
					send({type: 'data', id: 'log', data: log.slice(-8)});
				} else if (m.id === 'nav') send(m.data === 'about' ? about() : home());
			} else if (m.type === 'request') {
				if (m.id === 'time') send({type: 'data', reply: m.rid, data: 'Server time: ' + new Date().toLocaleTimeString()});
				else send({type: 'data', reply: m.rid, error: 'unknown request'});
			}
		}
	};
}

export function startServer(port = 8787) {
	const server = createServer((req, res) => {
		res.writeHead(426, {'content-type': 'text/plain'});
		res.end('This is a WebSocket server.\n');
	});
	server.on('upgrade', (req, socket) => {
		const key = req.headers['sec-websocket-key'];
		if (!key) return socket.destroy();
		const accept = createHash('sha1').update(key + GUID).digest('base64');
		socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
		const session = createSession(obj => socket.writable && socket.write(encode(JSON.stringify(obj))));
		let buf = Buffer.alloc(0);
		socket.on('data', chunk => {
			const r = decode(Buffer.concat([buf, chunk]));
			buf = r.rest;
			for (const f of r.frames) {
				if (f.op === 1) session.onMessage(f.payload.toString());
				else if (f.op === 8) socket.end(Buffer.from([0x88, 0]));
				else if (f.op === 9) socket.write(Buffer.from([0x8a, 0]));
			}
		});
		socket.on('error', () => {});
		session.start();
	});
	return new Promise(resolve => server.listen(port, () => resolve({server, port: server.address().port})));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	startServer(Number(process.argv[2]) || 8787).then(({port}) => console.log(`Module demo server: ws://localhost:${port}`));
}
