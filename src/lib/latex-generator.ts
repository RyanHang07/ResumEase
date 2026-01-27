import { Resume } from '@/types/resume';
import {
  generateClassicLatex,
  generateCompactLatex,
  generateTwoColumnLatex,
  generateAcademicLatex,
  generateDeveloperLatex,
} from './templates';

// ============================================
// TEMPLATE ROUTER
// ============================================

export const generateLatex = (resume: Resume, templateId: string = 'classic'): string => {
  switch (templateId) {
    case 'compact':
      return generateCompactLatex(resume);
    case 'two-column':
      return generateTwoColumnLatex(resume);
    case 'academic':
      return generateAcademicLatex(resume);
    case 'developer':
      return generateDeveloperLatex(resume);
    case 'classic':
    default:
      return generateClassicLatex(resume);
  }
};

export const downloadLatexSource = (resume: Resume, templateId: string = 'classic'): void => {
  const latexCode = generateLatex(resume, templateId);
  const blob = new Blob([latexCode], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `resume-${templateId}-${new Date().toISOString().split('T')[0]}.tex`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
