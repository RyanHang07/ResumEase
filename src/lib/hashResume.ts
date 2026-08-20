import { migrateResume } from '@/lib/migrations';
import { formatJsonApplyError } from '@/lib/jsonApplyError';
import type { Resume } from '@/types/resume';

export const HASH_DATA_PREFIX = '#data=';

export type HashFragment =
  | { kind: 'absent' }
  | { kind: 'empty' }
  | { kind: 'payload'; payload: string };

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

export const parseHashFragment = (hash: string): HashFragment => {
  if (!hash.startsWith(HASH_DATA_PREFIX)) return { kind: 'absent' };
  const payload = hash.slice(HASH_DATA_PREFIX.length);
  if (!payload) return { kind: 'empty' };
  return { kind: 'payload', payload };
};

export const hydrateResumeFromHashPayload = (payload: string): HashHydrateResult => {
  let json: string;
  try {
    json = decodeBase64UrlUtf8(payload);
  } catch {
    return { ok: false, message: 'Invalid #data= payload: not valid base64url.' };
  }

  try {
    const parsed: unknown = JSON.parse(json);
    const resume = migrateResume(parsed);
    return { ok: true, resume, serialized: resumeToEditorJson(resume) };
  } catch (err) {
    const formatted = formatJsonApplyError(err, json);
    return { ok: false, message: formatted.message };
  }
};

export const encodeResumeHash = (json: string): string =>
  `${HASH_DATA_PREFIX}${encodeBase64UrlUtf8(json)}`;
