import { Header } from '@/types/resume';

export type CanonicalSectionType =
  | 'summary'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'certifications'
  | 'awards';

// ================================
// CREDIT INFO - Edit your details here
// ================================
export const AUTHOR_CREDIT = {
  name: 'Ryan Hang',
  github: 'https://github.com/ryanhang07',
  projectName: 'ResumEase',
};
// ================================

export const ATS_LATEX_PREAMBLE = `\\input{glyphtounicode}
\\pdfgentounicode=1`;

const SECTION_ALIASES: Record<CanonicalSectionType, string[]> = {
  summary: ['summary', 'professional summary', 'profile', 'objective'],
  experience: [
    'experience',
    'work experience',
    'professional experience',
    'relevant experience',
    'work history',
    'employment',
  ],
  education: ['education', 'academic background'],
  projects: ['projects', 'personal projects', 'technical projects', 'portfolio'],
  skills: ['skills', 'technical skills', 'core skills', 'competencies'],
  certifications: ['certifications', 'licenses', 'credentials'],
  awards: ['awards', 'honors', 'achievements'],
};

export const escapeLatex = (text: string): string => {
  if (!text) return '';

  return text
    .replace(/\\/g, '\u0000')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/\u0000/g, '\\textbackslash{}');
};

/** Escape for a single \\item line: collapse newlines so they cannot break list syntax. */
export const escapeLatexInline = (text: string): string =>
  escapeLatex(text.replace(/\s*\n\s*/g, ' ').trim());

/**
 * Normalize a user-entered URL for href use.
 * Prefills https:// for scheme-less hosts; returns null if empty or non-http(s).
 */
export const normalizeHttpUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const tryParse = (value: string): string | null => {
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      if (url.username || url.password) return null;
      return url.toString();
    } catch {
      return null;
    }
  };

  const direct = tryParse(trimmed);
  if (direct) return direct;

  // Scheme-less: github.com/x → https://github.com/x
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return null;
  return tryParse(`https://${trimmed}`);
};

/** Sanitize a URL for use inside \\href{...}{...}. Returns null if unsafe. */
export const escapeHrefUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.toLowerCase().startsWith('mailto:')) {
    const email = trimmed.slice('mailto:'.length).trim();
    if (!/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email)) return null;
    return `mailto:${email.replace(/%/g, '\\%').replace(/#/g, '\\#')}`;
  }

  const normalized = normalizeHttpUrl(trimmed);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    // hyperref specials in the URL argument
    return url
      .toString()
      .replace(/\\/g, '')
      .replace(/\{/g, '')
      .replace(/\}/g, '')
      .replace(/%/g, '\\%')
      .replace(/#/g, '\\#')
      .replace(/&/g, '\\&')
      .replace(/_/g, '\\_');
  } catch {
    return null;
  }
};

export const getAtsLatexPreamble = (): string => ATS_LATEX_PREAMBLE;

export const normalizeSectionName = (sectionName: string): CanonicalSectionType | null => {
  // ponytail: exact alias match only — includes() mapped "leadership experience awards" → experience
  const normalized = sectionName.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return null;

  const match = Object.entries(SECTION_ALIASES).find(([, aliases]) =>
    aliases.some((alias) => normalized === alias)
  );

  return (match?.[0] as CanonicalSectionType | undefined) ?? null;
};

export const isAtsStandardSectionName = (sectionName: string): boolean =>
  normalizeSectionName(sectionName) !== null;

export const extractUsername = (url: string, platform: string): string => {
  if (!url) return '';
  const patterns: Record<string, RegExp> = {
    // Keep /in/ so printed text matches what ATS + PDF extract look for
    linkedin: /linkedin\.com\/in\/([^\/\?]+)/i,
    github: /github\.com\/([^\/\?]+)/i,
  };
  const match = url.match(patterns[platform]);
  if (match) {
    if (platform === 'linkedin') return `linkedin.com/in/${match[1]}`;
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

type ContactStyle = 'simple' | 'underline';

const hrefPart = (
  href: string | null,
  display: string,
  icon: string,
  style: ContactStyle
): string => {
  if (!href) return `${icon}${display}`;
  if (style === 'underline') return `\\href{${href}}{${icon}\\underline{${display}}}`;
  return `\\href{${href}}{${icon}${display}}`;
};

const buildLinkParts = (
  header: Header,
  useIcons: boolean,
  style: ContactStyle
): string[] => {
  const parts: string[] = [];
  if (header.linkedIn?.trim()) {
    const icon = useIcons ? '\\seticon{faLinkedin} ' : '';
    parts.push(
      hrefPart(
        escapeHrefUrl(header.linkedIn),
        escapeLatex(extractUsername(header.linkedIn, 'linkedin')),
        icon,
        style
      )
    );
  }
  if (header.github?.trim()) {
    const icon = useIcons ? '\\seticon{faGithub} ' : '';
    parts.push(
      hrefPart(
        escapeHrefUrl(header.github),
        escapeLatex(extractUsername(header.github, 'github')),
        icon,
        style
      )
    );
  }
  if (header.website?.trim()) {
    const icon = useIcons ? '\\seticon{faGlobe} ' : '';
    parts.push(
      hrefPart(
        escapeHrefUrl(header.website),
        escapeLatex(header.website.replace(/^https?:\/\/(www\.)?/, '')),
        icon,
        style
      )
    );
  }
  if (header.blog?.trim()) {
    const icon = useIcons ? '\\seticon{faRss} ' : '';
    parts.push(
      hrefPart(
        escapeHrefUrl(header.blog),
        escapeLatex(header.blog.replace(/^https?:\/\/(www\.)?/, '')),
        icon,
        style
      )
    );
  }
  return parts;
};

/** Line 1: auth · phone · email · location (+ sparse links). Line 2: links only if ≥3 filled. */
export const getHeaderContactLines = (
  header: Header,
  useIcons: boolean,
  style: ContactStyle = 'simple'
): { line1: string[]; line2: string[] } => {
  const line1: string[] = [];
  if (header.workAuthorization?.trim()) {
    line1.push(escapeLatex(header.workAuthorization.trim()));
  }
  if (header.phone?.trim()) {
    const icon = useIcons ? '\\seticon{faPhone} ' : '';
    line1.push(`${icon}${escapeLatex(header.phone.trim())}`);
  }
  if (header.email?.trim()) {
    const icon = useIcons ? '\\seticon{faEnvelope} ' : '';
    const email = escapeLatex(header.email.trim());
    line1.push(hrefPart(escapeHrefUrl(`mailto:${header.email.trim()}`), email, icon, style));
  }
  if (header.location?.trim()) {
    line1.push(escapeLatex(header.location.trim()));
  }

  const linkParts = buildLinkParts(header, useIcons, style);
  const filledLinkCount = [
    header.linkedIn,
    header.github,
    header.website,
    header.blog,
  ].filter((value) => value?.trim()).length;

  // ponytail: ≥3 of 4 link slots → own line; otherwise keep links on line 1
  if (filledLinkCount >= 3) {
    return { line1, line2: linkParts };
  }
  return { line1: [...line1, ...linkParts], line2: [] };
};

export const formatHeaderContactLatex = (
  header: Header,
  useIcons: boolean,
  style: ContactStyle = 'simple',
  sep = ' $\\cdot$ '
): string => {
  const { line1, line2 } = getHeaderContactLines(header, useIcons, style);
  if (line1.length === 0 && line2.length === 0) return '';
  if (line2.length === 0) return line1.join(sep);
  return `${line1.join(sep)} \\\\ \\vspace{1pt}\n{\\small ${line2.join(sep)}}`;
};

/** @deprecated Prefer formatHeaderContactLatex */
export const getContactParts = (
  header: Header,
  useIcons: boolean,
  style: ContactStyle | 'icon-only' = 'simple'
): string[] => {
  const contactStyle: ContactStyle = style === 'icon-only' ? 'simple' : style;
  const { line1, line2 } = getHeaderContactLines(header, useIcons, contactStyle);
  return [...line1, ...line2];
};

/** @deprecated Prefer formatHeaderContactLatex */
export const getAtsContactParts = (header: Header, useIcons: boolean): string[] =>
  getContactParts(header, useIcons, 'simple');
