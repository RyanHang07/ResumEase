import { describe, expect, it } from 'vitest';
import { generateAcademicLatex, generateClassicLatex, generateCompactLatex } from '@/lib/templates';
import { CURRENT_SCHEMA_VERSION, createDefaultHeader, type Resume, type StandardSection } from '@/types/resume';

const SUMMARY = 'Full stack engineer who ships LLM features end to end.';

const section = (sectionName: string, bulletPoints: string[], order: number): StandardSection => ({
  id: `s-${order}`,
  type: 'standard',
  sectionName,
  order,
  entries: [{ id: `e-${order}`, title: '', organization: '', role: '', location: '', dates: {}, bulletPoints }],
});

const resumeWith = (...sections: StandardSection[]): Resume => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: 'r',
  header: { ...createDefaultHeader(), name: 'Test Person', email: 't@example.com' },
  sections: [
    ...sections,
    {
      id: 'exp', type: 'standard', sectionName: 'Experience', order: 9,
      entries: [{ id: 'x', title: '', organization: 'Acme', role: 'Engineer', dates: { start: '2025-08', end: 'present' }, bulletPoints: ['Built things.'] }],
    },
  ],
  lastModified: new Date('2026-01-01T00:00:00Z'),
});

const generators = [
  ['compact', generateCompactLatex],
  ['classic', generateClassicLatex],
  ['academic', generateAcademicLatex],
] as const;

const summaryBody = (latex: string) => latex.slice(latex.indexOf('{Summary}'), latex.indexOf('{Experience}'));

describe.each(generators)('%s template, entries with no heading', (_name, generate) => {
  it('prints a Summary as plain text: no empty heading row, no bullet marker', () => {
    const body = summaryBody(generate(resumeWith(section('Summary', [SUMMARY], 0))));
    expect(body).toContain(SUMMARY);
    expect(body).not.toContain('\\resumeSubheading');
    expect(body).not.toContain('\\resumeItem');
    expect(body).not.toContain('\\textbf{}');
    expect(body).not.toMatch(/\\item\s*\{/);
  });

  it('keeps bullets but drops the heading for other sections', () => {
    const latex = generate(resumeWith(section('Highlights', ['Shipped a thing.'], 0)));
    const body = latex.slice(latex.indexOf('{Highlights}'), latex.indexOf('{Experience}'));
    expect(body).toContain('Shipped a thing.');
    expect(body).not.toContain('\\resumeSubheading');
    expect(body).not.toContain('\\textbf{}');
  });

  it('omits a section whose only entry has no heading and no bullets', () => {
    const latex = generate(resumeWith(section('Summary', [], 0)));
    expect(latex).not.toContain('{Summary}');
  });

  it('still renders normal entries with their heading', () => {
    const latex = generate(resumeWith(section('Summary', [SUMMARY], 0)));
    expect(latex).toContain('Acme');
    expect(latex).toContain('Built things.');
  });
});
