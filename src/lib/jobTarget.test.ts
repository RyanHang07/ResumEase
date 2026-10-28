import { describe, expect, it } from 'vitest';
import { analyzeJdGap } from '@/lib/jobTarget';
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
    name: 'Alex Johnson',
    email: 'alex@example.com',
  },
  jobTarget: {
    company: 'Acme',
    role: 'Software Engineering Intern',
    jdText: 'Need TypeScript, React, Kubernetes, and REST APIs',
  },
  sections: [
    {
      id: 'skills',
      type: 'skills',
      sectionName: 'Skills',
      order: 0,
      categories: [
        {
          id: 'c1',
          categoryName: 'Stack',
          skills: ['TypeScript', 'React'],
        },
      ],
    },
    {
      id: 'exp',
      type: 'standard',
      sectionName: 'Experience',
      order: 1,
      entries: [
        {
          id: 'e1',
          title: 'TinyCo',
          organization: 'TinyCo',
          role: 'Intern',
          bulletPoints: ['Built React dashboards used by 20 teammates'],
        },
      ],
    },
  ],
});

describe('analyzeJdGap', () => {
  it('finds literal misses and skills-only hits', () => {
    const gap = analyzeJdGap(resumeFixture(), resumeFixture().jobTarget!.jdText);
    expect(gap.misses).toContain('kubernetes');
    expect(gap.hits.some((hit) => hit.token === 'react' && hit.inBullets)).toBe(true);
    expect(gap.hits.some((hit) => hit.token === 'typescript' && hit.inSkills)).toBe(true);
  });

  it('treats curated synonyms as hits', () => {
    const resume = resumeFixture();
    resume.sections = [
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
            bulletPoints: ['Built tRPC handlers and k8s deploys for 3 services'],
          },
        ],
      },
    ];
    const gap = analyzeJdGap(resume, 'Need REST APIs and Kubernetes experience');
    expect(gap.misses).not.toContain('rest');
    expect(gap.misses).not.toContain('kubernetes');
  });
});
