import { Resume, StandardSection } from '@/types/resume';
import { escapeLatex, getCredits, extractUsername } from './shared';

export const generateTwoColumnLatex = (resume: Resume): string => {
  const useIcons = resume.header.useIcons ?? true;
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  
  // Sidebar content: skills, education
  const sidebarSections = sortedSections.filter(s => 
    s.type === 'skills' || s.sectionName.toLowerCase().includes('education')
  );
  // Main content: experience, projects
  const mainSections = sortedSections.filter(s => 
    s.type !== 'skills' && !s.sectionName.toLowerCase().includes('education')
  );

  const contactItems: string[] = [];
  if (resume.header.email) {
    const icon = useIcons ? '\\faEnvelope\\ ' : '';
    contactItems.push(`${icon}\\href{mailto:${resume.header.email}}{${escapeLatex(resume.header.email)}}`);
  }
  if (resume.header.phone) {
    const icon = useIcons ? '\\faPhone\\ ' : '';
    contactItems.push(`${icon}${escapeLatex(resume.header.phone)}`);
  }
  if (resume.header.linkedIn) {
    const icon = useIcons ? '\\faLinkedin\\ ' : '';
    contactItems.push(`${icon}\\href{${resume.header.linkedIn}}{${escapeLatex(extractUsername(resume.header.linkedIn, 'linkedin'))}}`);
  }
  if (resume.header.github) {
    const icon = useIcons ? '\\faGithub\\ ' : '';
    contactItems.push(`${icon}\\href{${resume.header.github}}{${escapeLatex(extractUsername(resume.header.github, 'github'))}}`);
  }

  // Consistent section header format for sidebar
  const sidebarSectionHeader = (name: string): string => 
    `{\\large\\textbf{${escapeLatex(name)}}}\\\\[-2pt]\\rule{\\linewidth}{0.4pt}\\\\[3pt]`;

  const sidebarContent = sidebarSections.map((section, sectionIndex) => {
    const isFirstSection = sectionIndex === 0;
    const topPadding = isFirstSection ? '' : '\\vspace{10pt}\n\n';
    
    if (section.type === 'skills') {
      const cats = section.categories.filter(c => c.categoryName && c.skills.length > 0);
      if (cats.length === 0) return '';
      const lines = cats.map((c, i, arr) => {
        const spacing = i < arr.length - 1 ? '\\\\[4pt]' : '';
        return `{\\small\\textbf{${escapeLatex(c.categoryName)}}} \\\\\n{\\small ${c.skills.map(escapeLatex).join(', ')}}${spacing}`;
      }).join('\n');
      return `${topPadding}${sidebarSectionHeader(section.sectionName)}\n${lines}`;
    } else {
      const entries = section.entries.map((e, i, arr) => {
        const spacing = i < arr.length - 1 ? '\\\\[4pt]' : '';
        const bullets = e.bulletPoints.filter(b => b.trim());
        const bulletContent = bullets.length > 0 
          ? `\n{\\small\\begin{itemize}[leftmargin=1em, topsep=1pt, itemsep=0pt, parsep=0pt]\n${bullets.map(b => `\\item ${escapeLatex(b)}`).join('\n')}\n\\end{itemize}}` 
          : '';
        const dateContent = e.dateRange ? `\n{\\small ${escapeLatex(e.dateRange)}}` : '';
        return `{\\small\\textbf{${escapeLatex(e.title)}}} \\\\\n{\\small\\textit{${escapeLatex(e.organization || '')}}}${bulletContent}${dateContent}${spacing}`;
      }).join('\n');
      return `${topPadding}${sidebarSectionHeader(section.sectionName)}\n${entries}`;
    }
  }).filter(s => s).join('\n');

  const mainContent = mainSections.map(section => {
    if (section.type !== 'standard') return '';
    const stdSection = section as StandardSection;
    if (stdSection.entries.length === 0) return '';
    const entries = stdSection.entries.map(e => {
      const bullets = e.bulletPoints.filter(b => b.trim()).map(b => `\\item ${escapeLatex(b)}`).join('\n');
      return `\\textbf{${escapeLatex(e.title)}} \\hfill ${escapeLatex(e.dateRange || '')} \\\\\n\\textit{${escapeLatex(e.organization || '')}} \\\\[-0.5em]\n\\begin{itemize}[leftmargin=1.5em, topsep=2pt, itemsep=0pt]\n${bullets}\n\\end{itemize}`;
    }).join('\n\\vspace{6pt}\n');
    return `{\\Large\\textbf{${escapeLatex(section.sectionName)}}} \\\\[2pt]\n\\rule{\\linewidth}{0.4pt} \\\\[4pt]\n${entries}`;
  }).filter(s => s).join('\n\\vspace{10pt}\n');

  return `${getCredits('Two-Column')}

\\documentclass[11pt,letterpaper]{article}
\\usepackage[left=0.3in,right=0.3in,top=0.3in,bottom=0.3in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{xcolor}
${useIcons ? '\\usepackage{fontawesome5}' : ''}

\\definecolor{sidebarcolor}{RGB}{245,245,250}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}

\\begin{document}

\\noindent
\\begin{minipage}[t]{0.28\\textwidth}
\\vspace{0pt}
\\colorbox{sidebarcolor}{\\parbox{\\dimexpr\\linewidth-2\\fboxsep}{
\\vspace{4pt}
\\centering
{\\Large\\textbf{${escapeLatex(resume.header.name)}}} \\\\[8pt]
\\raggedright
\\small
${contactItems.join(' \\\\[3pt]\n')}
\\vspace{4pt}
}}

\\vspace{8pt}
\\footnotesize
${sidebarContent}
\\end{minipage}%
\\hfill
\\begin{minipage}[t]{0.68\\textwidth}
\\vspace{0pt}
${mainContent}
\\end{minipage}

\\end{document}`;
};
