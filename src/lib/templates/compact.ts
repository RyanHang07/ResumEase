import { Resume } from '@/types/resume';
import { headerUsesIcons } from '@/lib/resumeDisplay';
import {
  escapeLatex,
  escapeLatexInline,
  formatHeaderContactLatex,
  getAtsLatexPreamble,
  getCredits,
  normalizeSectionName,
} from './shared';
import { getLatexEntryParts } from './entryLatex';

export const generateCompactLatex = (resume: Resume): string => {
  const useIcons = headerUsesIcons(resume.header);
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  const contactBlock = formatHeaderContactLatex(resume.header, useIcons, 'underline', ' $|$ ');

  const sections = sortedSections.map((section) => {
    if (section.type === 'skills') {
      const cats = section.categories.filter(c => c.categoryName && c.skills.length > 0);
      if (cats.length === 0) return '';
      const lines = cats.map(c => `        \\textbf{${escapeLatex(c.categoryName)}}{: ${c.skills.map(escapeLatex).join(', ')}} \\\\`).join('\n');
      return `\\section{${escapeLatex(section.sectionName)}}\n    \\begin{itemize}[leftmargin=0.15in, label={}]\n    \\small{\\item{\n${lines}\n    }}\n    \\end{itemize}`;
    } else {
      if (section.entries.length === 0) return '';
      const isProject = normalizeSectionName(section.sectionName) === 'projects';
      const entries = section.entries.map((entry) => {
        const parts = getLatexEntryParts(entry, section.sectionName);
        const bullets = parts.bullets
          .map((b) => `        \\resumeItem{${escapeLatexInline(b)}}`)
          .join('\n');
        const bulletBlock = bullets
          ? `    \\resumeItemListStart\n${bullets}\n    \\resumeItemListEnd`
          : '';
        if (isProject) {
          const tech = parts.secondaryLatex ? ` $|$ \\emph{${parts.secondaryLatex}}` : '';
          return `    \\resumeProjectHeading\n    {${parts.primaryLatex}${tech}}{${parts.datesLatex}}\n${bulletBlock}`;
        }

        // Education body: same vertical rhythm as experience bullets (itemize after -7pt),
        // flush left, Coursework label semibold — not italic degree styling.
        const educationExtraItems = [
          parts.educationMetaLatex
            ? `        \\item\\small{${parts.educationMetaLatex}}`
            : '',
          parts.courseworkLatex
            ? `        \\item\\small{\\textbf{Coursework:} ${parts.courseworkLatex}}`
            : '',
        ].filter(Boolean);
        const educationExtrasBlock =
          educationExtraItems.length > 0
            ? `    \\begin{itemize}[leftmargin=0pt, label={}, topsep=2pt, itemsep=1pt, parsep=0pt, partopsep=0pt]\n${educationExtraItems.join('\n')}\n    \\end{itemize}\n`
            : '';
        // When extras precede bullets, kill the second list's top gap so it feels like one block
        const educationBulletBlock = bullets
          ? educationExtraItems.length > 0
            ? `    \\begin{itemize}[topsep=0pt, itemsep=0pt, parsep=0pt, partopsep=0pt]\n${bullets}\n    \\end{itemize}\\vspace{-5pt}\n`
            : bulletBlock
          : '';

        return `    \\resumeSubheading\n    {${parts.linkedPrimary}}{${parts.datesLatex}}\n    {${parts.secondaryLatex}}{}\n${educationExtrasBlock}${educationBulletBlock || bulletBlock}`;
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
${getAtsLatexPreamble()}

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
${contactBlock}
\\end{center}

${sections}

\\end{document}`;
};
