import {afterEach, describe, expect, it, vi} from 'vitest';

afterEach(() => vi.useRealTimers());

// The module keeps "started" / "ready" at module level, so each test imports a fresh copy.
async function fresh() {
	vi.resetModules();
	return import('@/composables/afterLoad');
}

describe('useAfterLoad', () => {
	it('is false at first and becomes true once the page is loaded and idle', async () => {
		vi.useFakeTimers();
		Object.defineProperty(document, 'readyState', {value: 'complete', configurable: true});
		const {useAfterLoad} = await fresh();
		const ready = useAfterLoad();
		expect(ready.value).toBe(false);
		vi.runAllTimers();
		expect(ready.value).toBe(true);
		delete document.readyState;
	});
 
	it('shares one ref between all callers', async () => {
		vi.useFakeTimers();
		const {useAfterLoad} = await fresh();
		expect(useAfterLoad()).toBe(useAfterLoad());
	});
});