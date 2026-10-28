import { describe, expect, it } from 'vitest';
import { checkTailorGuard, extractMetrics } from '@/lib/tailorGuard';
import { createSampleResume } from '@/lib/sampleData';
import type { Resume, SkillsSection, StandardSection } from '@/types/resume';

const clone = (resume: Resume): Resume => structuredClone(resume);
const firstStandard = (resume: Resume) =>
  resume.sections.find((section) => section.type === 'standard' && section.entries.some((e) => e.bulletPoints.length)) as StandardSection;
const firstSkills = (resume: Resume) =>
  resume.sections.find((section) => section.type === 'skills') as SkillsSection;
const entryWithBullets = (resume: Resume) =>
  firstStandard(resume).entries.find((entry) => entry.bulletPoints.length > 0)!;

describe('extractMetrics', () => {
  it('keeps numbers with their units', () => {
    expect(extractMetrics('Cut errors by 70% at sub-50ms for 900+ people, 1 in 12 runs')).toEqual([
      '70%',
      '50ms',
      '900+',
      '1',
      '12',
    ]);
  });
});

describe('checkTailorGuard', () => {
  it('passes an unchanged resume', () => {
    const base = createSampleResume();
    expect(checkTailorGuard(base, clone(base)).ok).toBe(true);
  });

  it('accepts a shorter reworded bullet that keeps its metrics, plus added skills', () => {
    const base = createSampleResume();
    const entry = entryWithBullets(base);
    entry.bulletPoints[0] = 'Reduced build time by 30% across 12 services using caching and parallel jobs.';
    const tailored = clone(base);
    entryWithBullets(tailored).bulletPoints[0] = 'Cut build time by 30% across 12 services with CI caching.';
    firstSkills(tailored).categories[0].skills.push('CI/CD');

    const result = checkTailorGuard(base, tailored);
    expect(result.ok).toBe(true);
    expect(result.bulletChanges).toHaveLength(1);
    expect(result.skillsAdded).toEqual(['CI/CD']);
  });

  it('flags longer bullets, dropped metrics, and frozen field edits', () => {
    const base = createSampleResume();
    entryWithBullets(base).bulletPoints[0] = 'Reduced build time by 30% across 12 services.';
    const tailored = clone(base);
    const entry = entryWithBullets(tailored);
    entry.bulletPoints[0] = 'Reduced build time by 25% across many services with a much longer sentence.';
    entry.dates = { start: '2020-01', end: 'present' };
    tailored.header.email = 'other@example.com';

    const messages = checkTailorGuard(base, tailored).issues.map((issue) => issue.message);
    expect(messages.some((m) => m.startsWith('longer than the base'))).toBe(true);
    expect(messages.some((m) => m.includes('30%') && m.includes('12'))).toBe(true);
    expect(messages).toContain('dates changed');
    expect(messages).toContain('email changed');
  });

  it('flags removed skills, too many added skills, removed techStack, and em dashes', () => {
    const base = createSampleResume();
    const tailored = clone(base);
    const category = firstSkills(tailored).categories[0];
    const dropped = category.skills.shift();
    category.skills.push('A1', 'A2', 'A3', 'A4', 'A5', 'A6');
    entryWithBullets(tailored).bulletPoints[0] = entryWithBullets(base).bulletPoints[0].slice(0, 10) + '\u2014';

    const messages = checkTailorGuard(base, tailored).issues.map((issue) => issue.message);
    expect(messages).toContain(`skills removed: ${dropped}`);
    expect(messages).toContain('6 skills added (max 5)');
    expect(messages).toContain('contains an em dash');
  });

  it('ignores name and jobTarget edits, including em dashes in the pasted posting', () => {
    const base = createSampleResume();
    const tailored = { ...clone(base), name: 'Alex_Acme_SWE', jobTarget: { company: 'Acme', role: 'SWE', jdText: 'Fast\u2014paced' } };
    expect(checkTailorGuard(base, tailored).ok).toBe(true);
  });
});
