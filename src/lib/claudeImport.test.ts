import { describe, expect, it } from 'vitest';
import {
  APP_URL,
  buildClaudeInstructions,
  buildResumeLink,
  hasDownloadPdfFlag,
  parseResumeInput,
  stripDownloadFlag,
} from '@/lib/claudeImport';
import { parseHashFragment, resumeToEditorJson } from '@/lib/hashResume';
import { createSampleResume } from '@/lib/sampleData';

const sample = () => ({ ...createSampleResume(), name: 'Alex-Johnson_Acme_SWE' });

describe('download flag', () => {
  it('only matches download=pdf', () => {
    expect(hasDownloadPdfFlag('?download=pdf')).toBe(true);
    expect(hasDownloadPdfFlag('?a=1&download=pdf')).toBe(true);
    expect(hasDownloadPdfFlag('')).toBe(false);
    expect(hasDownloadPdfFlag('?download=docx')).toBe(false);
  });

  it('strips the flag and keeps other params', () => {
    expect(stripDownloadFlag('?download=pdf')).toBe('');
    expect(stripDownloadFlag('?a=1&download=pdf')).toBe('?a=1');
    expect(stripDownloadFlag('')).toBe('');
  });
});

// Produced by the skill's Python snippet: zlib.compressobj(9, zlib.DEFLATED, -15) + urlsafe b64, no padding
const PYTHON_Z_PAYLOAD =
  'RY2xCsMwDER_pdzsBCVDB09dOwQylA4tHYStEoOdhNhDQ8i_V-lS0CDu9J42ZDdI4rssOUwjbGsQPCzmFQYjJ9G9X6uOvWhQJM2Ri1yPEzelmV3ReBCtF9jtT5x6NarQQO0hHsaLfFhxqRXEbpDFFf2ZYZ8vg8i5dJMP7yCHvKX2XDVUUXMjsr-pieiB_Qs';

describe('parseResumeInput', () => {
  it('loads raw JSON', async () => {
    const result = await parseResumeInput(resumeToEditorJson(sample()));
    expect(result.ok && result.resume.name).toBe('Alex-Johnson_Acme_SWE');
  });

  it('loads JSON inside a fenced block with surrounding chatter', async () => {
    const text = `Here you go:\n\n\`\`\`json\n${resumeToEditorJson(sample())}\n\`\`\`\nFit: good.`;
    const result = await parseResumeInput(text);
    expect(result.ok && result.resume.header.name).toBe('Alex Johnson');
  });

  it('loads full #z= and #data= links with the download flag', async () => {
    for (const compress of [true, false]) {
      const link = await buildResumeLink(sample(), { downloadPdf: true, compress });
      const result = await parseResumeInput(`Link: ${link} enjoy`);
      expect(result.ok && result.resume.name).toBe('Alex-Johnson_Acme_SWE');
    }
  });

  it('decodes a #z= payload made by Python zlib', async () => {
    const result = await parseResumeInput(`https://resum-ease.vercel.app/?download=pdf#z=${PYTHON_Z_PAYLOAD}`);
    expect(result.ok && result.resume.name).toBe('Py-Made');
    expect(result.ok && result.resume.templateId).toBe('compact');
  });

  it('accepts and keeps templateId in raw JSON and links', async () => {
    const withTemplate = { ...sample(), templateId: 'compact' as const };
    const raw = await parseResumeInput(JSON.stringify(withTemplate));
    expect(raw.ok && raw.resume.templateId).toBe('compact');
    const viaLink = await parseResumeInput(await buildResumeLink(withTemplate, { downloadPdf: true }));
    expect(viaLink.ok && viaLink.resume.templateId).toBe('compact');
  });

  it('reports bad input without throwing', async () => {
    for (const input of ['', '{ not json', '{"header": {}}', 'https://x/#data=', 'https://x/#data=!!!', 'https://x/#z=', 'https://x/#z=AAAA']) {
      expect((await parseResumeInput(input)).ok).toBe(false);
    }
  });
});

describe('buildResumeLink', () => {
  it('puts the query flag before the hash, compresses by default, and round-trips', async () => {
    const link = await buildResumeLink(sample(), { downloadPdf: true });
    expect(link.startsWith(`${APP_URL}/?download=pdf#z=`)).toBe(true);
    const url = new URL(link);
    expect(parseHashFragment(url.hash)).toMatchObject({ kind: 'payload', encoding: 'deflate' });
    expect((await buildResumeLink(sample(), { compress: false })).startsWith(`${APP_URL}/#data=`)).toBe(true);
  });

  it('is much shorter compressed', async () => {
    const plain = await buildResumeLink(sample(), { compress: false });
    const zipped = await buildResumeLink(sample());
    expect(zipped.length).toBeLessThan(plain.length * 0.6);
  });
});

describe('buildClaudeInstructions', () => {
  it('documents the name field and link format, with no em dashes', () => {
    const text = buildClaudeInstructions();
    expect(text).toContain('name: string');
    expect(text).toContain(`${APP_URL}/?download=pdf#z=<payload>`);
    expect(text).toContain('zlib.compressobj(9, zlib.DEFLATED, -15)');
    expect(text).not.toContain('\u2014');
  });
});
