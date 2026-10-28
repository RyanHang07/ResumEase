import { create } from 'zustand';
import {
  Resume,
  Header,
  Section,
  RESUME_NAME_MAX_LENGTH,
  DEFAULT_TEMPLATE_ID,
  createDefaultStandardSection,
  createDefaultSkillsSection,
} from '@/types/resume';
import { createSampleResume } from '@/lib/sampleData';
import { migrateResume } from '@/lib/migrations';
import { applySafeParseFixes } from '@/lib/parseFixes';
import { resolveCompileTemplateId } from '@/lib/latex-generator';

interface ResumeStore {
  resume: Resume;
  currentTemplate: string;
  updateHeader: (header: Header) => void;
  addSection: (type: 'standard' | 'skills') => void;
  updateSection: (sectionId: string, data: Partial<Section>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (sections: Section[]) => void;
  updateJobTarget: (jobTarget: Resume['jobTarget']) => void;
  updateName: (name: string) => void;
  applyParserFixes: () => void;
  applyLinkVerification: (results: Array<{ url: string; ok: boolean }>) => void;
  /** Template comes from resume.templateId, then fallbackTemplateId, then DEFAULT_TEMPLATE_ID. */
  importResume: (resume: Resume, fallbackTemplateId?: string) => void;
  resetResume: () => void;
  setTemplate: (templateId: string) => void;
  loadSampleData: (sampleResume: Resume) => void;
}

// No localStorage persistence - privacy first
export const useResumeStore = create<ResumeStore>()((set) => ({
  resume: { ...createSampleResume(), templateId: DEFAULT_TEMPLATE_ID },
  currentTemplate: DEFAULT_TEMPLATE_ID,

  updateHeader: (header) =>
    set((state) => ({
      resume: {
        ...state.resume,
        header,
        lastModified: new Date(),
      },
    })),

  addSection: (type) =>
    set((state) => {
      const order = state.resume.sections.length;
      const newSection: Section =
        type === 'standard'
          ? createDefaultStandardSection(order)
          : createDefaultSkillsSection(order);

      return {
        resume: {
          ...state.resume,
          sections: [...state.resume.sections, newSection],
          lastModified: new Date(),
        },
      };
    }),

  updateSection: (sectionId, data) =>
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections.map((section) =>
          section.id === sectionId ? { ...section, ...data } : section
        ) as Section[],
        lastModified: new Date(),
      },
    })),

  removeSection: (sectionId) =>
    set((state) => ({
      resume: {
        ...state.resume,
        sections: state.resume.sections
          .filter((s) => s.id !== sectionId)
          .map((s, idx) => ({ ...s, order: idx })) as Section[],
        lastModified: new Date(),
      },
    })),

  reorderSections: (sections) =>
    set((state) => ({
      resume: {
        ...state.resume,
        sections,
        lastModified: new Date(),
      },
    })),

  updateJobTarget: (jobTarget) =>
    set((state) => ({
      resume: {
        ...state.resume,
        jobTarget,
        lastModified: new Date(),
      },
    })),

  updateName: (name) =>
    set((state) => ({
      resume: {
        ...state.resume,
        name: name.slice(0, RESUME_NAME_MAX_LENGTH) || undefined,
        lastModified: new Date(),
      },
    })),

  applyParserFixes: () =>
    set((state) => ({
      resume: applySafeParseFixes(state.resume),
    })),

  applyLinkVerification: (results) =>
    set((state) => {
      const byUrl = new Map(
        results.map((result) => [result.url.trim().toLowerCase(), result.ok] as const)
      );
      return {
        resume: {
          ...state.resume,
          sections: state.resume.sections.map((section) => {
            if (section.type !== 'standard') return section;
            return {
              ...section,
              entries: section.entries.map((entry) => ({
                ...entry,
                links: entry.links?.map((link) => {
                  const verified = byUrl.get(link.url.trim().toLowerCase());
                  if (verified === undefined) return link;
                  return { ...link, verified };
                }),
              })),
            };
          }),
          lastModified: new Date(),
        },
      };
    }),

  importResume: (resume, fallbackTemplateId) =>
    set(() => {
      const migrated = applySafeParseFixes(migrateResume(resume));
      const templateId =
        migrated.templateId ??
        (fallbackTemplateId ? resolveCompileTemplateId(fallbackTemplateId) : DEFAULT_TEMPLATE_ID);
      return { resume: { ...migrated, templateId }, currentTemplate: templateId };
    }),

  resetResume: () =>
    set((state) => ({
      resume: { ...createSampleResume(), templateId: resolveCompileTemplateId(state.currentTemplate) },
    })),

  setTemplate: (templateId) =>
    set((state) => {
      const resolved = resolveCompileTemplateId(templateId);
      return { currentTemplate: resolved, resume: { ...state.resume, templateId: resolved } };
    }),

  loadSampleData: (sampleResume) =>
    set({
      resume: sampleResume,
    }),
}));
