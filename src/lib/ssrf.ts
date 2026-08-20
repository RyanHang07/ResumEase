import dns from 'node:dns/promises';

/** Decode IPv4-mapped IPv6 (::ffff:a.b.c.d or ::ffff:7f00:1) to dotted IPv4. */
export const ipv4MappedToDotted = (host: string): string | null => {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, '');
  const dotted = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (dotted) return dotted[1];

  const hex = normalized.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i);
  if (!hex) return null;
  const hi = Number.parseInt(hex[1], 16);
  const lo = Number.parseInt(hex[2], 16);
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return null;
  return `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
};

/** Literal hostname / IP private checks (before DNS). Exported for tests. */
export const isPrivateIpLiteral = (host: string): boolean => {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, '');

  const mappedIpv4 = ipv4MappedToDotted(normalized);
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);

  if (normalized.includes(':')) {
    if (
      normalized === '::1' ||
      normalized.startsWith('fe80:') ||
      normalized.startsWith('fc') ||
      normalized.startsWith('fd')
    ) {
      return true;
    }
    return false;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(normalized)) {
    return isPrivateIpv4(normalized);
  }

  return false;
};

export const isPrivateIpv4 = (ip: string): boolean => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part) || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  // CGNAT
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
};

export const isPrivateHostname = (hostname: string): boolean => {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host === 'metadata.google.internal' ||
    host === 'metadata' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.endsWith('.localhost')
  ) {
    return true;
  }
  return isPrivateIpLiteral(host);
};

export const parseSafeHttpUrl = (value: string): URL | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (isPrivateHostname(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
};

type LookupFn = (
  hostname: string,
  options: { all: true; verbatim: true }
) => Promise<Array<{ address: string; family: number }>>;

/** Parse + DNS-resolve; reject if any address is private. */
export const assertPublicHttpUrl = async (
  value: string,
  lookup: LookupFn = dns.lookup
): Promise<URL | null> => {
  const parsed = parseSafeHttpUrl(value);
  if (!parsed) return null;

  // Literal IPs already checked in parseSafeHttpUrl
  if (isPrivateIpLiteral(parsed.hostname) || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsed.hostname)) {
    return isPrivateHostname(parsed.hostname) ? null : parsed;
  }
  if (parsed.hostname.includes(':')) {
    return isPrivateHostname(parsed.hostname) ? null : parsed;
  }

  try {
    const records = await lookup(parsed.hostname, { all: true, verbatim: true });
    if (!records.length) return null;
    for (const record of records) {
      if (isPrivateIpLiteral(record.address)) return null;
    }
    return parsed;
  } catch {
    return null;
  }
};
