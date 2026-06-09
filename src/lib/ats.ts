import nlp from 'compromise';
import type { Resume, Section, SkillsSection, StandardSection } from '@/types/resume';
import { normalizeSectionName } from '@/lib/templates/shared';
import type { CanonicalSectionType } from '@/lib/templates/shared';

export type AtsFindingSeverity = 'error' | 'warning' | 'suggestion';
export type AtsTemplateRisk = 'low' | 'medium' | 'high';

export interface AtsFinding {
  id: string;
  severity: AtsFindingSeverity;
  title: string;
  description: string;
}

export interface AutofillSectionMapping {
  sectionId: string;
  sectionName: string;
  canonicalType: CanonicalSectionType | 'custom';
  confidence: 'high' | 'medium' | 'low';
  autofillHint: string;
}

export interface AtsTemplateProfile {
  templateId: string;
  label: string;
  risk: AtsTemplateRisk;
  scorePenalty: number;
  summary: string;
}

export interface AtsAnalysis {
  score: number;
  grade: 'Excellent' | 'Good' | 'Needs work' | 'At risk';
  findings: AtsFinding[];
  templateProfile: AtsTemplateProfile;
  autofillMap: AutofillSectionMapping[];
}

interface CompromiseTermJson {
  terms?: Array<{
    tags?: string[];
  }>;
}

const IRREGULAR_ACTION_VERBS = new Set([
  'began',
  'built',
  'drove',
  'grew',
  'led',
  'made',
  'ran',
  'set',
  'shipped',
  'won',
  'wrote',
]);

const OUTCOME_PATTERN =
  /(\d|%|\$|users?|customers?|revenue|latency|uptime|cost|time|efficiency|quality|performance|conversion|retention|growth|security|secure|encrypted|encryption|privacy|compliance|reduced|increased|improved|saved|scaled)/i;
const actionVerbCache = new Map<string, boolean>();

const TEMPLATE_PROFILES: Record<string, AtsTemplateProfile> = {
  classic: {
    templateId: 'classic',
    label: 'Classic',
    risk: 'low',
    scorePenalty: 0,
    summary: 'Single-column layout with simple headings and readable contact text.',
  },
  compact: {
    templateId: 'compact',
    label: 'Compact',
    risk: 'low',
    scorePenalty: 0,
    summary: 'Single-column layout with proven resume macros and Unicode extraction.',
  },
  academic: {
    templateId: 'academic',
    label: 'Academic CV',
    risk: 'low',
    scorePenalty: 0,
    summary: 'Traditional one-column CV layout with standard sections.',
  },
  developer: {
    templateId: 'developer',
    label: 'Developer',
    risk: 'medium',
    scorePenalty: 6,
    summary: 'Tech-focused styling is readable, but decorative accents can be less predictable.',
  },
  'two-column': {
    templateId: 'two-column',
    label: 'Two-Column',
    risk: 'high',
    scorePenalty: 14,
    summary: 'Sidebar and minipage layouts can scramble reading order in some ATS parsers.',
  },
};

const AUTOFILL_HINTS: Record<CanonicalSectionType | 'custom', string> = {
  summary: 'Use this section for a concise role-targeted professional summary.',
  experience: 'Map work history here with title, company, dates, and measurable bullets.',
  education: 'Map schools, degrees, graduation dates, coursework, and academic honors here.',
  projects: 'Map portfolio or technical projects here with stack in the organization field.',
  skills: 'Map keywords and technologies here as comma-separated categories.',
  certifications: 'Map licenses, certifications, providers, and completion dates here.',
  awards: 'Map honors, awards, and recognitions here.',
  custom: 'Treat this as custom content unless the section name is made more standard.',
};

const getTemplateProfile = (templateId: string): AtsTemplateProfile =>
  TEMPLATE_PROFILES[templateId] ?? {
    templateId,
    label: templateId,
    risk: 'medium',
    scorePenalty: 8,
    summary: 'Unknown template, so ATS behavior should be reviewed before use.',
  };

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
});

const hasMetricOrOutcome = (text: string): boolean =>
  OUTCOME_PATTERN.test(text);

const startsWithActionVerb = (text: string): boolean => {
  const firstWord = text.trim().split(/\s+/)[0]?.replace(/[^a-z-]/gi, '');
  if (!firstWord) return false;

  const normalizedFirstWord = firstWord.toLowerCase();
  const cachedResult = actionVerbCache.get(normalizedFirstWord);
  if (cachedResult !== undefined) return cachedResult;

  const [parsedTerm] = nlp(firstWord).terms().json() as CompromiseTermJson[];
  const tags = parsedTerm?.terms?.[0]?.tags ?? [];

  const isActionVerb =
    tags.includes('Verb') ||
    normalizedFirstWord.endsWith('ed') ||
    normalizedFirstWord.endsWith('ing') ||
    IRREGULAR_ACTION_VERBS.has(normalizedFirstWord);

  actionVerbCache.set(normalizedFirstWord, isActionVerb);
  return isActionVerb;
};

const mapSectionToAutofill = (section: Section): AutofillSectionMapping => {
  const canonicalType = normalizeSectionName(section.sectionName) ?? 'custom';
  const confidence = canonicalType === 'custom' ? 'low' : 'high';

  return {
    sectionId: section.id,
    sectionName: section.sectionName || 'Untitled Section',
    canonicalType,
    confidence,
    autofillHint: AUTOFILL_HINTS[canonicalType],
  };
};

const analyzeStandardSection = (
  section: StandardSection,
  findings: AtsFinding[]
): void => {
  const canonicalType = normalizeSectionName(section.sectionName);
  const shouldCheckAchievementBullets = canonicalType !== 'education';

  if (section.entries.length === 0) {
    findings.push(
      createFinding(
        `empty-section-${section.id}`,
        'warning',
        `Add entries to ${section.sectionName}`,
        'Empty sections reduce confidence for both ATS parsing and autofill.'
      )
    );
    return;
  }

  section.entries.forEach((entry, entryIndex) => {
    const entryLabel = entry.title || `entry ${entryIndex + 1}`;
    const bullets = entry.bulletPoints.filter((bullet) => bullet.trim());

    if (!entry.title.trim()) {
      findings.push(
        createFinding(
          `missing-title-${entry.id}`,
          'error',
          'Add a title to each entry',
          `${section.sectionName} has an entry without a title, which makes autofill mapping ambiguous.`
        )
      );
    }

    if (bullets.length === 0) {
      findings.push(
        createFinding(
          `missing-bullets-${entry.id}`,
          'warning',
          `Add bullets for ${entryLabel}`,
          'ATS ranking works best when each role or project includes keyword-rich accomplishment bullets.'
        )
      );
    }

    if (!shouldCheckAchievementBullets) return;

    bullets.slice(0, 3).forEach((bullet, bulletIndex) => {
      if (!startsWithActionVerb(bullet)) {
        findings.push(
          createFinding(
            `action-verb-${entry.id}-${bulletIndex}`,
            'suggestion',
            'Start bullets with action verbs',
            `"${bullet}" is easier to score when it starts with a direct action verb.`
          )
        );
      }

      if (!hasMetricOrOutcome(bullet)) {
        findings.push(
          createFinding(
            `metric-${entry.id}-${bulletIndex}`,
            'suggestion',
            'Add measurable outcomes',
            `"${bullet}" would be stronger with a metric, scale, result, or business outcome.`
          )
        );
      }
    });
  });
};

const analyzeSkillsSection = (section: SkillsSection, findings: AtsFinding[]): void => {
  const populatedCategories = section.categories.filter(
    (category) => category.categoryName.trim() && category.skills.length > 0
  );

  if (populatedCategories.length === 0) {
    findings.push(
      createFinding(
        `empty-skills-${section.id}`,
        'warning',
        'Add searchable skills',
        'ATS systems often rely on exact skill keywords, so at least one populated skills category is recommended.'
      )
    );
  }
};

const calculateScore = (findings: AtsFinding[], templatePenalty: number): number => {
  const findingPenalty = findings.reduce((total, finding) => {
    if (finding.severity === 'error') return total + 12;
    if (finding.severity === 'warning') return total + 6;
    return total + 3;
  }, 0);

  return Math.max(0, Math.min(100, 100 - templatePenalty - findingPenalty));
};

const scoreToGrade = (score: number): AtsAnalysis['grade'] => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Needs work';
  return 'At risk';
};

export const getTemplateAtsProfile = getTemplateProfile;

export const mapSectionsToCanonicalTypes = (sections: Section[]): AutofillSectionMapping[] =>
  [...sections]
    .sort((a, b) => a.order - b.order)
    .map(mapSectionToAutofill);

export const analyzeResumeForAts = (
  resume: Resume,
  templateId: string
): AtsAnalysis => {
  const findings: AtsFinding[] = [];
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  const templateProfile = getTemplateProfile(templateId);

  if (!resume.header.name.trim()) {
    findings.push(
      createFinding(
        'missing-name',
        'error',
        'Add your name',
        'The header name anchors candidate identity for parsers and recruiters.'
      )
    );
  }

  if (!resume.header.email.trim()) {
    findings.push(
      createFinding(
        'missing-email',
        'error',
        'Add an email address',
        'Most ATS systems expect a plain, searchable email address in the header.'
      )
    );
  }

  if (!resume.header.phone?.trim()) {
    findings.push(
      createFinding(
        'missing-phone',
        'suggestion',
        'Add a phone number',
        'A phone number improves contact completeness and parser confidence.'
      )
    );
  }

  if (sortedSections.length === 0) {
    findings.push(
      createFinding(
        'missing-sections',
        'error',
        'Add resume sections',
        'Autofill and ATS scoring need structured sections such as Experience, Education, Projects, and Skills.'
      )
    );
  }

  sortedSections.forEach((section) => {
    const canonicalType = normalizeSectionName(section.sectionName);

    if (!canonicalType) {
      findings.push(
        createFinding(
          `non-standard-section-${section.id}`,
          'suggestion',
          'Use standard section names',
          `"${section.sectionName || 'Untitled Section'}" may autofill more accurately as Experience, Education, Projects, or Skills.`
        )
      );
    }

    if (section.type === 'standard') {
      analyzeStandardSection(section, findings);
      return;
    }

    analyzeSkillsSection(section, findings);
  });

  if (templateProfile.risk === 'high') {
    findings.push(
      createFinding(
        `template-risk-${templateId}`,
        'warning',
        'Consider a one-column ATS template',
        templateProfile.summary
      )
    );
  } else if (templateProfile.risk === 'medium') {
    findings.push(
      createFinding(
        `template-risk-${templateId}`,
        'suggestion',
        'Review decorative template styling',
        templateProfile.summary
      )
    );
  }

  const score = calculateScore(findings, templateProfile.scorePenalty);

  return {
    score,
    grade: scoreToGrade(score),
    findings,
    templateProfile,
    autofillMap: mapSectionsToCanonicalTypes(sortedSections),
  };
};
