import { Resume } from '@/types/resume';
import { escapeLatex, getCredits, extractUsername } from './shared';

export const generateAcademicLatex = (resume: Resume): string => {
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);

  const contactLines: string[] = [];
  if (resume.header.email) contactLines.push(`\\href{mailto:${resume.header.email}}{${escapeLatex(resume.header.email)}}`);
  if (resume.header.phone) contactLines.push(escapeLatex(resume.header.phone));
  if (resume.header.linkedIn) contactLines.push(`\\href{${resume.header.linkedIn}}{${escapeLatex(extractUsername(resume.header.linkedIn, 'linkedin'))}}`);
  if (resume.header.github) contactLines.push(`\\href{${resume.header.github}}{${escapeLatex(extractUsername(resume.header.github, 'github'))}}`);

  const sections = sortedSections.map((section) => {
    if (section.type === 'skills') {
      const cats = section.categories.filter(c => c.categoryName && c.skills.length > 0);
      if (cats.length === 0) return '';
      const lines = cats.map(c => `\\textbf{${escapeLatex(c.categoryName)}:} ${c.skills.map(escapeLatex).join(', ')}`).join(' \\\\\n');
      return `\\section{${escapeLatex(section.sectionName)}}\n${lines}`;
    } else {
      if (section.entries.length === 0) return '';
      const entries = section.entries.map(e => {
        const bullets = e.bulletPoints.filter(b => b.trim()).map(b => `\\item ${escapeLatex(b)}`).join('\n');
        const bulletList = bullets ? `\\begin{itemize}[leftmargin=1.5em, topsep=2pt, itemsep=0pt, parsep=0pt]\n${bullets}\n\\end{itemize}` : '';
        return `\\textbf{${escapeLatex(e.title)}} \\hfill ${escapeLatex(e.dateRange || '')} \\\\\n\\textit{${escapeLatex(e.organization || '')}}\n${bulletList}`;
      }).join('\n\\vspace{4pt}\n');
      return `\\section{${escapeLatex(section.sectionName)}}\n${entries}`;
    }
  }).filter(s => s).join('\n\n');

  return `${getCredits('Academic CV')}

\\documentclass[11pt,letterpaper]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{times}

\\pagestyle{plain}
\\setlength{\\parindent}{0pt}

\\titleformat{\\section}{\\normalsize\\bfseries\\scshape}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\begin{document}

\\begin{center}
{\\LARGE\\bfseries\\scshape ${escapeLatex(resume.header.name)}} \\\\[6pt]
{\\small ${contactLines.join(' $\\bullet$ ')}}
\\end{center}

\\vspace{4pt}

${sections}

\\end{document}`;
};
