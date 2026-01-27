import { Header } from '@/types/resume';

// ================================
// CREDIT INFO - Edit your details here
// ================================
export const AUTHOR_CREDIT = {
  name: 'Ryan Hang',
  github: 'https://github.com/ryanhang07',
  projectName: 'ResumEase',
};
// ================================

export const escapeLatex = (text: string): string => {
  if (!text) return '';

  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
};

export const extractUsername = (url: string, platform: string): string => {
  if (!url) return '';
  const patterns: Record<string, RegExp> = {
    linkedin: /linkedin\.com\/in\/([^\/\?]+)/i,
    github: /github\.com\/([^\/\?]+)/i,
  };
  const match = url.match(patterns[platform]);
  if (match) {
    return `${platform}.com/${match[1]}`;
  }
  return url.replace(/^https?:\/\/(www\.)?/, '');
};

export const getCredits = (templateName: string): string => `
%-------------------------
% Resume in LaTeX
% Template: ${templateName}
% Created with ${AUTHOR_CREDIT.projectName} by ${AUTHOR_CREDIT.name}
% ${AUTHOR_CREDIT.github}
%------------------------
`.trim();

export const getIconPackages = (useIcons: boolean): string => {
  if (!useIcons) return '';
  return `\\usepackage{fontawesome5}
\\definecolor{IconColor}{RGB}{0, 0, 0}
\\newcommand{\\seticon}[1]{\\textcolor{IconColor}{\\csname #1\\endcsname}}`;
};

export const getContactParts = (header: Header, useIcons: boolean, style: 'simple' | 'underline' | 'icon-only' = 'simple'): string[] => {
  const parts: string[] = [];
  
  if (header.phone) {
    const icon = useIcons ? '\\seticon{faPhone} ' : '';
    parts.push(`${icon}${escapeLatex(header.phone)}`);
  }
  if (header.email) {
    const icon = useIcons ? '\\seticon{faEnvelope} ' : '';
    const email = escapeLatex(header.email);
    if (style === 'underline') {
      parts.push(`\\href{mailto:${header.email}}{${icon}\\underline{${email}}}`);
    } else {
      parts.push(`\\href{mailto:${header.email}}{${icon}${email}}`);
    }
  }
  if (header.linkedIn) {
    const icon = useIcons ? '\\seticon{faLinkedin} ' : '';
    const display = escapeLatex(extractUsername(header.linkedIn, 'linkedin'));
    if (style === 'underline') {
      parts.push(`\\href{${header.linkedIn}}{${icon}\\underline{${display}}}`);
    } else {
      parts.push(`\\href{${header.linkedIn}}{${icon}${display}}`);
    }
  }
  if (header.github) {
    const icon = useIcons ? '\\seticon{faGithub} ' : '';
    const display = escapeLatex(extractUsername(header.github, 'github'));
    if (style === 'underline') {
      parts.push(`\\href{${header.github}}{${icon}\\underline{${display}}}`);
    } else {
      parts.push(`\\href{${header.github}}{${icon}${display}}`);
    }
  }
  
  return parts;
};
