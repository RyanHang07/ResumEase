export const CURRENT_SCHEMA_VERSION = 2 as const;
export type SchemaVersion = typeof CURRENT_SCHEMA_VERSION;
export type IconMode = 'none' | 'icon' | 'icon-and-text';
export type EntryLinkLabel = 'repo' | 'demo' | 'paper' | 'pr' | 'other';

export interface Header {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedIn?: string;
  github?: string;
  website?: string;
  blog?: string;
  /** @deprecated Prefer education entry `expectedGraduation`. Kept for migrate. */
  expectedGraduation?: string;
  /** @deprecated Prefer education entry `gpa`. Kept for migrate. */
  gpa?: number;
  workAuthorization?: string;
  iconMode?: IconMode;
  /** @deprecated Use iconMode. Migrated from v1. */
  useIcons?: boolean;
}

export interface DateSpan {
  start?: string;
  end?: string | 'present';
  display?: string;
}

export interface EntryLink {
  label: EntryLinkLabel;
  url: string;
  verified?: boolean;
}

export interface OrgContext {
  descriptor?: string;
  teamSize?: number;
  engineerNumber?: number;
  scale?: string;
}

export interface StandardEntry {
  id: string;
  role?: string;
  /** School or employer. Renderer primary for education/experience. Empty on projects. */
  organization?: string;
  /** Project name. Renderer primary for projects. Empty on education/experience. */
  title: string;
  location?: string;
  dates?: DateSpan;
  /** @deprecated Use dates. Migrated from v1. */
  dateRange?: string;
  techStack?: string[];
  links?: EntryLink[];
  coursework?: string[];
  /** Expected graduation for education entries (YYYY-MM). */
  expectedGraduation?: string;
  /** Cumulative GPA for education entries (0–4). */
  gpa?: number;
  /** @deprecated Prefer putting company context in bullets. Kept for migrate. */
  orgContext?: OrgContext;
  bulletPoints: string[];
}

export interface StandardSection {
  id: string;
  type: 'standard';
  sectionName: string;
  entries: StandardEntry[];
  order: number;
}

export interface SkillCategory {
  id: string;
  categoryName: string;
  skills: string[];
}

export interface SkillsSection {
  id: string;
  type: 'skills';
  sectionName: string;
  categories: SkillCategory[];
  order: number;
}

export type Section = StandardSection | SkillsSection;

export interface JobTarget {
  company: string;
  role: string;
  jdText: string;
}

export interface Resume {
  schemaVersion: SchemaVersion;
  id: string;
  header: Header;
  sections: Section[];
  lastModified: Date;
  jobTarget?: JobTarget;
}

export const createDefaultHeader = (): Header => ({
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedIn: '',
  github: '',
  website: '',
  blog: '',
  workAuthorization: '',
  iconMode: 'icon-and-text',
});

export const createDefaultStandardEntry = (): StandardEntry => ({
  id: crypto.randomUUID(),
  title: '',
  role: '',
  organization: '',
  location: '',
  dates: {},
  techStack: [],
  links: [],
  coursework: [],
  bulletPoints: [],
});

export const createDefaultStandardSection = (order: number): StandardSection => ({
  id: crypto.randomUUID(),
  type: 'standard',
  sectionName: 'New Section',
  entries: [],
  order,
});

export const createDefaultSkillCategory = (): SkillCategory => ({
  id: crypto.randomUUID(),
  categoryName: '',
  skills: [],
});

export const createDefaultSkillsSection = (order: number): SkillsSection => ({
  id: crypto.randomUUID(),
  type: 'skills',
  sectionName: 'Skills',
  categories: [],
  order,
});

export const createDefaultResume = (): Resume => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: crypto.randomUUID(),
  header: createDefaultHeader(),
  sections: [],
  lastModified: new Date(),
});

export interface SavedResume {
  id: string;
  name: string;
  templateId: string;
  data: Resume;
  savedAt: string;
}
