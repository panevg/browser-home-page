import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cached } from '@/utils/cache';

const KEY = 'startpage:cache:k';

beforeEach(() => localStorage.clear());

describe('cached', () => {
  it('runs the fetcher and stores the result under the cache prefix', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const fetcher = vi.fn().mockResolvedValue({ a: 1 });
    expect(await cached('k', 500, fetcher)).toEqual({ a: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ t: 1000, d: { a: 1 } });
  });

  it('returns a fresh entry without calling the fetcher', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    await cached('k', 500, async () => 'first');
    now.mockReturnValue(1499);
    const fetcher = vi.fn().mockResolvedValue('second');
    expect(await cached('k', 500, fetcher)).toBe('first');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refetches an expired entry', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    await cached('k', 500, async () => 'first');
    now.mockReturnValue(1500);
    expect(await cached('k', 500, async () => 'second')).toBe('second');
    expect(JSON.parse(localStorage.getItem(KEY)).d).toBe('second');
  });

  it('does not store data rejected by isValid, but still returns it', async () => {
    expect(await cached('k', 500, async () => [], l => l.length > 0)).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('treats a corrupted entry as a miss', async () => {
    localStorage.setItem(KEY, '{not json');
    expect(await cached('k', 500, async () => 'ok')).toBe('ok');
  });

  it('still returns the data when localStorage is full', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(await cached('k', 500, async () => 'ok')).toBe('ok');
  });

  it('passes fetcher errors on to the caller', async () => {
    await expect(cached('k', 500, async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
