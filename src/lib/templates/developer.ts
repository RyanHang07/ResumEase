import { Resume } from '@/types/resume';
import { escapeLatex, getCredits, extractUsername } from './shared';

export const generateDeveloperLatex = (resume: Resume): string => {
  const useIcons = resume.header.useIcons ?? true;
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);

  const contactParts: string[] = [];
  if (resume.header.email) {
    const icon = useIcons ? '\\faEnvelope\\ ' : '';
    contactParts.push(`${icon}\\href{mailto:${resume.header.email}}{${escapeLatex(resume.header.email)}}`);
  }
  if (resume.header.github) {
    const icon = useIcons ? '\\faGithub\\ ' : '';
    contactParts.push(`${icon}\\href{${resume.header.github}}{${escapeLatex(extractUsername(resume.header.github, 'github'))}}`);
  }
  if (resume.header.linkedIn) {
    const icon = useIcons ? '\\faLinkedin\\ ' : '';
    contactParts.push(`${icon}\\href{${resume.header.linkedIn}}{${escapeLatex(extractUsername(resume.header.linkedIn, 'linkedin'))}}`);
  }
  if (resume.header.phone) {
    const icon = useIcons ? '\\faPhone\\ ' : '';
    contactParts.push(`${icon}${escapeLatex(resume.header.phone)}`);
  }

  const sections = sortedSections.map((section) => {
    if (section.type === 'skills') {
      const cats = section.categories.filter(c => c.categoryName && c.skills.length > 0);
      if (cats.length === 0) return '';
      const lines = cats.map(c => {
        const skills = c.skills.map(s => `\\fbox{\\small ${escapeLatex(s)}}`).join(' ');
        return `\\texttt{${escapeLatex(c.categoryName)}} \\\\\n${skills}`;
      }).join(' \\\\[8pt]\n');
      return `\\section*{${escapeLatex(section.sectionName)}}\n${lines}`;
    } else {
      if (section.entries.length === 0) return '';
      const isProject = section.sectionName.toLowerCase().includes('project');
      const entries = section.entries.map(e => {
        const bullets = e.bulletPoints.filter(b => b.trim()).map(b => `\\item \\small ${escapeLatex(b)}`).join('\n');
        if (isProject) {
          const tech = e.organization ? `\\\\\\texttt{\\small ${escapeLatex(e.organization)}}` : '';
          return `\\textbf{${escapeLatex(e.title)}}${tech} \\hfill ${escapeLatex(e.dateRange || '')}\n\\begin{itemize}[leftmargin=1em, topsep=2pt, itemsep=0pt]\n${bullets}\n\\end{itemize}`;
        }
        return `\\textbf{${escapeLatex(e.title)}} \\hfill ${escapeLatex(e.dateRange || '')} \\\\\n\\textit{${escapeLatex(e.organization || '')}}\n\\begin{itemize}[leftmargin=1em, topsep=2pt, itemsep=0pt]\n${bullets}\n\\end{itemize}`;
      }).join('\n\\vspace{6pt}\n');
      return `\\section*{${escapeLatex(section.sectionName)}}\n${entries}`;
    }
  }).filter(s => s).join('\n\n');

  return `${getCredits('Developer')}

\\documentclass[10pt,letterpaper]{article}
\\usepackage[margin=0.5in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
\\usepackage{titlesec}
\\usepackage{fancybox}
\\usepackage[scaled=0.85]{beramono}
\\usepackage[T1]{fontenc}
${useIcons ? '\\usepackage{fontawesome5}' : ''}

\\definecolor{headercolor}{RGB}{36,41,46}
\\definecolor{accentcolor}{RGB}{0,122,204}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\fboxsep}{3pt}

\\titleformat{\\section}{\\large\\bfseries\\color{headercolor}}{}{0em}{}[\\color{accentcolor}\\titlerule]
\\titlespacing*{\\section}{0pt}{12pt}{6pt}

\\begin{document}

\\begin{center}
{\\LARGE\\bfseries\\texttt{${escapeLatex(resume.header.name)}}} \\\\[8pt]
\\textcolor{gray}{${contactParts.join(' \\quad ')}}
\\end{center}

\\vspace{8pt}

${sections}

\\end{document}`;
};
