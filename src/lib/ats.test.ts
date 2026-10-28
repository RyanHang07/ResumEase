import { describe, expect, it } from 'vitest';
import {
  analyzeResumeForAts,
  hasMetricOrOutcome,
  startsWithActionVerb,
} from '@/lib/ats';
import { applySafeParseFixes } from '@/lib/parseFixes';
import { createSampleResume } from '@/lib/sampleData';
import {
  CURRENT_SCHEMA_VERSION,
  createDefaultHeader,
  createDefaultResume,
  type Resume,
  type StandardEntry,
  type StandardSection,
} from '@/types/resume';

const entry = (
  id: string,
  organization: string,
  bullets: string[]
): StandardEntry => ({
  id,
  title: organization,
  organization,
  role: 'Software Engineering Intern',
  dates: { start: '2024-06', end: '2024-08' },
  bulletPoints: bullets,
});

const experienceSection = (entries: StandardEntry[]): StandardSection => ({
  id: 'exp',
  type: 'standard',
  sectionName: 'Experience',
  order: 1,
  entries,
});

const resumeWithEntries = (entries: StandardEntry[]): Resume => ({
  ...createDefaultResume(),
  schemaVersion: CURRENT_SCHEMA_VERSION,
  header: {
    ...createDefaultHeader(),
    name: 'Alex Johnson',
    email: 'alex@example.com',
    github: 'https://github.com/alex',
    iconMode: 'icon-and-text',
  },
  sections: [
    {
      id: 'edu',
      type: 'standard',
      sectionName: 'Education',
      order: 0,
      entries: [
        {
          id: 'edu-1',
          title: 'State University',
          organization: 'State University',
          role: 'B.S. Computer Science',
          expectedGraduation: '2027-05',
          bulletPoints: [],
        },
      ],
    },
    experienceSection(entries),
  ],
});

const strongBullet = 'Built an intern tool that cut review time by 25%';
const weakBullet = 'Responsible for improving performance of the platform';

describe('hasMetricOrOutcome', () => {
  it('requires a quantity token', () => {
    expect(hasMetricOrOutcome('improved performance and security')).toBe(false);
    expect(hasMetricOrOutcome('cut review time by 25%')).toBe(true);
    expect(hasMetricOrOutcome('handled $40k in spend')).toBe(true);
  });
});

describe('startsWithActionVerb', () => {
  it('rejects -ed adjectives without treating them as verbs', () => {
    expect(startsWithActionVerb('Advanced coursework in compilers')).toBe(false);
    expect(startsWithActionVerb('Distributed systems across 12 regions')).toBe(false);
    expect(startsWithActionVerb('Embedded sensors on the device')).toBe(false);
    expect(startsWithActionVerb('Dedicated team player')).toBe(false);
  });

  it('accepts real action verbs including irregulars', () => {
    expect(startsWithActionVerb('Built a planner used by 200 students')).toBe(true);
    expect(startsWithActionVerb('Led a 4 person intern pod')).toBe(true);
  });
});

describe('analyzeResumeForAts', () => {
  it('scores a 6-entry strong resume above a 1-entry weak resume', () => {
    const strong = resumeWithEntries(
      Array.from({ length: 6 }, (_, index) =>
        entry(`strong-${index}`, `Company ${index + 1}`, [strongBullet, strongBullet])
      )
    );
    const weak = resumeWithEntries([
      entry('weak-1', 'Company', [weakBullet, 'Worked on various tasks and performance']),
    ]);

    const strongScore = analyzeResumeForAts(strong, 'classic').score;
    const weakScore = analyzeResumeForAts(weak, 'classic').score;
    expect(strongScore).toBeGreaterThan(weakScore);
  });

  it('treats GitHub as a checklist row, not a missing section type', () => {
    const withGithub = resumeWithEntries([entry('a', 'Acme', [strongBullet])]);
    const withoutGithub = {
      ...withGithub,
      header: { ...withGithub.header, github: '' },
    };
    const passed = analyzeResumeForAts(withGithub, 'classic').checklist.find(
      (item) => item.id === 'github'
    );
    const failed = analyzeResumeForAts(withoutGithub, 'classic').checklist.find(
      (item) => item.id === 'github'
    );
    expect(passed?.pass).toBe(true);
    expect(failed?.pass).toBe(false);
    expect(
      analyzeResumeForAts(withoutGithub, 'classic').findings.some(
        (finding) => finding.id === 'missing-github'
      )
    ).toBe(true);
  });

  it('fails Track A when PDF extract is missing email or spans multiple pages', () => {
    const resume = resumeWithEntries([entry('a', 'Acme', [strongBullet])]);
    const analysis = analyzeResumeForAts(resume, 'classic', {
      pageCount: 2,
      isOnePage: false,
      normalizedText: 'alex johnson acme',
      fields: [
        { id: 'name', label: 'Name', expected: 'Alex Johnson', found: true },
        { id: 'email', label: 'Email', expected: 'alex@example.com', found: false },
      ],
      missingFieldIds: ['email'],
      sectionOrderOk: true,
    });

    expect(analysis.findings.some((finding) => finding.id === 'pdf-multi-page')).toBe(true);
    expect(analysis.findings.some((finding) => finding.id === 'pdf-missing-email')).toBe(true);
    expect(analysis.checklist.find((item) => item.id === 'one-page')?.pass).toBe(false);
    expect(analysis.checklist.find((item) => item.id === 'pdf-email')?.pass).toBe(false);
  });

  it('fails project-links and warns when a project URL is unlinkable', () => {
    const resume = resumeWithEntries([entry('a', 'Acme', [strongBullet])]);
    resume.sections = [
      ...resume.sections,
      {
        id: 'proj',
        type: 'standard',
        sectionName: 'Projects',
        order: 2,
        entries: [
          {
            id: 'p1',
            title: 'Evil',
            bulletPoints: [strongBullet],
            links: [{ label: 'repo', url: 'javascript:alert(1)' }],
          },
        ],
      },
    ];
    const analysis = analyzeResumeForAts(resume, 'classic');
    expect(analysis.checklist.find((item) => item.id === 'project-links')?.pass).toBe(false);
    expect(
      analysis.findings.some((finding) => finding.id === 'projects-unlinkable-urls')
    ).toBe(true);
  });

  it('fails pdf-contact when extract omits email and warns on incomplete section order', () => {
    const resume = resumeWithEntries([entry('a', 'Acme', [strongBullet])]);
    const analysis = analyzeResumeForAts(resume, 'classic', {
      pageCount: 1,
      isOnePage: true,
      normalizedText: 'alex johnson',
      fields: [
        { id: 'name', label: 'Name', expected: 'Alex Johnson', found: true },
        { id: 'email', label: 'Email', expected: 'alex@example.com', found: false },
      ],
      missingFieldIds: ['email'],
      sectionOrderOk: null,
    });

    expect(analysis.checklist.find((item) => item.id === 'pdf-contact')?.pass).toBe(false);
    expect(
      analysis.findings.some((finding) => finding.id === 'pdf-section-order-incomplete')
    ).toBe(true);
  });

  it('keeps PDF checklist closed until compile, and JD out of the parse score', () => {
    const resume = resumeWithEntries([entry('a', 'Acme', [strongBullet])]);
    const before = analyzeResumeForAts(resume, 'classic');
    expect(before.checklist.find((item) => item.id === 'one-page')?.pass).toBe(false);
    expect(before.findings.some((finding) => finding.id === 'pdf-not-compiled')).toBe(true);
    expect(before.findings.some((finding) => finding.id === 'missing-job-target')).toBe(false);

    const withJd = {
      ...resume,
      jobTarget: { company: 'Acme', role: 'Intern', jdText: 'Need TypeScript' },
    };
    const afterJd = analyzeResumeForAts(withJd, 'classic');
    expect(afterJd.score).toBe(before.score);

    const compiled = analyzeResumeForAts(resume, 'classic', {
      pageCount: 1,
      isOnePage: true,
      normalizedText: 'alex johnson alex@example.com',
      fields: [
        { id: 'name', label: 'Name', expected: 'Alex Johnson', found: true },
        { id: 'email', label: 'Email', expected: 'alex@example.com', found: true },
        { id: 'phone', label: 'Phone', expected: '', found: true },
      ],
      missingFieldIds: [],
      sectionOrderOk: true,
    });
    expect(compiled.score).toBeGreaterThan(before.score);
    expect(compiled.checklist.find((item) => item.id === 'one-page')?.pass).toBe(true);
  });

  it('passes an entry when any bullet already has a metric', () => {
    const mixed = resumeWithEntries([
      entry('mixed-1', 'Campus Course Planner', [
        'Full-stack planner with auth, waitlist tracking, and schedule export',
        'Server-side rendering for SEO, 95+ Lighthouse performance',
      ]),
    ]);
    const analysis = analyzeResumeForAts(mixed, 'classic');
    expect(analysis.findings.some((finding) => finding.id === 'metric-mixed-1')).toBe(false);

    const sample = analyzeResumeForAts(createSampleResume(), 'classic');
    expect(
      sample.findings.some(
        (finding) =>
          finding.id.startsWith('metric-') &&
          finding.description.includes('Campus Course Planner')
      )
    ).toBe(false);
    expect(
      sample.findings.some(
        (finding) =>
          finding.id.startsWith('metric-') &&
          finding.description.includes('Realtime Study Group Chat')
      )
    ).toBe(false);

    const none = resumeWithEntries([
      entry('none-1', 'Unquantified Tool', [
        'Full-stack planner with auth, waitlist tracking, and schedule export',
        'Group chats, file sharing, and message search',
      ]),
    ]);
    expect(
      analyzeResumeForAts(none, 'classic').findings.some((finding) => finding.id === 'metric-none-1')
    ).toBe(true);
  });

  it('penalizes verified-broken links so Verify Links reinforces the score', () => {
    const resume = resumeWithEntries([
      {
        ...entry('a', 'Acme', [strongBullet]),
        links: [{ label: 'repo', url: 'https://example.com/dead', verified: false }],
      },
    ]);
    const analysis = analyzeResumeForAts(resume, 'classic');
    expect(analysis.findings.some((finding) => finding.id === 'broken-verified-links')).toBe(true);
    expect(analysis.checklist.find((item) => item.id === 'links-live')?.pass).toBe(false);
  });
});

describe('applySafeParseFixes', () => {
  it('upgrades icon-only contact and trims empty bullets', () => {
    const dirty = resumeWithEntries([
      {
        ...entry('a', 'Acme', ['Shipped a feature used by 12 teams', '', '']),
      },
    ]);
    dirty.header.iconMode = 'icon';
    const fixed = applySafeParseFixes(dirty);
    expect(fixed.header.iconMode).toBe('icon-and-text');
    const experience = fixed.sections.find(
      (section) => section.type === 'standard' && section.sectionName === 'Experience'
    );
    expect(experience?.type === 'standard' && experience.entries[0].bulletPoints).toEqual([
      'Shipped a feature used by 12 teams',
    ]);
  });

  it('collapses empty-only bullet lists to []', () => {
    const dirty = resumeWithEntries([entry('a', 'Acme', ['', '  '])]);
    const fixed = applySafeParseFixes(dirty);
    const experience = fixed.sections.find(
      (section) => section.type === 'standard' && section.sectionName === 'Experience'
    );
    expect(experience?.type === 'standard' && experience.entries[0].bulletPoints).toEqual([]);
  });
});
