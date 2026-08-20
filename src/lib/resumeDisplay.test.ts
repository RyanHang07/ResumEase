import { describe, expect, it } from 'vitest';
import { getEntryPrimaryText } from '@/lib/resumeDisplay';
import { createDefaultStandardEntry } from '@/types/resume';

describe('getEntryPrimaryText', () => {
  it('reads organization for education and experience, not title', () => {
    const education = {
      ...createDefaultStandardEntry(),
      title: 'Should not print',
      organization: 'State University',
    };
    const experience = {
      ...createDefaultStandardEntry(),
      title: 'Should not print',
      organization: 'Acme',
    };

    expect(getEntryPrimaryText(education, 'Education')).toBe('State University');
    expect(getEntryPrimaryText(experience, 'Experience')).toBe('Acme');
  });

  it('reads title for projects', () => {
    const project = {
      ...createDefaultStandardEntry(),
      title: 'Campus Course Planner',
      organization: 'Should not print',
    };

    expect(getEntryPrimaryText(project, 'Projects')).toBe('Campus Course Planner');
  });

  it('falls back to title when organization is empty', () => {
    const entry = {
      ...createDefaultStandardEntry(),
      title: 'Legacy School',
      organization: '',
    };

    expect(getEntryPrimaryText(entry, 'Education')).toBe('Legacy School');
  });
});
