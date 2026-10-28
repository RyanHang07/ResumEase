import { slugify } from '@/lib/resumeFilename';

export const MAX_SAVED_RESUMES = 100;
export const SAVED_RESUME_EXPIRY_DAYS = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deterministic id so saving the same name again overwrites instead of duplicating. */
export const savedResumeId = (name: string): string => slugify(name).toLowerCase();

export const isSavedResumeExpired = (savedAt: Date | string, now: Date = new Date()): boolean =>
  now.getTime() - new Date(savedAt).getTime() > SAVED_RESUME_EXPIRY_DAYS * DAY_MS;
