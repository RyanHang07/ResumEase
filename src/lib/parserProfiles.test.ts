import { describe, expect, it } from 'vitest';
import { analyzeParserProfile } from '@/lib/parserProfiles';
import {
  CURRENT_SCHEMA_VERSION,
  createDefaultHeader,
  createDefaultResume,
  type Resume,
} from '@/types/resume';

const resumeFixture = (): Resume => ({
  ...createDefaultResume(),
  schemaVersion: CURRENT_SCHEMA_VERSION,
  header: {
    ...createDefaultHeader(),
    name: 'Alex',
    email: 'alex@example.com',
    iconMode: 'icon',
  },
  jobTarget: {
    company: 'Acme',
    role: 'Intern',
    jdText: 'Need Kubernetes and GraphQL experience',
  },
  sections: [
    {
      id: 'exp',
      type: 'standard',
      sectionName: 'Experience',
      order: 0,
      entries: [
        {
          id: 'e1',
          title: 'Acme',
          organization: 'Acme',
          role: 'Intern',
          bulletPoints: ['Built API CI UX tools', 'Did stuff', 'Ran jobs', 'Shipped ML'],
        },
      ],
    },
  ],
});

describe('analyzeParserProfile', () => {
  it('flags Workday icon-only contact', () => {
    const findings = analyzeParserProfile(resumeFixture(), 'workday');
    expect(findings.some((finding) => finding.id === 'workday-icon-only')).toBe(true);
  });

  it('flags Taleo JD misses', () => {
    const findings = analyzeParserProfile(resumeFixture(), 'taleo');
    expect(findings.some((finding) => finding.id === 'taleo-misses')).toBe(true);
  });
});
