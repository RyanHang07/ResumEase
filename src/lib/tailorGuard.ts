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
  /** Entries whose bullets were only reordered (no text change). Informational, never an issue. */
  reorderedEntries: string[];
  skillsAdded: string[];
  techStackAdded: Array<{ location: string; items: string[] }>;
}

const EM_DASH = '\u2014';
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

const countOf = (items: string[]) => {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
};

/** Items in `a` beyond their count in `b`, e.g. metrics the tailored entry lost. */
const excess = (a: string[], b: string[]): string[] => {
  const available = countOf(b);
  return a.filter((item) => {
    const left = available.get(item) ?? 0;
    if (left > 0) {
      available.set(item, left - 1);
      return false;
    }
    return true;
  });
};

const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9%+.#]+/g) ?? []);

const similarity = (a: string, b: string): number => {
  const left = words(a);
  const right = words(b);
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / Math.max(1, left.size + right.size - shared);
};

/**
 * Order-insensitive bullet rules for one entry:
 * - Length: sort both sides longest first and compare rank by rank. This passes exactly when
 *   every tailored bullet can be paired with a distinct base bullet at least as long, so a pure
 *   reorder or a same-length rewrite never warns.
 * - Metrics: counted across the whole entry, so a metric may move to another bullet. Losing one
 *   warns; a number that is not in the base entry also warns (it may be invented).
 * - Display: unchanged text pairs with itself; the rest pair with the most similar unused base
 *   bullet, purely to show a readable before/after.
 */
export const compareBullets = (
  before: string[],
  after: string[],
  location: string
): { issues: GuardIssue[]; changes: BulletChange[]; reordered: boolean } => {
  const issues: GuardIssue[] = [];
  const changes: BulletChange[] = [];

  if (before.length !== after.length) {
    issues.push({ location, message: `bullet count changed from ${before.length} to ${after.length}` });
  }

  const baseLengths = before.map((bullet) => bullet.length).sort((x, y) => y - x);
  const ranked = after
    .map((bullet, index) => ({ index, length: bullet.length }))
    .sort((x, y) => y.length - x.length);
  for (let rank = 0; rank < Math.min(ranked.length, baseLengths.length); rank += 1) {
    if (ranked[rank].length > baseLengths[rank]) {
      issues.push({
        location: `${location} bullet ${ranked[rank].index + 1}`,
        message: `longer than the base allows (${ranked[rank].length} chars; the matching base bullet is ${baseLengths[rank]})`,
      });
      break;
    }
  }

  const baseMetrics = before.flatMap(extractMetrics);
  const newMetrics = after.flatMap(extractMetrics);
  const lost = excess(baseMetrics, newMetrics);
  if (lost.length > 0) issues.push({ location, message: `metric dropped or changed: ${lost.join(', ')}` });
  const invented = excess(newMetrics, baseMetrics);
  if (invented.length > 0) issues.push({ location, message: `number not in the base: ${invented.join(', ')}` });

  const unused = new Set(before.map((_, index) => index));
  const pairs = new Map<number, number>();
  after.forEach((bullet, index) => {
    const exact = [...unused].find((baseIndex) => before[baseIndex] === bullet);
    if (exact !== undefined) {
      pairs.set(index, exact);
      unused.delete(exact);
    }
  });
  after.forEach((bullet, index) => {
    if (pairs.has(index) || unused.size === 0) return;
    const best = [...unused].reduce((top, baseIndex) =>
      similarity(before[baseIndex], bullet) > similarity(before[top], bullet) ? baseIndex : top
    );
    pairs.set(index, best);
    unused.delete(best);
  });

  let moved = false;
  after.forEach((bullet, index) => {
    const baseIndex = pairs.get(index);
    if (baseIndex === undefined) return;
    if (baseIndex !== index) moved = true;
    if (before[baseIndex] === bullet) return;
    changes.push({
      location: `${location} bullet ${index + 1}${baseIndex !== index ? ` (was ${baseIndex + 1})` : ''}`,
      before: before[baseIndex],
      after: bullet,
    });
  });

  return { issues, changes, reordered: moved && changes.length === 0 };
};

export const checkTailorGuard = (base: Resume, tailored: Resume): TailorGuardResult => {
  const issues: GuardIssue[] = [];
  const bulletChanges: BulletChange[] = [];
  const skillsAdded: string[] = [];
  const techStackAdded: TailorGuardResult['techStackAdded'] = [];
  const reorderedEntries: string[] = [];
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
      // Categories match by id, so reordering them is fine; skills compare across the whole
      // section, so moving one between categories is neither a removal nor an addition
      const categories = new Map(section.categories.map((category) => [category.id, category]));
      for (const baseCategory of baseSection.categories) {
        const category = categories.get(baseCategory.id);
        const location = `${label} > ${baseCategory.categoryName}`;
        if (!category) flag(location, 'category removed');
        else if (category.categoryName !== baseCategory.categoryName) flag(location, 'category renamed');
      }
      const baseCategoryIds = new Set(baseSection.categories.map((category) => category.id));
      for (const category of section.categories) {
        if (!baseCategoryIds.has(category.id)) flag(`${label} > ${category.categoryName}`, 'category added');
      }
      const baseSkills = baseSection.categories.flatMap((category) => category.skills);
      const skills = section.categories.flatMap((category) => category.skills);
      const lost = removed(baseSkills, skills);
      if (lost.length > 0) flag(label, `skills removed: ${lost.join(', ')}`);
      skillsAdded.push(...added(baseSkills, skills));
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

      const bullets = compareBullets(baseEntry.bulletPoints, entry.bulletPoints, location);
      issues.push(...bullets.issues);
      bulletChanges.push(...bullets.changes);
      if (bullets.reordered) reorderedEntries.push(location);
    });
  });

  if (skillsAdded.length > MAX_ADDED_SKILLS) {
    flag('Skills', `${skillsAdded.length} skills added (max ${MAX_ADDED_SKILLS})`);
  }

  // jobTarget may hold the pasted posting, which is not ours to police
  if (collectStrings({ ...tailored, jobTarget: undefined }).some((text) => text.includes(EM_DASH))) {
    flag('Resume', 'contains an em dash');
  }

  return {
    ok: issues.length === 0,
    issues,
    bulletChanges,
    reorderedEntries,
    skillsAdded,
    techStackAdded,
  };
};
