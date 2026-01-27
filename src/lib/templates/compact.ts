import { Resume } from '@/types/resume';
import { escapeLatex, getCredits, getContactParts } from './shared';

export const generateCompactLatex = (resume: Resume): string => {
  const useIcons = resume.header.useIcons ?? true;
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  const contactParts = getContactParts(resume.header, useIcons, 'underline');

  const sections = sortedSections.map((section) => {
    if (section.type === 'skills') {
      const cats = section.categories.filter(c => c.categoryName && c.skills.length > 0);
      if (cats.length === 0) return '';
      const lines = cats.map(c => `        \\textbf{${escapeLatex(c.categoryName)}}{: ${c.skills.map(escapeLatex).join(', ')}} \\\\`).join('\n');
      return `\\section{${escapeLatex(section.sectionName)}}\n    \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n${lines}\n    }}\n    \\end{itemize}`;
    } else {
      if (section.entries.length === 0) return '';
      const isProject = section.sectionName.toLowerCase().includes('project');
      const entries = section.entries.map(e => {
        const bullets = e.bulletPoints.filter(b => b.trim()).map(b => `        \\resumeItem{${escapeLatex(b)}}`).join('\n');
        if (isProject) {
          const tech = e.organization ? ` $|$ \\emph{${escapeLatex(e.organization)}}` : '';
          return `    \\resumeProjectHeading\n    {\\textbf{${escapeLatex(e.title)}}${tech}}{${escapeLatex(e.dateRange || '')}}\n    \\resumeItemListStart\n${bullets}\n    \\resumeItemListEnd`;
        }
        return `    \\resumeSubheading\n    {${escapeLatex(e.title)}}{${escapeLatex(e.dateRange || '')}}\n    {${escapeLatex(e.organization || '')}}{}\n    \\resumeItemListStart\n${bullets}\n    \\resumeItemListEnd`;
      }).join('\n\n');
      return `\\section{${escapeLatex(section.sectionName)}}\n\\resumeSubHeadingListStart\n${entries}\n\\resumeSubHeadingListEnd`;
    }
  }).filter(s => s).join('\n\n');

  return `${getCredits('Compact')}

\\documentclass[letterpaper,11pt]{article}
${useIcons ? '\\usepackage{fontawesome5}' : ''}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage{tabularx}
\\usepackage[default]{lato}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{\\vspace{-4pt}\\scshape\\raggedright\\large}{}{0em}{}[\\color{black}\\titlerule\\vspace{-5pt}]
\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{\\vspace{-2pt}\\item\\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}\\textbf{#1} & #2 \\\\\\textit{\\small#3} & \\textit{\\small #4} \\\\\\end{tabular*}\\vspace{-7pt}}
\\newcommand{\\resumeProjectHeading}[2]{\\item\\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}\\small#1 & #2 \\\\\\end{tabular*}\\vspace{-7pt}}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
${useIcons ? '\\definecolor{IconColor}{RGB}{0, 0, 0}\n\\newcommand{\\seticon}[1]{\\textcolor{IconColor}{\\csname #1\\endcsname}}' : ''}

\\begin{document}

\\begin{center}
\\textbf{\\Huge \\scshape ${escapeLatex(resume.header.name)}} \\\\ \\vspace{1pt}
${contactParts.join(' \\quad\n')}
\\end{center}

${sections}

\\end{document}`;
};
