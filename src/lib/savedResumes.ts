import { slugify } from '@/lib/resumeFilename';

export const MAX_SAVED_RESUMES = 100;
export const SAVED_RESUME_EXPIRY_DAYS = 90;
/** Saves made before expiry shipped count their 90 days from here, so none vanish on deploy. */
export const SAVED_RESUME_EXPIRY_START = '2026-10-28T00:00:00.000Z';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deterministic id so saving the same name again overwrites instead of duplicating. */
export const savedResumeId = (name: string): string => slugify(name).toLowerCase();

export const isSavedResumeExpired = (savedAt: Date | string, now: Date = new Date()): boolean => {
  const clockStart = Math.max(
    new Date(savedAt).getTime(),
    new Date(SAVED_RESUME_EXPIRY_START).getTime()
  );
  return now.getTime() - clockStart > SAVED_RESUME_EXPIRY_DAYS * DAY_MS;
};
