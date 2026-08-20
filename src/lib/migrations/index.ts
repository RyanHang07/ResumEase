import {
  CURRENT_SCHEMA_VERSION,
  type Header,
  type IconMode,
  type Resume,
  type Section,
  type StandardEntry,
} from '@/types/resume';
import { parseDateRange } from '@/lib/dateSpan';
import { parseResume } from '@/lib/schema/resume';
import { normalizeSectionName } from '@/lib/templates/shared';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
};

const createId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
};

const migrateIconMode = (header: Record<string, unknown>): IconMode => {
  if (header.iconMode === 'none' || header.iconMode === 'icon' || header.iconMode === 'icon-and-text') {
    return header.iconMode;
  }
  if (header.useIcons === false) return 'none';
  return 'icon-and-text';
};

const migrateGpa = (value: unknown): number | undefined => {
  let parsed: number | undefined;
  if (typeof value === 'number' && Number.isFinite(value)) parsed = value;
  else if (typeof value === 'string' && value.trim()) {
    const next = Number(value);
    if (Number.isFinite(next)) parsed = next;
  }
  if (parsed === undefined) return undefined;
  // ponytail: schema is 0–4 cumulative; clamp on migrate so imports don't throw
  return Math.min(4, Math.max(0, parsed));
};

const migrateHeader = (value: unknown): Header => {
  const header = isRecord(value) ? value : {};
  // Legacy grad/GPA are read for relocateEducationMetaFromHeader, then stripped from header output
  return {
    name: asString(header.name),
    email: asString(header.email),
    phone: asString(header.phone) || undefined,
    location: asString(header.location) || undefined,
    linkedIn: asString(header.linkedIn) || undefined,
    github: asString(header.github) || undefined,
    website: asString(header.website) || undefined,
    blog: asString(header.blog) || undefined,
    expectedGraduation: asString(header.expectedGraduation) || undefined,
    gpa: migrateGpa(header.gpa),
    workAuthorization: asString(header.workAuthorization) || undefined,
    iconMode: migrateIconMode(header),
  };
};

const migrateLinks = (value: unknown): StandardEntry['links'] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.url !== 'string' || !item.url.trim()) {
      return [];
    }
    const label =
      item.label === 'demo' ||
      item.label === 'paper' ||
      item.label === 'pr' ||
      item.label === 'other'
        ? item.label
        : 'repo';
    return [
      {
        label,
        url: item.url.trim(),
        verified: item.verified === true ? true : undefined,
      },
    ];
  });
};

const migrateStandardEntry = (
  value: unknown,
  sectionName: string,
  alreadyV2: boolean
): StandardEntry => {
  const entry = isRecord(value) ? value : {};
  const canonicalType = normalizeSectionName(sectionName);
  const oldTitle = asString(entry.title);
  const oldOrganization = asString(entry.organization);
  const existingDates = isRecord(entry.dates) ? entry.dates : undefined;
  const dates = existingDates
    ? {
        start: asString(existingDates.start) || undefined,
        end:
          existingDates.end === 'present'
            ? 'present'
            : asString(existingDates.end) || undefined,
        display: asString(existingDates.display) || undefined,
      }
    : parseDateRange(asString(entry.dateRange));

  const techStack = asStringArray(entry.techStack);
  const orgContextRecord = isRecord(entry.orgContext) ? entry.orgContext : undefined;
  const migrated: StandardEntry = {
    id: asString(entry.id, createId('entry')),
    title: oldTitle,
    role: asString(entry.role) || undefined,
    organization: oldOrganization || undefined,
    location: asString(entry.location) || undefined,
    dates,
    techStack,
    links: migrateLinks(entry.links),
    coursework: asStringArray(entry.coursework),
    expectedGraduation: asString(entry.expectedGraduation) || undefined,
    gpa: migrateGpa(entry.gpa),
    orgContext: orgContextRecord
      ? {
          descriptor: asString(orgContextRecord.descriptor) || undefined,
          teamSize:
            typeof orgContextRecord.teamSize === 'number'
              ? orgContextRecord.teamSize
              : undefined,
          engineerNumber:
            typeof orgContextRecord.engineerNumber === 'number'
              ? orgContextRecord.engineerNumber
              : undefined,
          scale: asString(orgContextRecord.scale) || undefined,
        }
      : undefined,
    bulletPoints: asStringArray(entry.bulletPoints)
      .map((bullet) => bullet.trim())
      .filter(Boolean),
  };

  if (
    !alreadyV2 &&
    (canonicalType === 'experience' || canonicalType === 'education') &&
    !asString(entry.role)
  ) {
    migrated.organization = oldTitle || undefined;
    migrated.role = oldOrganization || undefined;
    migrated.title = oldTitle;
  }

  if (canonicalType === 'projects' && techStack.length === 0 && oldOrganization) {
    migrated.techStack = oldOrganization.split(',').map((part) => part.trim()).filter(Boolean);
    migrated.organization = undefined;
  }

  return migrated;
};

const migrateSection = (
  value: unknown,
  index: number,
  alreadyV2: boolean
): Section => {
  const section = isRecord(value) ? value : {};
  const sectionName = asString(section.sectionName, 'Untitled Section');
  const base = {
    id: asString(section.id, createId('section')),
    sectionName,
    order: typeof section.order === 'number' ? section.order : index,
  };

  if (section.type === 'skills') {
    const categories = Array.isArray(section.categories) ? section.categories : [];
    return {
      ...base,
      type: 'skills',
      categories: categories.map((category) => {
        const record = isRecord(category) ? category : {};
        return {
          id: asString(record.id, createId('category')),
          categoryName: asString(record.categoryName),
          skills: asStringArray(record.skills),
        };
      }),
    };
  }

  const entries = Array.isArray(section.entries) ? section.entries : [];
  return {
    ...base,
    type: 'standard',
    entries: entries.map((entry) =>
      migrateStandardEntry(entry, sectionName, alreadyV2)
    ),
  };
};

/** Move legacy header graduation/GPA onto the first education entry when present. */
const relocateEducationMetaFromHeader = (resume: Resume): Resume => {
  const headerGrad = resume.header.expectedGraduation?.trim();
  const headerGpa = resume.header.gpa;

  let sections = resume.sections;
  if (headerGrad || headerGpa !== undefined) {
    let relocated = false;
    sections = resume.sections.map((section) => {
      if (section.type !== 'standard') return section;
      if (normalizeSectionName(section.sectionName) !== 'education') return section;
      if (section.entries.length === 0 || relocated) return section;

      return {
        ...section,
        entries: section.entries.map((entry, index) => {
          if (index !== 0) return entry;
          relocated = true;
          return {
            ...entry,
            expectedGraduation: entry.expectedGraduation?.trim() || headerGrad || undefined,
            gpa: entry.gpa ?? headerGpa,
          };
        }),
      };
    });
  }

  // Always drop deprecated header fields so JSON never re-emits them
  return {
    ...resume,
    header: {
      ...resume.header,
      expectedGraduation: undefined,
      gpa: undefined,
    },
    sections,
  };
};

export const migrateResume = (value: unknown): Resume => {
  if (!isRecord(value)) {
    throw new Error('JSON must describe a resume object.');
  }
  if (!Array.isArray(value.sections)) {
    throw new Error('JSON must include a sections array.');
  }

  const alreadyV2 = value.schemaVersion === CURRENT_SCHEMA_VERSION;
  const migrated: Resume = relocateEducationMetaFromHeader({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: asString(value.id, createId('resume')),
    header: migrateHeader(value.header),
    sections: value.sections.map((section, index) =>
      migrateSection(section, index, alreadyV2)
    ),
    lastModified: value.lastModified ? new Date(value.lastModified as string) : new Date(),
    coverLetter: asString(value.coverLetter) || undefined,
    jobTarget: isRecord(value.jobTarget)
      ? {
          company: asString(value.jobTarget.company),
          role: asString(value.jobTarget.role),
          jdText: asString(value.jobTarget.jdText),
        }
      : undefined,
  });

  return parseResume(migrated);
};
