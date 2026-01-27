import { Resume } from '@/types/resume';
import { escapeLatex, getCredits, getIconPackages, getContactParts } from './shared';

export const generateClassicLatex = (resume: Resume): string => {
  const useIcons = resume.header.useIcons ?? true;
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  const contactParts = getContactParts(resume.header, useIcons, 'simple');

  const sections = sortedSections.map((section) => {
    if (section.type === 'skills') {
      const cats = section.categories.filter(c => c.categoryName && c.skills.length > 0);
      if (cats.length === 0) return '';
      const lines = cats.map(c => `\\textbf{${escapeLatex(c.categoryName)}:} ${c.skills.map(escapeLatex).join(', ')}`).join(' \\\\\n');
      return `\\section*{${escapeLatex(section.sectionName)}}\n\\vspace{-0.5em}\\hrule\\vspace{6pt}\n${lines}`;
    } else {
      if (section.entries.length === 0) return '';
      const entries = section.entries.map(e => {
        const bullets = e.bulletPoints.filter(b => b.trim()).map(b => `    \\item ${escapeLatex(b)}`).join('\n');
        return `\\textbf{${escapeLatex(e.title)}} \\hfill ${escapeLatex(e.dateRange || '')} \\\\\n\\textit{${escapeLatex(e.organization || '')}} \\\\[-0.6em]\n\\begin{itemize}[leftmargin=1.5em, topsep=0pt, itemsep=-2pt]\n${bullets}\n\\end{itemize}`;
      }).join('\n\\vspace{6pt}\n');
      return `\\section*{${escapeLatex(section.sectionName)}}\n\\vspace{-0.5em}\\hrule\\vspace{6pt}\n${entries}`;
    }
  }).filter(s => s).join('\n\n');

  return `${getCredits('Classic')}

\\documentclass[11pt,letterpaper]{article}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage[margin=0.5in]{geometry}
\\usepackage[usenames,dvipsnames]{color}
${getIconPackages(useIcons)}

\\pagestyle{empty}
\\raggedbottom
\\raggedright

\\begin{document}

\\begin{center}
{\\Huge\\scshape ${escapeLatex(resume.header.name)}} \\\\ \\vspace{1pt}
${contactParts.join(' $\\cdot$ ')}
\\end{center}

${sections}

\\end{document}`;
};
