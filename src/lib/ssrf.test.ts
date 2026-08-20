import { describe, expect, it, vi } from 'vitest';
import {
  assertPublicHttpUrl,
  isPrivateHostname,
  isPrivateIpLiteral,
  parseSafeHttpUrl,
} from '@/lib/ssrf';

describe('isPrivateIpLiteral / isPrivateHostname', () => {
  it('blocks private IPv4 and CGNAT', () => {
    expect(isPrivateIpLiteral('127.0.0.1')).toBe(true);
    expect(isPrivateIpLiteral('10.0.0.1')).toBe(true);
    expect(isPrivateIpLiteral('192.168.1.1')).toBe(true);
    expect(isPrivateIpLiteral('172.16.0.1')).toBe(true);
    expect(isPrivateIpLiteral('169.254.169.254')).toBe(true);
    expect(isPrivateIpLiteral('100.64.1.1')).toBe(true);
    expect(isPrivateIpLiteral('8.8.8.8')).toBe(false);
  });

  it('blocks IPv4-mapped IPv6 loopback and metadata (dotted and hex)', () => {
    expect(isPrivateIpLiteral('::ffff:127.0.0.1')).toBe(true);
    expect(isPrivateIpLiteral('::ffff:169.254.169.254')).toBe(true);
    expect(isPrivateIpLiteral('::ffff:7f00:1')).toBe(true);
    expect(isPrivateHostname('[::ffff:127.0.0.1]')).toBe(true);
  });

  it('blocks localhost-style hostnames', () => {
    expect(isPrivateHostname('localhost')).toBe(true);
    expect(isPrivateHostname('foo.local')).toBe(true);
  });
});

describe('parseSafeHttpUrl', () => {
  it('rejects private literals and non-http schemes', () => {
    expect(parseSafeHttpUrl('http://127.0.0.1/')).toBeNull();
    expect(parseSafeHttpUrl('http://[::ffff:127.0.0.1]/')).toBeNull();
    expect(parseSafeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(parseSafeHttpUrl('https://example.com/path')).not.toBeNull();
  });
});

describe('assertPublicHttpUrl', () => {
  it('rejects when DNS resolves to a private address', async () => {
    const lookup = vi.fn(async () => [{ address: '127.0.0.1', family: 4 }]);
    await expect(
      assertPublicHttpUrl('https://evil.example.com/', lookup as never)
    ).resolves.toBeNull();
    expect(lookup).toHaveBeenCalled();
  });

  it('allows when DNS resolves to a public address', async () => {
    const lookup = vi.fn(async () => [{ address: '93.184.216.34', family: 4 }]);
    const url = await assertPublicHttpUrl('https://example.com/', lookup as never);
    expect(url?.hostname).toBe('example.com');
  });
});
