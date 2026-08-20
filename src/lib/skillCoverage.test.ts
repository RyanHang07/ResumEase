import { describe, expect, it } from 'vitest';
import {
  analyzeSkillCoverage,
  findProjectsMissingLinks,
  findProjectsUnlinkableUrls,
  findTutorialProjects,
  findUnresolvedOrgs,
} from '@/lib/skillCoverage';
import {
  CURRENT_SCHEMA_VERSION,
  createDefaultHeader,
  createDefaultResume,
  type Resume,
} from '@/types/resume';

const baseResume = (): Resume => ({
  ...createDefaultResume(),
  schemaVersion: CURRENT_SCHEMA_VERSION,
  header: {
    ...createDefaultHeader(),
    name: 'Alex',
    email: 'alex@example.com',
  },
  sections: [],
});

describe('analyzeSkillCoverage', () => {
  it('flags skills absent from bullets', () => {
    const resume = baseResume();
    resume.sections = [
      {
        id: 'skills',
        type: 'skills',
        sectionName: 'Skills',
        order: 0,
        categories: [
          {
            id: 'c1',
            categoryName: 'Languages',
            skills: ['TypeScript', 'Rust'],
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
            title: 'Acme',
            organization: 'Acme',
            role: 'Intern',
            bulletPoints: ['Built a TypeScript dashboard used by 12 teammates'],
          },
        ],
      },
    ];

    const coverage = analyzeSkillCoverage(resume);
    expect(coverage.total).toBe(2);
    expect(coverage.backed).toBe(1);
    expect(coverage.unbacked).toEqual(['Rust']);
  });
});

describe('findProjectsMissingLinks', () => {
  it('lists projects without URLs', () => {
    const resume = baseResume();
    resume.sections = [
      {
        id: 'proj',
        type: 'standard',
        sectionName: 'Projects',
        order: 0,
        entries: [
          {
            id: 'p1',
            title: 'Planner',
            bulletPoints: ['Shipped planner used by 40 students'],
            links: [],
          },
          {
            id: 'p2',
            title: 'API Kit',
            bulletPoints: ['Built REST helpers'],
            links: [{ label: 'repo', url: 'https://github.com/a/b' }],
          },
        ],
      },
    ];

    expect(findProjectsMissingLinks(resume)).toEqual(['Planner']);
  });
});

describe('findProjectsUnlinkableUrls', () => {
  it('flags javascript: and other non-http schemes', () => {
    const resume = baseResume();
    resume.sections = [
      {
        id: 'proj',
        type: 'standard',
        sectionName: 'Projects',
        order: 0,
        entries: [
          {
            id: 'p1',
            title: 'Bad Link',
            bulletPoints: ['Demo'],
            links: [{ label: 'repo', url: 'javascript:alert(1)' }],
          },
          {
            id: 'p2',
            title: 'Scheme-less',
            bulletPoints: ['Demo'],
            links: [{ label: 'repo', url: 'github.com/x' }],
          },
        ],
      },
    ];

    expect(findProjectsUnlinkableUrls(resume)).toEqual(['Bad Link']);
  });
});

describe('findUnresolvedOrgs', () => {
  it('flags unknown employers (orgContext no longer clears the list)', () => {
    const resume = baseResume();
    resume.sections = [
      {
        id: 'exp',
        type: 'standard',
        sectionName: 'Experience',
        order: 0,
        entries: [
          {
            id: 'e1',
            title: 'Google',
            organization: 'Google',
            role: 'Intern',
            bulletPoints: ['Built tools'],
          },
          {
            id: 'e2',
            title: 'TinyCo',
            organization: 'TinyCo',
            role: 'Intern',
            orgContext: { descriptor: 'seed-stage analytics startup' },
            bulletPoints: ['Shipped dashboards'],
          },
          {
            id: 'e3',
            title: 'Mystery Labs',
            organization: 'Mystery Labs',
            role: 'Intern',
            bulletPoints: ['Wrote scripts'],
          },
          {
            id: 'e4',
            title: 'Complex Systems',
            organization: 'Complex Systems Inc',
            role: 'Intern',
            bulletPoints: ['Should not match short token x'],
          },
        ],
      },
    ];

    // orgContext is migrate-only; put context in bullets instead of clearing unresolved
    expect(findUnresolvedOrgs(resume)).toEqual([
      'TinyCo',
      'Mystery Labs',
      'Complex Systems Inc',
    ]);
  });
});

describe('findTutorialProjects', () => {
  it('detects common tutorial titles', () => {
    const resume = baseResume();
    resume.sections = [
      {
        id: 'proj',
        type: 'standard',
        sectionName: 'Projects',
        order: 0,
        entries: [
          {
            id: 'p1',
            title: 'Todo App',
            bulletPoints: ['Built a todo list'],
          },
        ],
      },
    ];

    expect(findTutorialProjects(resume)).toEqual(['Todo App']);
  });
});
