import { create } from 'zustand';
import {
  Resume,
  Header,
  Section,
  createDefaultStandardSection,
  createDefaultSkillsSection,
} from '@/types/resume';
import { createSampleResume } from '@/lib/sampleData';

interface ResumeStore {
  resume: Resume;
  currentTemplate: string;
  updateHeader: (header: Header) => void;
  addSection: (type: 'standard' | 'skills') => void;
  updateSection: (sectionId: string, data: Partial<Section>) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (sections: Section[]) => void;
  importResume: (resume: Resume) => void;
  resetResume: () => void;
  setTemplate: (templateId: string) => void;
  loadSampleData: (sampleResume: Resume) => void;
}

// No localStorage persistence - privacy first
export const useResumeStore = create<ResumeStore>()((set) => ({
  resume: createSampleResume(),
  currentTemplate: 'classic',

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

  importResume: (resume) =>
    set({
      resume: {
        ...resume,
        lastModified: new Date(),
      },
    }),

  resetResume: () =>
    set({
      resume: createSampleResume(),
    }),

  setTemplate: (templateId) =>
    set({
      currentTemplate: templateId,
    }),

  loadSampleData: (sampleResume) =>
    set({
      resume: sampleResume,
    }),
}));
