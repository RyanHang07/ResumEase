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

describe('parseResumeInput', () => {
  it('loads raw JSON', () => {
    const result = parseResumeInput(resumeToEditorJson(sample()));
    expect(result.ok && result.resume.name).toBe('Alex-Johnson_Acme_SWE');
  });

  it('loads JSON inside a fenced block with surrounding chatter', () => {
    const text = `Here you go:\n\n\`\`\`json\n${resumeToEditorJson(sample())}\n\`\`\`\nFit: good.`;
    const result = parseResumeInput(text);
    expect(result.ok && result.resume.header.name).toBe('Alex Johnson');
  });

  it('loads a full link with the download flag', () => {
    const link = buildResumeLink(sample(), { downloadPdf: true });
    const result = parseResumeInput(`Link: ${link} enjoy`);
    expect(result.ok && result.resume.name).toBe('Alex-Johnson_Acme_SWE');
  });

  it('accepts and keeps templateId in raw JSON and links', () => {
    const withTemplate = { ...sample(), templateId: 'compact' as const };
    const raw = parseResumeInput(JSON.stringify(withTemplate));
    expect(raw.ok && raw.resume.templateId).toBe('compact');
    const viaLink = parseResumeInput(buildResumeLink(withTemplate, { downloadPdf: true }));
    expect(viaLink.ok && viaLink.resume.templateId).toBe('compact');
  });

  it('reports bad input without throwing', () => {
    expect(parseResumeInput('').ok).toBe(false);
    expect(parseResumeInput('{ not json').ok).toBe(false);
    expect(parseResumeInput('{"header": {}}').ok).toBe(false);
    expect(parseResumeInput('https://x/#data=').ok).toBe(false);
    expect(parseResumeInput('https://x/#data=!!!').ok).toBe(false);
  });
});

describe('buildResumeLink', () => {
  it('puts the query flag before the hash and round-trips', () => {
    const link = buildResumeLink(sample(), { downloadPdf: true });
    expect(link.startsWith(`${APP_URL}/?download=pdf#data=`)).toBe(true);
    const url = new URL(link);
    expect(parseHashFragment(url.hash).kind).toBe('payload');
    expect(buildResumeLink(sample()).startsWith(`${APP_URL}/#data=`)).toBe(true);
  });
});

describe('buildClaudeInstructions', () => {
  it('documents the name field and link format, with no em dashes', () => {
    const text = buildClaudeInstructions();
    expect(text).toContain('name: string');
    expect(text).toContain(`${APP_URL}/?download=pdf#data=<payload>`);
    expect(text).not.toContain('\u2014');
  });
});
