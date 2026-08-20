import { Resume } from '@/types/resume';
import {
  escapeLatex,
  escapeLatexInline,
  formatHeaderContactLatex,
  getAtsLatexPreamble,
  getCredits,
} from './shared';
import { getLatexEntryParts } from './entryLatex';

export const generateAcademicLatex = (resume: Resume): string => {
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  const contactBlock = formatHeaderContactLatex(resume.header, false, 'simple', ' $\\bullet$ ');

  const sections = sortedSections.map((section) => {
    if (section.type === 'skills') {
      const cats = section.categories.filter(c => c.categoryName && c.skills.length > 0);
      if (cats.length === 0) return '';
      const lines = cats.map(c => `\\textbf{${escapeLatex(c.categoryName)}:} ${c.skills.map(escapeLatex).join(', ')}`).join(' \\\\\n');
      return `\\section{${escapeLatex(section.sectionName)}}\n${lines}`;
    }

    if (section.entries.length === 0) return '';
    const entries = section.entries.map((entry) => {
      const parts = getLatexEntryParts(entry, section.sectionName);
      const bullets = parts.bullets
        .map((b) => `\\item {${escapeLatexInline(b)}}`)
        .join('\n');
      const hasEducationExtras = Boolean(
        parts.educationMetaLatex || parts.courseworkLatex
      );
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
      // Experience uses topsep=2pt after degree; extras take that slot, then bullets topsep=0
      const bulletList = bullets
        ? `\\begin{itemize}[leftmargin=1.5em, topsep=${hasEducationExtras ? '0pt' : '2pt'}, itemsep=0pt, parsep=0pt]\n${bullets}\n\\end{itemize}`
        : '';
      const secondary = parts.secondaryLatex ? `\\textit{${parts.secondaryLatex}} \\\\\n` : '';
      return `${parts.primaryLatex} \\hfill ${parts.datesLatex} \\\\\n${secondary}${educationExtrasBlock}${bulletList}`;
    }).join('\n\\vspace{4pt}\n');
    return `\\section{${escapeLatex(section.sectionName)}}\n${entries}`;
  }).filter(s => s).join('\n\n');

  return `${getCredits('Academic CV')}

\\documentclass[11pt,letterpaper]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{times}
${getAtsLatexPreamble()}

\\pagestyle{plain}
\\setlength{\\parindent}{0pt}

\\titleformat{\\section}{\\normalsize\\bfseries\\scshape}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\begin{document}

\\begin{center}
{\\LARGE\\bfseries\\scshape ${escapeLatex(resume.header.name)}} \\\\[6pt]
{\\small ${contactBlock}}
\\end{center}

\\vspace{4pt}

${sections}

\\end{document}`;
};
