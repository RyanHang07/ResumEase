import { describe, expect, it } from 'vitest';
import { analyzeFit, readCandidateFacts } from '@/lib/fitCheck';
import { CURRENT_SCHEMA_VERSION, createDefaultHeader, type Resume } from '@/types/resume';

const NOW = new Date('2026-10-28T12:00:00Z');

// Mirrors the handoff profile: BS 2025-06, Filmadi since 2025-08, a 2023 student sprint
const candidate = (): Resume => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: 'fit',
  header: { ...createDefaultHeader(), name: 'Test Person', location: 'San Jose, CA, USA' },
  sections: [
    {
      id: 'edu', type: 'standard', sectionName: 'Education', order: 0,
      entries: [{ id: 'e', title: '', organization: 'UC Davis', dates: { start: '2021-09', end: '2025-06' }, bulletPoints: [] }],
    },
    {
      id: 'exp', type: 'standard', sectionName: 'Experience', order: 1,
      entries: [
        { id: 'x1', title: '', organization: 'Filmadi', dates: { start: '2025-08', end: 'present' }, bulletPoints: ['Built search in TypeScript and Python.'] },
        { id: 'x2', title: '', organization: 'AISC', dates: { start: '2023-09', end: '2024-01' }, bulletPoints: ['Tuned models.'] },
      ],
    },
    {
      id: 'skills', type: 'skills', sectionName: 'Technical Skills', order: 2,
      categories: [{ id: 'c', categoryName: 'Languages', skills: ['Python', 'TypeScript', 'JavaScript', 'SQL'] }],
    },
  ],
  lastModified: NOW,
});

const fit = (jd: string) => analyzeFit(candidate(), jd, NOW);
const ids = (jd: string) => fit(jd).flags.map((flag) => `${flag.id}:${flag.severity}`);

describe('readCandidateFacts', () => {
  it('reads graduation and merged experience months from the resume', () => {
    const facts = readCandidateFacts(candidate(), NOW);
    expect(facts.graduated).toBe('2025-06');
    expect(facts.stillStudying).toBe(false);
    expect(facts.experienceMonths).toBe(15 + 5);
  });
});

describe('analyzeFit', () => {
  it('gives A to a clean match', () => {
    const result = fit('Full stack engineer. TypeScript, React, Python. Remote in the US. 1+ years of experience.');
    expect(result.tier).toBe('A');
    expect(result.flags).toEqual([]);
  });

  it('skips student-only internships (Cisco, Neuralink style)', () => {
    expect(ids('Software Engineering Intern. Must be currently enrolled in a Bachelor’s program.')).toContain('student-only:C');
    expect(ids('Summer internship for engineers.')).toContain('internship:B');
  });

  it('skips new-grad programs you are outside of (Intuit, Otter style)', () => {
    expect(ids('Open to candidates who graduated within the last 12 months.')).toContain('grad-window:C');
    expect(ids('New grad role for the Class of 2026.')).toContain('grad-window:C');
    expect(ids('For engineers graduating between 2024 and 2025.')).not.toContain('grad-window:C');
  });

  it('grades years of experience against yours (Gamma style)', () => {
    expect(ids('3+ years of professional software experience.')).toContain('years:C');
    expect(ids('2+ years of industry experience.')).toContain('years:B');
    expect(ids('5+ years preferred, 1+ years of experience required.')).toEqual([]);
    expect(ids('Bachelor’s or a 4-year degree.')).toEqual([]);
  });

  it('flags stack mismatches (PayPal, Coram style)', () => {
    expect(ids('Backend in Java and Spring Boot.')).toContain('stack:C');
    expect(ids('We use Go and Kubernetes.')).toContain('stack:C');
    expect(ids('Python and Go services.')).toContain('stack:B');
    expect(ids('Go to market fast with TypeScript.')).toEqual([]);
  });

  it('flags onsite roles away from the Bay Area, not ones in it', () => {
    expect(ids('Onsite 5 days a week in our New York office.')).toContain('location:B');
    expect(ids('Hybrid, 3 days a week in our San Francisco office.')).toEqual([]);
  });

  it('treats clearance as a skip', () => {
    expect(fit('Active Secret clearance required.').tier).toBe('C');
  });

  it('includes evidence from the posting', () => {
    const flag = fit('Great team. Requires 3+ years of backend experience. Benefits.').flags[0];
    expect(flag.evidence).toContain('3+ years of backend experience');
  });
});
