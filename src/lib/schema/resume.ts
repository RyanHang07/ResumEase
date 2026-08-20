import { z } from 'zod';
import {
  CURRENT_SCHEMA_VERSION,
  type Resume,
} from '@/types/resume';

const dateSpanSchema = z
  .object({
    start: z.string().optional(),
    end: z.union([z.string(), z.literal('present')]).optional(),
    display: z.string().optional(),
  })
  .optional();

const entryLinkSchema = z.object({
  label: z.enum(['repo', 'demo', 'paper', 'pr', 'other']),
  url: z.string(),
  verified: z.boolean().optional(),
});

const orgContextSchema = z
  .object({
    descriptor: z.string().optional(),
    teamSize: z.number().optional(),
    engineerNumber: z.number().optional(),
    scale: z.string().optional(),
  })
  .optional();

const standardEntrySchema = z.object({
  id: z.string().min(1),
  role: z.string().optional(),
  organization: z.string().optional(),
  title: z.string(),
  location: z.string().optional(),
  dates: dateSpanSchema,
  dateRange: z.string().optional(),
  techStack: z.array(z.string()).optional(),
  links: z.array(entryLinkSchema).optional(),
  coursework: z.array(z.string()).optional(),
  expectedGraduation: z.string().optional(),
  gpa: z.number().min(0).max(4).optional(),
  orgContext: orgContextSchema,
  bulletPoints: z.array(z.string()),
});

const standardSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('standard'),
  sectionName: z.string(),
  entries: z.array(standardEntrySchema),
  order: z.number(),
});

const skillsSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal('skills'),
  sectionName: z.string(),
  categories: z.array(
    z.object({
      id: z.string().min(1),
      categoryName: z.string(),
      skills: z.array(z.string()),
    })
  ),
  order: z.number(),
});

const headerSchema = z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedIn: z.string().optional(),
  github: z.string().optional(),
  website: z.string().optional(),
  blog: z.string().optional(),
  expectedGraduation: z.string().optional(),
  gpa: z.number().min(0).max(4).optional(),
  workAuthorization: z.string().optional(),
  iconMode: z.enum(['none', 'icon', 'icon-and-text']).optional(),
  useIcons: z.boolean().optional(),
});

export const resumeSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  id: z.string().min(1),
  header: headerSchema,
  sections: z.array(z.union([standardSectionSchema, skillsSectionSchema])),
  lastModified: z.coerce.date(),
  coverLetter: z.string().optional(),
  jobTarget: z
    .object({
      company: z.string(),
      role: z.string(),
      jdText: z.string(),
    })
    .optional(),
});

export const parseResume = (value: unknown): Resume =>
  resumeSchema.parse(value) as Resume;
