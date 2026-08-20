import { describe, expect, it } from 'vitest';
import { analyzePdfRoundTrip, pdfTextIncludes } from '@/lib/pdfRoundTrip';
import {
  CURRENT_SCHEMA_VERSION,
  createDefaultHeader,
  createDefaultResume,
} from '@/types/resume';

describe('pdfTextIncludes', () => {
  it('matches emails and phones after whitespace/punctuation noise', () => {
    expect(pdfTextIncludes('Alex alex.johnson@email.com phone', 'alex.johnson@email.com')).toBe(
      true
    );
    expect(pdfTextIncludes('Call (555) 123-4567 today', '(555) 123-4567')).toBe(true);
    expect(pdfTextIncludes('Contact glyph only', 'alex.johnson@email.com')).toBe(false);
  });

  it('matches LinkedIn when PDF text uses the printed linkedin.com/in/… form', () => {
    expect(
      pdfTextIncludes(
        'linkedin.com/in/alexjohnson email',
        'https://linkedin.com/in/alexjohnson'
      )
    ).toBe(true);
  });
});

describe('analyzePdfRoundTrip', () => {
  it('flags missing contact fields and multi-page PDFs', () => {
    const resume = {
      ...createDefaultResume(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      header: {
        ...createDefaultHeader(),
        name: 'Alex Johnson',
        email: 'alex.johnson@email.com',
        phone: '(555) 123-4567',
        github: 'https://github.com/alexjohnson',
      },
      sections: [
        {
          id: 's1',
          type: 'standard' as const,
          sectionName: 'Experience',
          order: 0,
          entries: [],
        },
        {
          id: 's2',
          type: 'standard' as const,
          sectionName: 'Projects',
          order: 1,
          entries: [],
        },
      ],
    };

    const missingEmail = analyzePdfRoundTrip(resume, {
      pageCount: 2,
      text: 'Alex Johnson Experience Projects github.com/alexjohnson (555) 123-4567',
    });

    expect(missingEmail.isOnePage).toBe(false);
    expect(missingEmail.missingFieldIds).toContain('email');
    expect(missingEmail.fields.find((field) => field.id === 'name')?.found).toBe(true);
    expect(missingEmail.sectionOrderOk).toBe(true);
  });

  it('does not require project URLs in the PDF text layer', () => {
    const resume = {
      ...createDefaultResume(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      header: {
        ...createDefaultHeader(),
        name: 'Alex Johnson',
        email: 'alex@example.com',
      },
      sections: [
        {
          id: 'proj',
          type: 'standard' as const,
          sectionName: 'Projects',
          order: 0,
          entries: [
            {
              id: 'p1',
              title: 'Campus Course Planner',
              links: [{ label: 'repo' as const, url: 'https://github.com/alex/course-planner' }],
              bulletPoints: ['Built a planner'],
            },
          ],
        },
      ],
    };

    const result = analyzePdfRoundTrip(resume, {
      pageCount: 1,
      text: 'Alex Johnson alex@example.com Projects Campus Course Planner Built a planner',
    });

    expect(result.missingFieldIds.every((id) => !id.startsWith('project-link-'))).toBe(true);
    expect(result.fields.some((field) => field.id.startsWith('project-link-'))).toBe(false);
  });

  it('treats pageCount 0 as not one-page', () => {
    const resume = {
      ...createDefaultResume(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      header: {
        ...createDefaultHeader(),
        name: 'Alex',
        email: 'alex@example.com',
      },
    };
    const result = analyzePdfRoundTrip(resume, { pageCount: 0, text: 'Alex alex@example.com' });
    expect(result.isOnePage).toBe(false);
  });

  it('leaves sectionOrderOk null when fewer than two headings appear in extract', () => {
    const resume = {
      ...createDefaultResume(),
      schemaVersion: CURRENT_SCHEMA_VERSION,
      header: {
        ...createDefaultHeader(),
        name: 'Alex Johnson',
        email: 'alex@example.com',
      },
      sections: [
        {
          id: 's1',
          type: 'standard' as const,
          sectionName: 'Experience',
          order: 0,
          entries: [],
        },
        {
          id: 's2',
          type: 'standard' as const,
          sectionName: 'Projects',
          order: 1,
          entries: [],
        },
      ],
    };
    const result = analyzePdfRoundTrip(resume, {
      pageCount: 1,
      text: 'Alex Johnson alex@example.com Experience only',
    });
    expect(result.sectionOrderOk).toBeNull();
  });
});
