// A minimal fake WebSocket for tests: the test plays the server with open() / recv(), and reads what the client sent from `sent`.
export class FakeWS {
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

export const UI = (root, title = '') => ({type: 'ui', title, root});
