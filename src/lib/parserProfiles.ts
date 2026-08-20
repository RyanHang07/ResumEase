import type { AtsFinding, AtsFindingSeverity } from '@/lib/ats';
import type { Resume } from '@/types/resume';
import { analyzeJdGap } from '@/lib/jobTarget';
import { analyzeSkillCoverage } from '@/lib/skillCoverage';

export type ParserProfileId =
  | 'workday'
  | 'taleo'
  | 'lever'
  | 'icims'
  | 'successfactors'
  | 'greenhouse';

export interface ParserProfile {
  id: ParserProfileId;
  label: string;
  summary: string;
}

export const PARSER_PROFILES: ParserProfile[] = [
  {
    id: 'workday',
    label: 'Workday',
    summary: 'Strict on icon-only contact and header text that fails extract.',
  },
  {
    id: 'taleo',
    label: 'Taleo',
    summary: 'Literal JD keyword misses dominate ranking.',
  },
  {
    id: 'lever',
    label: 'Lever',
    summary: 'Acronyms without expansion look thin to recruiters and parsers.',
  },
  {
    id: 'icims',
    label: 'iCIMS',
    summary: 'Short fragments and keyword stuffing read as low quality.',
  },
  {
    id: 'successfactors',
    label: 'SuccessFactors',
    summary: 'Skills that only exist in prose (or only in a list) look incomplete.',
  },
  {
    id: 'greenhouse',
    label: 'Greenhouse',
    summary: 'Scan-time readability: one page, clear section names, sparse noise.',
  },
];

const createFinding = (
  id: string,
  severity: AtsFindingSeverity,
  title: string,
  description: string
): AtsFinding => ({
  id,
  severity,
  title,
  description,
  category: 'template',
});

const ACRONYM_PATTERN = /\b[A-Z]{2,6}\b/g;
const EXPANSION_HINTS = [
  'application programming interface',
  'representational state transfer',
  'continuous integration',
  'continuous delivery',
  'machine learning',
  'user interface',
  'user experience',
];

export const analyzeParserProfile = (
  resume: Resume,
  profileId: ParserProfileId
): AtsFinding[] => {
  const findings: AtsFinding[] = [];

  if (profileId === 'workday') {
    if (resume.header.iconMode === 'icon') {
      findings.push(
        createFinding(
          'workday-icon-only',
          'error',
          'Workday: show contact text',
          'Icon-only glyphs often extract empty under Workday-style parsers.'
        )
      );
    }
    if (!resume.header.email.trim() || !resume.header.name.trim()) {
      findings.push(
        createFinding(
          'workday-header',
          'error',
          'Workday: complete header identity',
          'Name and email must be plain text in the header.'
        )
      );
    }
  }

  if (profileId === 'taleo') {
    const jd = resume.jobTarget?.jdText?.trim();
    if (!jd) {
      findings.push(
        createFinding(
          'taleo-no-jd',
          'warning',
          'Taleo: paste a JD to score keyword coverage',
          'Taleo-style ranking leans on literal token overlap with the posting.'
        )
      );
    } else {
      const gap = analyzeJdGap(resume, jd);
      if (gap.misses.length > 0) {
        findings.push(
          createFinding(
            'taleo-misses',
            'warning',
            `Taleo: ${gap.misses.length} literal JD misses`,
            `Examples: ${gap.misses.slice(0, 8).join(', ')}.`
          )
        );
      }
    }
  }

  if (profileId === 'lever') {
    const text = resume.sections
      .flatMap((section) =>
        section.type === 'standard'
          ? section.entries.flatMap((entry) => entry.bulletPoints)
          : []
      )
      .join('\n');
    const acronyms = [...new Set(text.match(ACRONYM_PATTERN) ?? [])].slice(0, 8);
    const lower = text.toLowerCase();
    const unexpanded = acronyms.filter(
      (acronym) => !EXPANSION_HINTS.some((hint) => lower.includes(hint))
    );
    if (unexpanded.length >= 3) {
      findings.push(
        createFinding(
          'lever-acronyms',
          'suggestion',
          'Lever: expand key acronyms once',
          `Seen: ${unexpanded.join(', ')}. Expand the first use in a bullet.`
        )
      );
    }
  }

  if (profileId === 'icims') {
    const shortBullets = resume.sections
      .filter((section) => section.type === 'standard')
      .flatMap((section) => section.entries)
      .flatMap((entry) => entry.bulletPoints)
      .map((bullet) => bullet.trim())
      .filter((bullet) => bullet.length > 0 && bullet.split(/\s+/).length < 5);
    if (shortBullets.length >= 3) {
      findings.push(
        createFinding(
          'icims-fragments',
          'warning',
          'iCIMS: replace fragment bullets',
          `${shortBullets.length} bullets are under five words and can look like stuffing.`
        )
      );
    }
  }

  if (profileId === 'successfactors') {
    const coverage = analyzeSkillCoverage(resume);
    if (coverage.total > 0 && coverage.unbacked.length / coverage.total > 0.3) {
      findings.push(
        createFinding(
          'sf-skills',
          'warning',
          'SuccessFactors: back listed skills',
          `${coverage.unbacked.length} skills never appear in bullets.`
        )
      );
    }
  }

  if (profileId === 'greenhouse') {
    const customSections = resume.sections.filter(
      (section) =>
        section.type === 'standard' &&
        !/experience|education|project|skill|award|cert/i.test(section.sectionName)
    );
    if (customSections.length > 0) {
      findings.push(
        createFinding(
          'greenhouse-sections',
          'suggestion',
          'Greenhouse: prefer standard section names',
          `Nonstandard: ${customSections.map((section) => section.sectionName).join(', ')}.`
        )
      );
    }
  }

  return findings;
};
