import { Resume, StandardEntry } from '@/types/resume';
import {
  escapeLatex,
  escapeLatexInline,
  getAtsLatexPreamble,
  getCredits,
  getHeaderContactLines,
  normalizeSectionName,
} from './shared';
import { getLatexEntryParts } from './entryLatex';

/**
 * Dense: Times-like serif at 10pt with 0.5in margins, modeled on a Google Docs resume.
 * Two heading rows per entry (bold org | bold location, italic role | italic dates),
 * built from the raw fields rather than the merged "role, location" string.
 */

const row = (left: string, right: string, style: 'textbf' | 'textit'): string => {
  if (!left && !right) return '';
  const l = left ? `\\${style}{${left}}` : '';
  const r = right ? `\\${style}{${right}}` : '';
  return `${l}\\hfill ${r}\\par`;
};

const bulletList = (bullets: string[]): string =>
  bullets.length === 0
    ? ''
    : `\\begin{denselist}\n${bullets.map((b) => `  \\item ${escapeLatexInline(b)}`).join('\n')}\n\\end{denselist}`;

export const generateDenseLatex = (resume: Resume): string => {
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  // Icons are never drawn in this template, whatever header.iconMode says
  const { line1, line2 } = getHeaderContactLines(resume.header, false, 'underline');
  const contactLine = [...line1, ...line2].join(' $|$ ');

  const sections = sortedSections
    .map((section) => {
      const heading = `\\section{${escapeLatex(section.sectionName)}}`;

      if (section.type === 'skills') {
        const cats = section.categories.filter((c) => c.categoryName && c.skills.length > 0);
        if (cats.length === 0) return '';
        const lines = cats
          .map(
            (c) =>
              `  \\item \\textbf{\\textit{${escapeLatex(c.categoryName)}:}} ${c.skills.map(escapeLatex).join(', ')}`
          )
          .join('\n');
        return `${heading}\n\\begin{denselist}\n${lines}\n\\end{denselist}`;
      }

      if (section.entries.length === 0) return '';
      const sectionType = normalizeSectionName(section.sectionName);
      let previous: StandardEntry | null = null;

      const blocks = section.entries.map((entry) => {
        const parts = getLatexEntryParts(entry, section.sectionName);
        const prior = previous;
        previous = entry;

        // No heading content: skip the heading rows entirely
        if (!parts.hasHeading) {
          if (parts.bullets.length === 0) return '';
          if (parts.isSummary) {
            return parts.bullets.map((b) => `${escapeLatexInline(b)}\\par`).join('\n');
          }
          return bulletList(parts.bullets);
        }

        if (sectionType === 'projects') {
          const tech = parts.secondaryLatex ? ` $|$ \\textit{${parts.secondaryLatex}}` : '';
          const title = parts.linkedPrimary ? `\\textbf{${parts.linkedPrimary}}` : '';
          return `${title}${tech}\\hfill ${parts.datesLatex ? `\\textit{${parts.datesLatex}}` : ''}\\par\n${bulletList(parts.bullets)}`;
        }

        const location = escapeLatex(entry.location?.trim() ?? '');
        // Consecutive roles at the same place share one organization row, as in the original
        const sameOrgAsPrior =
          prior !== null &&
          Boolean(entry.organization?.trim()) &&
          prior.organization?.trim() === entry.organization?.trim() &&
          (prior.location?.trim() ?? '') === (entry.location?.trim() ?? '');
        const orgRow = sameOrgAsPrior ? '' : row(parts.linkedPrimary, location, 'textbf');
        const roleRow = row(escapeLatex(entry.role?.trim() ?? ''), parts.datesLatex, 'textit');
        const extras = [
          parts.courseworkLatex ? `\\textbf{Relevant Coursework:} ${parts.courseworkLatex}\\par` : '',
          parts.educationMetaLatex ? `${parts.educationMetaLatex}\\par` : '',
        ];

        return [orgRow, roleRow, ...extras, bulletList(parts.bullets)].filter(Boolean).join('\n');
      });

      const body = blocks.filter(Boolean).join('\n');
      return body ? `${heading}\n${body}` : '';
    })
    .filter(Boolean)
    .join('\n\n');

  return `${getCredits('Dense')}

\\documentclass[10pt,letterpaper]{article}
\\usepackage[T1]{fontenc}
\\usepackage{mathptmx}
\\usepackage[letterpaper,margin=0.5in]{geometry}
\\usepackage{enumitem}
\\usepackage{titlesec}
\\usepackage[hidelinks]{hyperref}
${getAtsLatexPreamble()}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\raggedright

\\titleformat{\\section}{\\normalsize\\bfseries}{}{0em}{\\MakeUppercase}[\\vspace{-4pt}\\rule{\\linewidth}{0.5pt}]
\\titlespacing*{\\section}{0pt}{5pt}{3pt}
\\newlist{denselist}{itemize}{1}
\\setlist[denselist]{label=$\\bullet$, leftmargin=0.37in, labelsep=0.17in, topsep=0pt, partopsep=0pt, itemsep=0pt, parsep=0pt}

\\begin{document}

{\\centering
{\\Large\\textbf{${escapeLatex(resume.header.name)}}}\\par\\vspace{3pt}
${contactLine}\\par}

${sections}

\\end{document}`;
};
