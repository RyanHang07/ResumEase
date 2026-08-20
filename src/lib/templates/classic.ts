import { Resume } from '@/types/resume';
import {
  escapeLatex,
  escapeLatexInline,
  formatHeaderContactLatex,
  getAtsLatexPreamble,
  getCredits,
  getIconPackages,
} from './shared';
import { getLatexEntryParts } from './entryLatex';
import { headerUsesIcons } from '@/lib/resumeDisplay';

export const generateClassicLatex = (resume: Resume): string => {
  const useIcons = headerUsesIcons(resume.header);
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  const contactBlock = formatHeaderContactLatex(resume.header, useIcons, 'simple');

  const sections = sortedSections.map((section) => {
    if (section.type === 'skills') {
      const cats = section.categories.filter(c => c.categoryName && c.skills.length > 0);
      if (cats.length === 0) return '';
      const lines = cats.map(c => `\\textbf{${escapeLatex(c.categoryName)}:} ${c.skills.map(escapeLatex).join(', ')}`).join(' \\\\\n');
      return `\\section*{${escapeLatex(section.sectionName)}}\n\\vspace{-0.5em}\\hrule\\vspace{6pt}\n${lines}`;
    }

    if (section.entries.length === 0) return '';
    const entries = section.entries.map((entry) => {
      const parts = getLatexEntryParts(entry, section.sectionName);
      const bullets = parts.bullets
        .map((b) => `    \\item {${escapeLatexInline(b)}}`)
        .join('\n');
      const hasEducationExtras = Boolean(
        parts.educationMetaLatex || parts.courseworkLatex
      );
      // Match experience: degree/role then body. Extras use bullet-sized \\small, Coursework bold.
      // Trailing \\\\ only when another education line or bullets follow.
      const educationExtraLines = [
        parts.educationMetaLatex ? `{\\small ${parts.educationMetaLatex}}` : '',
        parts.courseworkLatex
          ? `{\\small\\textbf{Coursework:} ${parts.courseworkLatex}}`
          : '',
      ].filter(Boolean);
      const educationExtras = educationExtraLines
        .map((line, index) => {
          const isLast = index === educationExtraLines.length - 1;
          const needsBreak = !isLast || Boolean(bullets);
          return needsBreak ? `${line} \\\\` : line;
        })
        .join('\n');
      const educationExtrasBlock = educationExtras ? `${educationExtras}\n` : '';
      const bulletBlock = bullets
        ? `\\begin{itemize}[leftmargin=1.5em, topsep=${hasEducationExtras ? '1pt' : '0pt'}, itemsep=-2pt]\n${bullets}\n\\end{itemize}`
        : '';
      // Tight skip only when jumping straight into bullets (experience rhythm)
      const secondaryBreak =
        hasEducationExtras || !bullets ? '\\\\\n' : '\\\\[-0.6em]\n';
      const secondary = parts.secondaryLatex
        ? `\\textit{${parts.secondaryLatex}} ${secondaryBreak}`
        : '';
      return `${parts.primaryLatex} \\hfill ${parts.datesLatex} \\\\\n${secondary}${educationExtrasBlock}${bulletBlock}`;
    }).join('\n\\vspace{6pt}\n');
    return `\\section*{${escapeLatex(section.sectionName)}}\n\\vspace{-0.5em}\\hrule\\vspace{6pt}\n${entries}`;
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
${getAtsLatexPreamble()}

\\pagestyle{empty}
\\raggedbottom
\\raggedright

\\begin{document}

\\begin{center}
{\\Huge\\scshape ${escapeLatex(resume.header.name)}} \\\\ \\vspace{1pt}
${contactBlock}
\\end{center}

${sections}

\\end{document}`;
};
