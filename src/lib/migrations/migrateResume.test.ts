import { describe, expect, it } from 'vitest';
import { parseDateRange } from '@/lib/dateSpan';
import { migrateResume } from '@/lib/migrations';
import { createSampleResume } from '@/lib/sampleData';
import { generateClassicLatex } from '@/lib/templates/classic';

const v1Resume = {
  id: 'v1-resume',
  header: {
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    phone: '(555) 123-4567',
    linkedIn: 'https://linkedin.com/in/alexjohnson',
    github: 'https://github.com/alexjohnson',
    useIcons: true,
  },
  sections: [
    {
      id: 'section-education-001',
      type: 'standard',
      sectionName: 'Education',
      order: 0,
      entries: [
        {
          id: 'entry-edu-001',
          title: 'State University',
          organization: 'Bachelor of Science in Computer Science',
          dateRange: 'May 2019',
          bulletPoints: ['Relevant Coursework: Data Structures'],
        },
      ],
    },
    {
      id: 'section-experience-001',
      type: 'standard',
      sectionName: 'Experience',
      order: 1,
      entries: [
        {
          id: 'entry-exp-001',
          title: 'Tech Company Inc.',
          organization: 'Software Engineering Intern',
          dateRange: 'Jan 2022 -- Present',
          bulletPoints: ['Shipped a feature used by 1,000 users'],
        },
      ],
    },
    {
      id: 'section-projects-001',
      type: 'standard',
      sectionName: 'Projects',
      order: 2,
      entries: [
        {
          id: 'entry-proj-001',
          title: 'Campus Course Planner',
          organization: 'Next.js, PostgreSQL, Stripe',
          dateRange: '',
          bulletPoints: ['Built a planner for intern course registration'],
        },
      ],
    },
  ],
  lastModified: '2024-01-01T00:00:00.000Z',
};

describe('parseDateRange', () => {
  it('parses latex double hyphens and Present', () => {
    expect(parseDateRange('Jan 2022 -- Present')).toEqual({
      start: '2022-01',
      end: 'present',
    });
  });

  it('parses a single month year as start and end', () => {
    expect(parseDateRange('May 2019')).toEqual({
      start: '2019-05',
      end: '2019-05',
    });
  });
});

describe('migrateResume v1 to v2', () => {
  it('un-swaps experience and education, splits project tech, and sets iconMode', () => {
    const migrated = migrateResume(v1Resume);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.header.iconMode).toBe('icon-and-text');
    expect(migrated.header.useIcons).toBeUndefined();

    const education = migrated.sections[0];
    if (education.type !== 'standard') throw new Error('expected standard');
    expect(education.entries[0].organization).toBe('State University');
    expect(education.entries[0].role).toBe('Bachelor of Science in Computer Science');
    expect(education.entries[0].title).toBe('');
    expect(education.entries[0].dates).toEqual({ start: '2019-05', end: '2019-05' });

    const experience = migrated.sections[1];
    if (experience.type !== 'standard') throw new Error('expected standard');
    expect(experience.entries[0].organization).toBe('Tech Company Inc.');
    expect(experience.entries[0].role).toBe('Software Engineering Intern');
    expect(experience.entries[0].title).toBe('');
    expect(experience.entries[0].dates).toEqual({ start: '2022-01', end: 'present' });

    const projects = migrated.sections[2];
    if (projects.type !== 'standard') throw new Error('expected standard');
    expect(projects.entries[0].title).toBe('Campus Course Planner');
    expect(projects.entries[0].techStack).toEqual(['Next.js', 'PostgreSQL', 'Stripe']);
    expect(projects.entries[0].organization).toBeUndefined();
  });

  it('does not un-swap an already migrated resume', () => {
    const first = migrateResume(v1Resume);
    const second = migrateResume(first);
    const experience = second.sections[1];
    if (experience.type !== 'standard') throw new Error('expected standard');
    expect(experience.entries[0].organization).toBe('Tech Company Inc.');
    expect(experience.entries[0].role).toBe('Software Engineering Intern');
    expect(experience.entries[0].title).toBe('');
  });

  it('clears education/experience title when it only duplicated organization', () => {
    const sample = createSampleResume();
    const education = sample.sections[0];
    if (education.type !== 'standard') throw new Error('expected standard');
    education.entries[0].title = 'State University';
    education.entries[0].organization = 'State University';

    const migrated = migrateResume(sample);
    const migratedEducation = migrated.sections[0];
    if (migratedEducation.type !== 'standard') throw new Error('expected standard');
    expect(migratedEducation.entries[0].organization).toBe('State University');
    expect(migratedEducation.entries[0].title).toBe('');
  });

  it('maps useIcons false to iconMode none', () => {
    const migrated = migrateResume({
      ...v1Resume,
      header: { ...v1Resume.header, useIcons: false },
    });
    expect(migrated.header.iconMode).toBe('none');
  });

  it('moves header graduation and GPA onto the first education entry', () => {
    const migrated = migrateResume({
      ...v1Resume,
      header: {
        ...v1Resume.header,
        expectedGraduation: '2027-05',
        gpa: 3.7,
      },
    });
    expect(migrated.header.expectedGraduation).toBeUndefined();
    expect(migrated.header.gpa).toBeUndefined();
    expect(JSON.parse(JSON.stringify(migrated)).header).not.toHaveProperty(
      'expectedGraduation'
    );
    expect(JSON.parse(JSON.stringify(migrated)).header).not.toHaveProperty('gpa');
    const education = migrated.sections[0];
    if (education.type !== 'standard') throw new Error('expected standard');
    expect(education.entries[0].expectedGraduation).toBe('2027-05');
    expect(education.entries[0].gpa).toBe(3.7);
  });

  it('strips empty header expectedGraduation so JSON does not re-emit it', () => {
    const migrated = migrateResume({
      ...v1Resume,
      header: {
        ...v1Resume.header,
        expectedGraduation: '',
      },
    });
    expect(JSON.parse(JSON.stringify(migrated)).header).not.toHaveProperty(
      'expectedGraduation'
    );
  });

  it('drops the removed coverLetter field from older JSON', () => {
    const migrated = migrateResume({ ...v1Resume, coverLetter: 'Dear team...' });
    expect(migrated).not.toHaveProperty('coverLetter');
  });
});

describe('sample resume v2', () => {
  it('is schema v2 and generates classic latex with education meta fields', () => {
    const resume = createSampleResume();
    expect(resume.schemaVersion).toBe(2);
    const latex = generateClassicLatex(resume);
    expect(latex).toContain('Alex Johnson');
    expect(latex).toContain('State University');
    expect(latex).toContain('Software Engineering Intern');
    expect(latex).toContain('Campus Course Planner');
    expect(latex).toContain('Expected May 2027');
    expect(latex).toContain('GPA 3.8');
    expect(latex).not.toContain('ossAttestation');
  });
});
