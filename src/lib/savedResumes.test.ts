import { describe, expect, it } from 'vitest';
import { SAVED_RESUME_EXPIRY_START, isSavedResumeExpired, savedResumeId } from '@/lib/savedResumes';

const DAY_MS = 24 * 60 * 60 * 1000;
const start = new Date(SAVED_RESUME_EXPIRY_START).getTime();

describe('isSavedResumeExpired', () => {
  it('does not expire pre-existing saves until 90 days after the clock start', () => {
    const ancient = new Date('2025-01-01T00:00:00Z');
    expect(isSavedResumeExpired(ancient, new Date(start + 89 * DAY_MS))).toBe(false);
    expect(isSavedResumeExpired(ancient, new Date(start + 91 * DAY_MS))).toBe(true);
  });

  it('counts newer saves from their own date', () => {
    const saved = new Date(start + 10 * DAY_MS);
    expect(isSavedResumeExpired(saved, new Date(start + 99 * DAY_MS))).toBe(false);
    expect(isSavedResumeExpired(saved, new Date(start + 101 * DAY_MS))).toBe(true);
  });
});

describe('savedResumeId', () => {
  it('is case and spacing insensitive', () => {
    expect(savedResumeId('Acme  SWE')).toBe(savedResumeId('acme swe'));
  });
});
