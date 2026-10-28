import type { Resume, Section, StandardEntry } from '@/types/resume';
import { getEntryPrimaryText } from '@/lib/resumeDisplay';

/**
 * Deterministic version of the tailor skill's self-check: compares a tailored
 * resume against the pinned base and reports anything outside the editable set
 * (bullets, added skills, added techStack, name, jobTarget).
 */

export const MAX_ADDED_SKILLS = 5;

export interface GuardIssue {
  location: string;
  message: string;
}

export interface BulletChange {
  location: string;
  before: string;
  after: string;
}

export interface TailorGuardResult {
  ok: boolean;
  issues: GuardIssue[];
  bulletChanges: BulletChange[];
  skillsAdded: string[];
  techStackAdded: Array<{ location: string; items: string[] }>;
}

const EM_DASH = '—';
const METRIC = /\$?\d+(?:[.,]\d+)*\+?(?:\s?(?:%|x\b|ms\b|k\b))?/gi;

const FROZEN_ENTRY_FIELDS = [
  'role',
  'organization',
  'title',
  'location',
  'dates',
  'links',
  'coursework',
  'expectedGraduation',
  'gpa',
] as const satisfies ReadonlyArray<keyof StandardEntry>;

/** Numbers with their unit, e.g. "30%", "900+", "50ms", "$1.2". */
export const extractMetrics = (text: string): string[] =>
  [...text.matchAll(METRIC)].map((match) => match[0].replace(/\s+/g, '').toLowerCase());

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const lower = (items: string[] | undefined) => new Set((items ?? []).map((item) => item.trim().toLowerCase()));

const added = (before: string[] | undefined, after: string[] | undefined): string[] => {
  const known = lower(before);
  return (after ?? []).filter((item) => !known.has(item.trim().toLowerCase()));
};

const removed = (before: string[] | undefined, after: string[] | undefined): string[] => {
  const kept = lower(after);
  return (before ?? []).filter((item) => !kept.has(item.trim().toLowerCase()));
};

const sectionLabel = (section: Section) => section.sectionName || section.id;

const collectStrings = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => collectStrings(item, out));
  return out;
};

export const checkTailorGuard = (base: Resume, tailored: Resume): TailorGuardResult => {
  const issues: GuardIssue[] = [];
  const bulletChanges: BulletChange[] = [];
  const skillsAdded: string[] = [];
  const techStackAdded: TailorGuardResult['techStackAdded'] = [];
  const flag = (location: string, message: string) => issues.push({ location, message });

  if (base.id !== tailored.id) flag('Resume', 'id changed (tailored from a different base?)');

  for (const key of new Set([...Object.keys(base.header), ...Object.keys(tailored.header)])) {
    const field = key as keyof Resume['header'];
    if (!same(base.header[field], tailored.header[field])) flag('Header', `${key} changed`);
  }

  if (base.sections.length !== tailored.sections.length) {
    flag('Sections', `count changed from ${base.sections.length} to ${tailored.sections.length}`);
  }

  base.sections.forEach((baseSection, sectionIndex) => {
    const section = tailored.sections[sectionIndex];
    const label = sectionLabel(baseSection);
    if (!section || section.id !== baseSection.id) {
      flag(label, 'section missing or moved');
      return;
    }
    if (section.sectionName !== baseSection.sectionName) flag(label, 'section renamed');
    if (section.order !== baseSection.order) flag(label, 'section order changed');

    if (baseSection.type === 'skills' || section.type === 'skills') {
      if (baseSection.type !== 'skills' || section.type !== 'skills') {
        flag(label, 'section type changed');
        return;
      }
      if (baseSection.categories.length !== section.categories.length) {
        flag(label, 'category count changed');
      }
      baseSection.categories.forEach((baseCategory, categoryIndex) => {
        const category = section.categories[categoryIndex];
        const location = `${label} > ${baseCategory.categoryName}`;
        if (!category || category.id !== baseCategory.id) {
          flag(location, 'category missing or moved');
          return;
        }
        if (category.categoryName !== baseCategory.categoryName) flag(location, 'category renamed');
        const lost = removed(baseCategory.skills, category.skills);
        if (lost.length > 0) flag(location, `skills removed: ${lost.join(', ')}`);
        skillsAdded.push(...added(baseCategory.skills, category.skills));
      });
      return;
    }

    if (baseSection.entries.length !== section.entries.length) flag(label, 'entry count changed');
    baseSection.entries.forEach((baseEntry, entryIndex) => {
      const entry = section.entries[entryIndex];
      const location = `${label} > ${getEntryPrimaryText(baseEntry, baseSection.sectionName) || baseEntry.id}`;
      if (!entry || entry.id !== baseEntry.id) {
        flag(location, 'entry missing or moved');
        return;
      }
      for (const field of FROZEN_ENTRY_FIELDS) {
        if (!same(baseEntry[field], entry[field])) flag(location, `${field} changed`);
      }

      const lostTech = removed(baseEntry.techStack, entry.techStack);
      if (lostTech.length > 0) flag(location, `techStack removed: ${lostTech.join(', ')}`);
      const newTech = added(baseEntry.techStack, entry.techStack);
      if (newTech.length > 0) techStackAdded.push({ location, items: newTech });

      if (baseEntry.bulletPoints.length !== entry.bulletPoints.length) {
        flag(location, `bullet count changed from ${baseEntry.bulletPoints.length} to ${entry.bulletPoints.length}`);
      }
      baseEntry.bulletPoints.forEach((before, bulletIndex) => {
        const after = entry.bulletPoints[bulletIndex];
        if (after === undefined || after === before) return;
        const bulletLocation = `${location} bullet ${bulletIndex + 1}`;
        bulletChanges.push({ location: bulletLocation, before, after });
        if (after.length > before.length) {
          flag(bulletLocation, `longer than the base (${after.length} vs ${before.length} chars)`);
        }
        const metricsAfter = extractMetrics(after);
        const lostMetrics = extractMetrics(before).filter((metric) => !metricsAfter.includes(metric));
        if (lostMetrics.length > 0) flag(bulletLocation, `metric dropped or changed: ${lostMetrics.join(', ')}`);
      });
    });
  });

  if (skillsAdded.length > MAX_ADDED_SKILLS) {
    flag('Skills', `${skillsAdded.length} skills added (max ${MAX_ADDED_SKILLS})`);
  }

  // jobTarget may hold the pasted posting, which is not ours to police
  if (collectStrings({ ...tailored, jobTarget: undefined }).some((text) => text.includes(EM_DASH))) {
    flag('Resume', 'contains an em dash');
  }

  return { ok: issues.length === 0, issues, bulletChanges, skillsAdded, techStackAdded };
};
