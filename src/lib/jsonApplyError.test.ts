import { describe, expect, it } from 'vitest';
import { formatJsonApplyError } from '@/lib/jsonApplyError';
import { parseResume } from '@/lib/schema/resume';
import { CURRENT_SCHEMA_VERSION } from '@/types/resume';

describe('formatJsonApplyError', () => {
  it('includes line and column for a trailing comma', () => {
    const draft = `{
  "name": "Ada",
}`;
    let caught: unknown;
    try {
      JSON.parse(draft);
    } catch (err) {
      caught = err;
    }
    const formatted = formatJsonApplyError(caught, draft);
    expect(formatted.line).toBeTypeOf('number');
    expect(formatted.column).toBeTypeOf('number');
    expect(formatted.message).toMatch(/line\s+\d+,\s+column\s+\d+/i);
  });

  it('includes the Zod field path for a schema failure', () => {
    let caught: unknown;
    try {
      parseResume({
        schemaVersion: CURRENT_SCHEMA_VERSION,
        id: 'resume-1',
        header: { name: 'Ada', email: 'ada@example.com' },
        sections: [
          {
            id: 'section-1',
            type: 'standard',
            sectionName: 'Experience',
            order: 0,
            entries: [
              {
                id: 'entry-1',
                title: 'Role',
                bulletPoints: [],
                gpa: 99,
              },
            ],
          },
        ],
        lastModified: new Date('2024-01-01T00:00:00.000Z'),
      });
    } catch (err) {
      caught = err;
    }
    const formatted = formatJsonApplyError(caught, '{}');
    expect(formatted.message).toMatch(/sections\.0\.entries\.0\.gpa/);
    expect(formatted.line).toBeNull();
    expect(formatted.column).toBeNull();
  });
});
