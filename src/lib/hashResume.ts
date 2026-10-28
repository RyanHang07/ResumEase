import { migrateResume } from '@/lib/migrations';
import { formatJsonApplyError } from '@/lib/jsonApplyError';
import type { Resume } from '@/types/resume';

export const HASH_DATA_PREFIX = '#data=';
/** Raw DEFLATE (RFC 1951) of the UTF-8 JSON, then base64url. About 55% shorter than #data=. */
export const HASH_ZIP_PREFIX = '#z=';
// ponytail: cap inflated size so a tiny crafted link can't expand into a memory bomb
const MAX_INFLATED_BYTES = 1_000_000;

export type HashEncoding = 'base64' | 'deflate';

export type HashFragment =
  | { kind: 'absent' }
  | { kind: 'empty' }
  | { kind: 'payload'; payload: string; encoding: HashEncoding };

export type HashHydrateResult =
  | { ok: true; resume: Resume; serialized: string }
  | { ok: false; message: string };

export const resumeToEditorJson = (resume: Resume): string =>
  JSON.stringify(migrateResume(resume), null, 2);

export const encodeBase64UrlUtf8 = (text: string): string => {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const decodeBase64UrlUtf8 = (payload: string): string => {
  const padded =
    payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payload.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const HASH_PREFIXES: Array<[string, HashEncoding]> = [
  [HASH_DATA_PREFIX, 'base64'],
  [HASH_ZIP_PREFIX, 'deflate'],
];

export const parseHashFragment = (hash: string): HashFragment => {
  const match = HASH_PREFIXES.find(([prefix]) => hash.startsWith(prefix));
  if (!match) return { kind: 'absent' };
  const [prefix, encoding] = match;
  const payload = hash.slice(prefix.length);
  if (!payload) return { kind: 'empty' };
  return { kind: 'payload', payload, encoding };
};

const decodeBase64UrlBytes = (payload: string): Uint8Array => {
  const padded =
    payload.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (payload.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const encodeBase64UrlBytes = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const pipeBytes = async (
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
  limit = Infinity
) => {
  const reader = new Blob([bytes as BlobPart]).stream().pipeThrough(transform).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new Error('too large');
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return out;
};

const hydrateResumeFromJson = (json: string): HashHydrateResult => {
  try {
    const parsed: unknown = JSON.parse(json);
    const resume = migrateResume(parsed);
    return { ok: true, resume, serialized: resumeToEditorJson(resume) };
  } catch (err) {
    const formatted = formatJsonApplyError(err, json);
    return { ok: false, message: formatted.message };
  }
};

export const hydrateResumeFromHashPayload = (payload: string): HashHydrateResult => {
  let json: string;
  try {
    json = decodeBase64UrlUtf8(payload);
  } catch {
    return { ok: false, message: 'Invalid #data= payload: not valid base64url.' };
  }
  return hydrateResumeFromJson(json);
};

export const hydrateResumeFromZipPayload = async (payload: string): Promise<HashHydrateResult> => {
  let json: string;
  try {
    const inflated = await pipeBytes(
      decodeBase64UrlBytes(payload),
      new DecompressionStream('deflate-raw'),
      MAX_INFLATED_BYTES
    );
    json = new TextDecoder().decode(inflated);
  } catch {
    return { ok: false, message: 'Invalid #z= payload: not valid base64url raw DEFLATE.' };
  }
  return hydrateResumeFromJson(json);
};

export const hydrateResumeFromFragment = (
  fragment: Extract<HashFragment, { kind: 'payload' }>
): Promise<HashHydrateResult> =>
  fragment.encoding === 'deflate'
    ? hydrateResumeFromZipPayload(fragment.payload)
    : Promise.resolve(hydrateResumeFromHashPayload(fragment.payload));

export const encodeResumeHash = (json: string): string =>
  `${HASH_DATA_PREFIX}${encodeBase64UrlUtf8(json)}`;

export const encodeResumeHashCompressed = async (json: string): Promise<string> => {
  const deflated = await pipeBytes(new TextEncoder().encode(json), new CompressionStream('deflate-raw'));
  return `${HASH_ZIP_PREFIX}${encodeBase64UrlBytes(deflated)}`;
};
