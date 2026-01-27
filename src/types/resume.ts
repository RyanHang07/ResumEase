// TypeScript interfaces for the Visual Resume Builder

export interface Header {
  name: string;
  email: string;
  phone?: string;
  linkedIn?: string;
  github?: string;
  useIcons?: boolean;
}

export interface StandardEntry {
  id: string;
  title: string;
  organization?: string;
  dateRange?: string;
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

export interface Resume {
  id: string;
  header: Header;
  sections: Section[];
  lastModified: Date;
}

// Default values for creating new items
export const createDefaultHeader = (): Header => ({
  name: '',
  email: '',
  phone: '',
  linkedIn: '',
  github: '',
  useIcons: true,
});

export const createDefaultStandardEntry = (): StandardEntry => ({
  id: crypto.randomUUID(),
  title: '',
  organization: '',
  dateRange: '',
  bulletPoints: [''],
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
