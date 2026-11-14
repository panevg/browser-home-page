import { describe, expect, it } from 'vitest';
import { icon, initial, uid } from '@/utils/misc';

describe('uid', () => {
  it('returns short alphanumeric ids that do not repeat', () => {
    const ids = Array.from({ length: 50 }, uid);
    ids.forEach(id => expect(id).toMatch(/^[a-z0-9]{1,7}$/));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('icon', () => {
  it('builds the DuckDuckGo favicon address', () => {
    expect(icon('example.com')).toBe('https://icons.duckduckgo.com/ip3/example.com.ico');
  });
});

describe('initial', () => {
  it('returns the first character', () => {
    expect(initial('hello')).toBe('h');
    expect(initial('Київ')).toBe('К');
  });

  it('does not split surrogate pairs', () => {
    expect(initial('😀 smile')).toBe('😀');
  });

  it('falls back to "?" for empty values', () => {
    expect(initial('')).toBe('?');
    expect(initial(null)).toBe('?');
    expect(initial(undefined)).toBe('?');
  });
});
