import { describe, expect, it } from 'vitest';
import { resumeBaseName, resumeFilename, slugify } from '@/lib/resumeFilename';
import { migrateResume } from '@/lib/migrations';
import { resumeToEditorJson } from '@/lib/hashResume';
import { CURRENT_SCHEMA_VERSION, createDefaultHeader, type Resume } from '@/types/resume';

const makeResume = (overrides: Partial<Resume> = {}): Resume => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: 'r1',
  header: { ...createDefaultHeader(), name: 'Ryan Hang' },
  sections: [],
  lastModified: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

describe('slugify', () => {
  it('collapses spaces, underscores, and repeated dashes', () => {
    expect(slugify('  Ryan  Hang__Acme -- SWE ')).toBe('Ryan-Hang-Acme-SWE');
  });

  it('strips accents and punctuation', () => {
    expect(slugify('José Núñez @ Café, Inc.')).toBe('Jose-Nunez-Cafe-Inc');
  });

  it('caps length at 80 without a trailing dash', () => {
    const slug = slugify(`${'a'.repeat(79)} bbbb`);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('returns empty for symbol-only input', () => {
    expect(slugify('!!! ###')).toBe('');
  });
});

describe('resumeBaseName', () => {
  it('prefers the explicit name', () => {
    const resume = makeResume({
      name: 'Ryan-Hang_Coram-AI_MTS-Full-Stack',
      jobTarget: { company: 'Other', role: 'Role', jdText: '' },
    });
    expect(resumeBaseName(resume)).toBe('Ryan-Hang-Coram-AI-MTS-Full-Stack');
  });

  it('falls back to header name plus job target', () => {
    const resume = makeResume({ jobTarget: { company: 'Acme', role: 'SWE I', jdText: '' } });
    expect(resumeBaseName(resume)).toBe('Ryan-Hang-Acme-SWE-I');
  });

  it('falls back to header name, then "resume"', () => {
    expect(resumeBaseName(makeResume())).toBe('Ryan-Hang');
    expect(
      resumeBaseName(makeResume({ header: { ...createDefaultHeader(), name: '' } }))
    ).toBe('resume');
    expect(resumeBaseName(makeResume({ name: '???' }))).toBe('resume');
  });
});

describe('resumeFilename', () => {
  it('gives different resumes different filenames', () => {
    const a = makeResume({ name: 'Ryan Hang Acme SWE' });
    const b = makeResume({ name: 'Ryan Hang Beta SWE' });
    expect(resumeFilename(a, 'pdf')).toBe('Ryan-Hang-Acme-SWE.pdf');
    expect(resumeFilename(a, 'pdf')).not.toBe(resumeFilename(b, 'pdf'));
    expect(resumeFilename(a, 'docx')).toBe('Ryan-Hang-Acme-SWE.docx');
  });
});

describe('name field round trip', () => {
  it('survives migration and the JSON editor', () => {
    const migrated = migrateResume(makeResume({ name: 'Ryan-Hang_Acme_SWE' }));
    expect(migrated.name).toBe('Ryan-Hang_Acme_SWE');
    expect(JSON.parse(resumeToEditorJson(migrated)).name).toBe('Ryan-Hang_Acme_SWE');
  });

  it('truncates an overlong name instead of failing the import', () => {
    const migrated = migrateResume(makeResume({ name: 'x'.repeat(200) }));
    expect(migrated.name).toHaveLength(80);
  });

  it('drops a blank name', () => {
    expect(migrateResume(makeResume({ name: '   ' })).name).toBeUndefined();
  });
});
