import { describe, expect, it } from 'vitest';
import { parseHttpUrl } from '@/utils/url';

describe('parseHttpUrl', () => {
  it('adds https:// to a bare host and normalises the address', () => {
    expect(parseHttpUrl('example.com')).toEqual({ url: 'https://example.com/', host: 'example.com' });
    expect(parseHttpUrl('  Example.COM/Path?q=1  ')).toEqual({ url: 'https://example.com/Path?q=1', host: 'example.com' });
  });

  it('keeps an explicit http / https scheme', () => {
    expect(parseHttpUrl('http://example.com:8080/a')).toEqual({ url: 'http://example.com:8080/a', host: 'example.com' });
    expect(parseHttpUrl('HTTPS://example.com')?.url).toBe('https://example.com/');
  });

  it('accepts host:port without a scheme', () => {
    expect(parseHttpUrl('localhost:3000')).toEqual({ url: 'https://localhost:3000/', host: 'localhost' });
  });

  it.each([
    'javascript:alert(1)',
    'data:text/html,<b>x</b>',
    'file:///etc/passwd',
    'ftp://example.com',
    'a b',
    '',
    '   ',
    null,
    undefined,
  ])('rejects %j', input => {
    expect(parseHttpUrl(input)).toBeNull();
  });
});
