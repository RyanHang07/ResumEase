import type { Header, StandardEntry } from '@/types/resume';
import {
  getEntryDateText,
  getEntryLinkUrl,
  getEntryPrimaryText,
  getEntrySecondaryText,
  formatGpa,
} from '@/lib/resumeDisplay';
import { formatYearMonth } from '@/lib/dateSpan';
import { escapeHrefUrl, escapeLatex, normalizeSectionName } from './shared';

export const getEducationMetaLatex = (entry: StandardEntry): string => {
  const parts: string[] = [];
  if (entry.expectedGraduation?.trim()) {
    parts.push(`Expected ${formatYearMonth(entry.expectedGraduation.trim())}`);
  }
  const gpa = formatGpa(entry.gpa);
  if (gpa) parts.push(`GPA ${gpa}`);
  return parts.map(escapeLatex).join(' $\\cdot$ ');
};

/** @deprecated Header no longer prints grad/GPA; use education entry fields. */
export const getInternPacketLatex = (_header: Header): string => '';

export const getLatexEntryParts = (entry: StandardEntry, sectionName: string) => {
  const primary = getEntryPrimaryText(entry, sectionName);
  const secondary = getEntrySecondaryText(entry, sectionName);
  const dates = getEntryDateText(entry, ' -- ');
  const href = escapeHrefUrl(getEntryLinkUrl(entry));
  const coursework = (entry.coursework ?? []).map((item) => item.trim()).filter(Boolean);
  const bullets = entry.bulletPoints.filter((bullet) => bullet.trim());
  const escapedPrimary = escapeLatex(primary);
  const primaryLatex = href
    ? `\\href{${href}}{\\textbf{${escapedPrimary}}}`
    : `\\textbf{${escapedPrimary}}`;
  const linkedPrimary = href ? `\\href{${href}}{${escapedPrimary}}` : escapedPrimary;
  const sectionType = normalizeSectionName(sectionName);
  const isEducation = sectionType === 'education';
  const educationMeta = isEducation ? getEducationMetaLatex(entry) : '';
  const courseworkLatex = coursework.map(escapeLatex).join(', ');

  return {
    /** False for Summary-style entries with no org, title, role, location, dates, or extras. */
    hasHeading: Boolean(primary || secondary || dates || courseworkLatex || educationMeta),
    isSummary: sectionType === 'summary',
    primaryLatex,
    linkedPrimary,
    secondaryLatex: escapeLatex(secondary),
    datesLatex: escapeLatex(dates),
    courseworkLatex,
    educationMetaLatex: educationMeta,
    bullets,
  };
};
