import {describe, expect, it} from 'vitest';
import {LIMITS, parseMessage, parseWsUrl, sanitizeNode, isId, dataMsg, requestMsg, replyMsg} from '@/modules/protocol';

const ui = root => JSON.stringify({type: 'ui', root});

describe('parseWsUrl', () => {
	it.each([
		['ws://localhost:8787', 'ws://localhost:8787/', 'localhost:8787'],
		['wss://example.com/mod?x=1', 'wss://example.com/mod?x=1', 'example.com'],
		['example.com/mod', 'wss://example.com/mod', 'example.com']
	])('accepts %s', (input, url, host) => expect(parseWsUrl(input)).toEqual({url, host}));

	it.each(['', '  ', 'http://example.com', 'https://example.com', 'javascript:alert(1)', 'ftp://x.org', 'ws://', null, undefined])('rejects %j', v => expect(parseWsUrl(v)).toBeNull());
});

describe('isId', () => {
	it('accepts simple identifiers', () => ['a', 'chat.say', 'a-b_c:1'].forEach(v => expect(isId(v)).toBe(true)));
	it('rejects empty, long, odd and prototype names', () => ['', 'a b', 'x'.repeat(65), '__proto__', 'constructor', 5, null].forEach(v => expect(isId(v)).toBe(false)));
});

describe('parseMessage', () => {
	it.each([['{broken'], ['null'], ['[]'], ['"x"'], [new ArrayBuffer(2)]])('rejects %j', raw => expect(parseMessage(raw).error).toBeTruthy());
	it('rejects unknown types and oversized messages', () => {
		expect(parseMessage('{"type":"eval"}')).toEqual({error: 'type'});
		expect(parseMessage('x'.repeat(LIMITS.message + 1))).toEqual({error: 'size'});
	});
	it('parses ui, data, request and replies', () => {
		expect(parseMessage(ui({type: 'text', text: 'hi'})).msg).toMatchObject({type: 'ui', root: {type: 'text', text: 'hi'}});
		expect(parseMessage('{"type":"data","id":"count","data":3}').msg).toEqual({type: 'data', id: 'count', data: 3, reply: null});
		expect(parseMessage('{"type":"request","id":"values","rid":"r1"}').msg).toMatchObject({type: 'request', id: 'values', rid: 'r1'});
		expect(parseMessage('{"type":"data","reply":"c1","data":{"a":1}}').msg).toEqual({type: 'data', reply: 'c1', data: {a: 1}, error: ''});
		expect(parseMessage('{"type":"data","reply":"c1","error":"nope"}').msg.error).toBe('nope');
	});
	it('requires identifiers', () => {
		expect(parseMessage('{"type":"data"}')).toEqual({error: 'id'});
		expect(parseMessage('{"type":"request","id":"x"}')).toEqual({error: 'id'});
	});
	it('rejects a ui without a usable root', () => {
		expect(parseMessage(ui({type: 'script'}))).toEqual({error: 'ui'});
		expect(parseMessage('{"type":"ui"}')).toEqual({error: 'ui'});
	});
});

describe('sanitizeNode', () => {
	it('keeps only known components and known fields', () => {
		const n = sanitizeNode({type: 'column', style: 'color:red', onclick: 'x()', children: [{type: 'text', text: 'a', className: 'evil'}, {type: 'iframe'}, {type: 'script'}]});
		expect(n).toEqual({type: 'column', gap: 'm', children: [{type: 'text', text: 'a', muted: false, mono: false}]});
	});
	it('renders numbers as text and cuts long text', () => {
		expect(sanitizeNode({type: 'text', text: 42}).text).toBe('42');
		expect(sanitizeNode({type: 'text', text: 'x'.repeat(LIMITS.text + 50)}).text).toHaveLength(LIMITS.text);
	});
	it('accepts only http(s) links and images', () => {
		expect(sanitizeNode({type: 'link', text: 'a', href: 'javascript:alert(1)'}).href).toBe('');
		expect(sanitizeNode({type: 'link', text: 'a', href: 'https://example.com'}).href).toBe('https://example.com/');
		expect(sanitizeNode({type: 'image', src: 'data:image/svg+xml,<svg onload=x>'}).src).toBe('');
	});
	it('supports {bind} for text, progress and lists', () => {
		expect(sanitizeNode({type: 'text', text: {bind: 'count', default: 0}}).text).toEqual({bind: 'count', default: '0'});
		expect(sanitizeNode({type: 'progress', value: {bind: 'p'}}).value).toEqual({bind: 'p', default: 0});
		expect(sanitizeNode({type: 'list', items: {bind: 'log'}}).items).toEqual({bind: 'log', default: []});
		expect(sanitizeNode({type: 'text', text: {bind: '__proto__'}}).text).toBe('');
	});
	it('clamps progress and slider values', () => {
		expect(sanitizeNode({type: 'progress', value: 500}).value).toBe(100);
		expect(sanitizeNode({type: 'slider', id: 's', min: 0, max: 10, step: 0, value: 99})).toMatchObject({min: 0, max: 10, step: 1, value: 10});
		expect(sanitizeNode({type: 'slider', id: 's', min: 5, max: 5}).max).toBe(105);
	});
	it('requires a unique id for inputs', () => {
		expect(sanitizeNode({type: 'input'})).toBeNull();
		expect(sanitizeNode({type: 'input', id: 'a b'})).toBeNull();
		const col = sanitizeNode({type: 'column', children: [{type: 'input', id: 'a'}, {type: 'checkbox', id: 'a'}, {type: 'checkbox', id: 'b'}]});
		expect(col.children.map(c => c.id)).toEqual(['a', 'b']);
	});
	it('falls back to a valid select value', () => {
		expect(sanitizeNode({type: 'select', id: 's', options: ['a', {value: 'b', label: 'B'}], value: 'zzz'})).toMatchObject({value: 'a', options: [{value: 'a', label: 'a'}, {value: 'b', label: 'B'}]});
	});
	it('limits depth and node count', () => {
		let deep = {type: 'text', text: 'leaf'};
		for (let i = 0; i < LIMITS.depth + 3; i++) deep = {type: 'column', children: [deep]};
		const walk = n => (n.children?.[0] ? 1 + walk(n.children[0]) : 0);
		expect(walk(sanitizeNode(deep))).toBeLessThanOrEqual(LIMITS.depth);
		const wide = sanitizeNode({type: 'column', children: Array.from({length: LIMITS.nodes + 100}, () => ({type: 'divider'}))});
		expect(wide.children.length).toBeLessThan(LIMITS.nodes);
	});
	it('normalises actions', () => {
		const b = sanitizeNode({type: 'button', text: 'Go', on: {click: [{send: 'a', from: ['x', 'bad id'], clear: ['x']}, {request: 'r', into: 'out'}, {wait: 'ui'}, {run: 'evil'}, {wait: 'nothing'}], hover: {send: 'x'}}});
		expect(b.on).toEqual({click: [{do: 'send', id: 'a', from: ['x'], value: undefined, clear: ['x']}, {do: 'request', id: 'r', from: null, value: undefined, into: 'out'}, {do: 'wait'}]});
	});
	it('accepts a single action object instead of a list', () => {
		expect(sanitizeNode({type: 'button', on: {click: {send: 'ping', value: 1}}}).on.click).toEqual([{do: 'send', id: 'ping', from: null, value: 1, clear: []}]);
	});
	it('limits the number of steps per event', () => {
		const steps = Array.from({length: 30}, () => ({send: 'x'}));
		expect(sanitizeNode({type: 'button', on: {click: steps}}).on.click).toHaveLength(LIMITS.steps);
	});
});

describe('message builders', () => {
	it('build the documented JSON', () => {
		expect(JSON.parse(dataMsg('chat.say', {msg: 'hi'}))).toEqual({v: 1, type: 'data', id: 'chat.say', data: {msg: 'hi'}});
		expect(JSON.parse(requestMsg('time', 'c1', null))).toEqual({v: 1, type: 'request', id: 'time', rid: 'c1', data: null});
		expect(JSON.parse(replyMsg('r1', 5))).toEqual({v: 1, type: 'data', reply: 'r1', data: 5});
		expect(JSON.parse(replyMsg('r1', null, 'bad'))).toEqual({v: 1, type: 'data', reply: 'r1', error: 'bad'});
	});
});
