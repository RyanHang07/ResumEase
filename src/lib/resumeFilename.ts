import type { Resume } from '@/types/resume';

const MAX_SLUG = 80;

export type ResumeFileExtension = 'pdf' | 'json' | 'docx' | 'tex';

export const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, MAX_SLUG)
    .replace(/^-|-$/g, '');

/** Explicit `name` wins; otherwise header name + target company + role; then "resume". */
export const resumeBaseName = (resume: Resume): string => {
  const explicit = resume.name?.trim();
  if (explicit) return slugify(explicit) || 'resume';
  const parts = [resume.header.name, resume.jobTarget?.company, resume.jobTarget?.role]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  return slugify(parts.join(' ')) || 'resume';
};

export const resumeFilename = (resume: Resume, ext: ResumeFileExtension): string =>
  `${resumeBaseName(resume)}.${ext}`;
