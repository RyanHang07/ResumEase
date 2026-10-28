import { describe, expect, it } from 'vitest';
import {
  encodeResumeHash,
  encodeResumeHashCompressed,
  hydrateResumeFromFragment,
  hydrateResumeFromZipPayload,
  hydrateResumeFromHashPayload,
  parseHashFragment,
  resumeToEditorJson,
} from '@/lib/hashResume';
import { createSampleResume } from '@/lib/sampleData';
import { formatJsonApplyError } from '@/lib/jsonApplyError';

const sampleJson = () => resumeToEditorJson(createSampleResume());

describe('hashResume', () => {
  it('round-trips a valid document through #data= base64url', () => {
    const json = sampleJson();
    const fragment = encodeResumeHash(json);
    const parsed = parseHashFragment(fragment);
    expect(parsed.kind).toBe('payload');
    if (parsed.kind !== 'payload') return;
    const result = hydrateResumeFromHashPayload(parsed.payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resume.header.name).toBe('Alex Johnson');
    expect(result.serialized).not.toBe('');
    const experience = result.resume.sections.find((section) => section.sectionName === 'Experience');
    expect(experience?.type).toBe('standard');
    if (experience?.type !== 'standard') return;
    expect(experience.entries[0]?.bulletPoints[0]).toContain('Built internal tooling');
    expect(experience.entries[0]?.bulletPoints[1]).toContain('Shipped a CI check');
  });

  it('rejects invalid base64url without blanking meaning', () => {
    const result = hydrateResumeFromHashPayload('!!!not-base64!!!');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message.toLowerCase()).toMatch(/base64/);
  });

  it('rejects trailing-comma JSON with line and column', () => {
    const fragment = encodeResumeHash('{"name": "Ada",}');
    const parsed = parseHashFragment(fragment);
    expect(parsed.kind).toBe('payload');
    if (parsed.kind !== 'payload') return;
    const result = hydrateResumeFromHashPayload(parsed.payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/line\s+\d+,\s+column\s+\d+/i);
  });

  it('rejects a payload that is not a resume object', () => {
    const fragment = encodeResumeHash('"just a string"');
    const parsed = parseHashFragment(fragment);
    expect(parsed.kind).toBe('payload');
    if (parsed.kind !== 'payload') return;
    const result = hydrateResumeFromHashPayload(parsed.payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message.length).toBeGreaterThan(0);
  });

  it('ignores empty and non-data fragments', () => {
    expect(parseHashFragment('')).toEqual({ kind: 'absent' });
    expect(parseHashFragment('#')).toEqual({ kind: 'absent' });
    expect(parseHashFragment('#foo')).toEqual({ kind: 'absent' });
    expect(parseHashFragment('#data=')).toEqual({ kind: 'empty' });
  });

  it('does not reorder section or bullet arrays on hydrate', () => {
    const resume = createSampleResume();
    const originalOrder = resume.sections.map((section) => section.id);
    const originalBullets =
      resume.sections[1]?.type === 'standard' ? [...resume.sections[1].entries[0].bulletPoints] : [];
    const parsed = parseHashFragment(encodeResumeHash(JSON.stringify(resume)));
    expect(parsed.kind).toBe('payload');
    if (parsed.kind !== 'payload') return;
    const result = hydrateResumeFromHashPayload(parsed.payload);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.resume.sections.map((section) => section.id)).toEqual(originalOrder);
    const hydratedBullets =
      result.resume.sections[1]?.type === 'standard'
        ? result.resume.sections[1].entries[0].bulletPoints
        : [];
    expect(hydratedBullets).toEqual(originalBullets);
  });

  it('formatJsonApplyError stays consistent with hydrate parse failures', () => {
    const draft = '{';
    let caught: unknown;
    try {
      JSON.parse(draft);
    } catch (err) {
      caught = err;
    }
    const formatted = formatJsonApplyError(caught, draft);
    const fragment = encodeResumeHash(draft);
    const parsed = parseHashFragment(fragment);
    if (parsed.kind !== 'payload') throw new Error('expected payload');
    const result = hydrateResumeFromHashPayload(parsed.payload);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toBe(formatted.message);
  });
});

describe('#z= compressed fragments', () => {
  it('round-trips and is detected by parseHashFragment', async () => {
    const fragment = await encodeResumeHashCompressed(sampleJson());
    const parsed = parseHashFragment(fragment);
    expect(parsed).toMatchObject({ kind: 'payload', encoding: 'deflate' });
    if (parsed.kind !== 'payload') return;
    const result = await hydrateResumeFromFragment(parsed);
    expect(result.ok && result.resume.header.name).toBe('Alex Johnson');
  });

  it('rejects payloads that inflate past the size cap', async () => {
    const bomb = await encodeResumeHashCompressed(' '.repeat(2_000_000));
    expect(bomb.length).toBeLessThan(10_000);
    const result = await hydrateResumeFromZipPayload(bomb.slice('#z='.length));
    expect(result.ok).toBe(false);
  });

  it('keeps #data= working', () => {
    expect(parseHashFragment('#data=abc')).toMatchObject({ kind: 'payload', encoding: 'base64' });
    expect(parseHashFragment('#z=')).toEqual({ kind: 'empty' });
  });
});
