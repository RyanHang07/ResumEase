import type { Header, Resume, StandardEntry } from '@/types/resume';
import { formatDateSpan, formatYearMonth } from '@/lib/dateSpan';
import { normalizeSectionName } from '@/lib/templates/shared';

export const headerUsesIcons = (header: Header): boolean => {
  if (header.iconMode) return header.iconMode !== 'none';
  return header.useIcons !== false;
};

export const getEntryPrimaryText = (
  entry: StandardEntry,
  sectionName: string
): string => {
  const type = normalizeSectionName(sectionName);
  if (type === 'projects') return entry.title.trim();
  return (entry.organization || entry.title).trim();
};

export const getEntrySecondaryText = (
  entry: StandardEntry,
  sectionName: string
): string => {
  const type = normalizeSectionName(sectionName);
  if (type === 'projects') {
    return (entry.techStack ?? []).map((item) => item.trim()).filter(Boolean).join(', ');
  }

  return [entry.role, entry.location].filter((part) => part?.trim()).join(', ');
};

export const getEntryDateText = (
  entry: StandardEntry,
  separator = ' – '
): string => formatDateSpan(entry.dates, entry.dateRange, separator);

export const getEntryLinkUrl = (entry: StandardEntry): string =>
  entry.links?.find((link) => link.url.trim())?.url.trim() ?? '';

export const formatGpa = (gpa?: number): string => {
  if (typeof gpa !== 'number' || !Number.isFinite(gpa)) return '';
  return Number.isInteger(gpa) ? String(gpa) : String(gpa);
};

export const getEducationMetaParts = (entry: StandardEntry): string[] => {
  const parts: string[] = [];
  if (entry.expectedGraduation?.trim()) {
    parts.push(`Expected ${formatYearMonth(entry.expectedGraduation.trim())}`);
  }
  const gpa = formatGpa(entry.gpa);
  if (gpa) parts.push(`GPA ${gpa}`);
  return parts;
};

/** Resume has expected graduation on any education entry (or legacy header). */
export const resumeHasExpectedGraduation = (resume: Resume): boolean => {
  if (resume.header.expectedGraduation?.trim()) return true;
  return resume.sections.some(
    (section) =>
      section.type === 'standard' &&
      normalizeSectionName(section.sectionName) === 'education' &&
      section.entries.some((entry) => Boolean(entry.expectedGraduation?.trim()))
  );
};

export const getPrimaryExpectedGraduation = (resume: Resume): string => {
  for (const section of resume.sections) {
    if (section.type !== 'standard') continue;
    if (normalizeSectionName(section.sectionName) !== 'education') continue;
    for (const entry of section.entries) {
      if (entry.expectedGraduation?.trim()) return entry.expectedGraduation.trim();
    }
  }
  return resume.header.expectedGraduation?.trim() ?? '';
};

/** Plain-text contact lines matching LaTeX header rules (identity + links if ≥3). */
export const getHeaderContactPlainLines = (
  header: Header
): { line1: string[]; line2: string[] } => {
  const line1: string[] = [];
  if (header.workAuthorization?.trim()) line1.push(header.workAuthorization.trim());
  if (header.phone?.trim()) line1.push(header.phone.trim());
  if (header.email?.trim()) line1.push(header.email.trim());
  if (header.location?.trim()) line1.push(header.location.trim());

  const linkParts: string[] = [];
  if (header.linkedIn?.trim()) linkParts.push(header.linkedIn.trim());
  if (header.github?.trim()) linkParts.push(header.github.trim());
  if (header.website?.trim()) linkParts.push(header.website.trim());
  if (header.blog?.trim()) linkParts.push(header.blog.trim());

  if (linkParts.length >= 3) {
    return { line1, line2: linkParts };
  }
  return { line1: [...line1, ...linkParts], line2: [] };
};

/** @deprecated Identity fields now live on the main contact line. */
export const getInternPacketParts = (header: Header): string[] => {
  const parts: string[] = [];
  if (header.workAuthorization?.trim()) parts.push(header.workAuthorization.trim());
  if (header.location?.trim()) parts.push(header.location.trim());
  return parts;
};
