import { RESUME_TEMPLATE_IDS, Resume } from '@/types/resume';
import { resumeFilename } from '@/lib/resumeFilename';
import {
  generateClassicLatex,
  generateCompactLatex,
  generateAcademicLatex,
} from './templates';

export const COMPILE_TEMPLATE_IDS = RESUME_TEMPLATE_IDS;

export type CompileTemplateId = (typeof COMPILE_TEMPLATE_IDS)[number];

export const isCompileTemplateId = (value: string): value is CompileTemplateId =>
  COMPILE_TEMPLATE_IDS.includes(value as CompileTemplateId);

/** Map removed/legacy ids (developer, two-column) onto a supported template. */
export const resolveCompileTemplateId = (value: string): CompileTemplateId =>
  isCompileTemplateId(value) ? value : 'classic';

export const generateLatex = (resume: Resume, templateId: string = 'classic'): string => {
  switch (resolveCompileTemplateId(templateId)) {
    case 'compact':
      return generateCompactLatex(resume);
    case 'academic':
      return generateAcademicLatex(resume);
    case 'classic':
    default:
      return generateClassicLatex(resume);
  }
};

export const downloadLatexSource = (resume: Resume, templateId: string = 'classic'): void => {
  const resolved = resolveCompileTemplateId(templateId);
  const latexCode = generateLatex(resume, resolved);
  const blob = new Blob([latexCode], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = resumeFilename(resume, 'tex');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
