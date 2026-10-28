import nlp from 'compromise';
import type { Resume, Section, SkillsSection, StandardSection } from '@/types/resume';
import { normalizeSectionName } from '@/lib/templates/shared';
import type { CanonicalSectionType } from '@/lib/templates/shared';
import { getEntryLinkUrl, getEntryPrimaryText, resumeHasExpectedGraduation } from '@/lib/resumeDisplay';
import type { PdfRoundTripResult } from '@/lib/pdfRoundTrip';
import {
  analyzeSkillCoverage,
  findProjectsMissingLinks,
  findProjectsUnlinkableUrls,
  findTutorialProjects,
} from '@/lib/skillCoverage';
import { isCompileTemplateId } from '@/lib/latex-generator';

export type AtsFindingSeverity = 'error' | 'warning' | 'suggestion';
export type AtsTemplateRisk = 'low' | 'medium' | 'high';
export type AtsFindingCategory = 'header' | 'structure' | 'content' | 'template';
export type ParseFixId = 'safe-icons' | 'trim-empty-bullets' | 'classic-template';

export interface AtsFinding {
  id: string;
  severity: AtsFindingSeverity;
  title: string;
  description: string;
  category: AtsFindingCategory;
  fixId?: ParseFixId;
}

export interface ParseChecklistItem {
  id: string;
  label: string;
  pass: boolean;
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
  checklist: ParseChecklistItem[];
  templateProfile: AtsTemplateProfile;
  autofillMap: AutofillSectionMapping[];
}

interface CompromiseDocJson {
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

const ED_ADJECTIVES = new Set([
  'advanced',
  'awarded',
  'based',
  'certified',
  'dedicated',
  'detailed',
  'distributed',
  'embedded',
  'experienced',
  'focused',
  'interested',
  'involved',
  'motivated',
  'passionate',
  'proven',
  'published',
  'related',
  'selected',
  'skilled',
]);

const QUANTITY_PATTERN = /(\d|%|\$|\b\d+x\b)/i;
const actionVerbCache = new Map<string, boolean>();

const CATEGORY_WEIGHTS: Record<AtsFindingCategory, number> = {
  header: 0.3,
  structure: 0.25,
  content: 0.3,
  template: 0.15,
};

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
};

const AUTOFILL_HINTS: Record<CanonicalSectionType | 'custom', string> = {
  summary: 'Use this section for a concise role-targeted professional summary.',
  experience: 'Map work history here with role, company, dates, and measurable bullets.',
  education: 'Map schools, degrees, graduation dates, coursework, and academic honors here.',
  projects: 'Map portfolio or technical projects here with a tech stack and a link.',
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
  description: string,
  category: AtsFindingCategory,
  fixId?: ParseFixId
): AtsFinding => ({
  id,
  severity,
  title,
  description,
  category,
  fixId,
});

export const hasMetricOrOutcome = (text: string): boolean => QUANTITY_PATTERN.test(text);

export const startsWithActionVerb = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;

  const cachedResult = actionVerbCache.get(trimmed);
  if (cachedResult !== undefined) return cachedResult;

  const firstWord = trimmed.split(/\s+/)[0]?.replace(/[^a-z-]/gi, '');
  const normalizedFirstWord = firstWord?.toLowerCase() ?? '';
  if (!normalizedFirstWord) {
    actionVerbCache.set(trimmed, false);
    return false;
  }

  if (ED_ADJECTIVES.has(normalizedFirstWord)) {
    actionVerbCache.set(trimmed, false);
    return false;
  }

  if (IRREGULAR_ACTION_VERBS.has(normalizedFirstWord)) {
    actionVerbCache.set(trimmed, true);
    return true;
  }

  const [parsed] = nlp(trimmed).json() as CompromiseDocJson[];
  const tags = parsed?.terms?.[0]?.tags ?? [];
  const isActionVerb = tags.includes('Verb');
  actionVerbCache.set(trimmed, isActionVerb);
  return isActionVerb;
};

const resumeHasGithub = (resume: Resume): boolean => {
  if (resume.header.github?.trim()) return true;
  return resume.sections.some((section) => {
    if (section.type !== 'standard') return false;
    return section.entries.some((entry) =>
      getEntryLinkUrl(entry).toLowerCase().includes('github.com')
    );
  });
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
        'Empty sections reduce confidence for both ATS parsing and autofill.',
        'structure'
      )
    );
    return;
  }

  section.entries.forEach((entry, entryIndex) => {
    const entryLabel = getEntryPrimaryText(entry, section.sectionName) || `entry ${entryIndex + 1}`;
    const bullets = entry.bulletPoints.filter((bullet) => bullet.trim());
    const emptyExtras = entry.bulletPoints.length > 1 && entry.bulletPoints.some((bullet) => !bullet.trim());

    if (!getEntryPrimaryText(entry, section.sectionName)) {
      findings.push(
        createFinding(
          `missing-title-${entry.id}`,
          'error',
          'Add a name to each entry',
          `${section.sectionName} has an entry without an organization, school, or project name.`,
          'structure'
        )
      );
    }

    const educationHasCoursework =
      canonicalType === 'education' && (entry.coursework ?? []).some((item) => item.trim());

    if (bullets.length === 0 && !educationHasCoursework) {
      findings.push(
        createFinding(
          `missing-bullets-${entry.id}`,
          'warning',
          `Add bullets for ${entryLabel}`,
          'ATS ranking works best when each role or project includes keyword-rich accomplishment bullets.',
          'content'
        )
      );
    }

    if (emptyExtras) {
      findings.push(
        createFinding(
          `empty-bullets-${entry.id}`,
          'suggestion',
          'Remove blank bullet lines',
          `${entryLabel} has empty bullets that add no parseable text.`,
          'structure',
          'trim-empty-bullets'
        )
      );
    }

    if (!shouldCheckAchievementBullets) return;

    const checked = bullets.slice(0, 3);
    if (checked.some((bullet) => !startsWithActionVerb(bullet))) {
      findings.push(
        createFinding(
          `action-verb-${entry.id}`,
          'suggestion',
          'Start bullets with action verbs',
          `${entryLabel}: at least one bullet does not start with a direct action verb.`,
          'content'
        )
      );
    }

    if (!checked.some((bullet) => hasMetricOrOutcome(bullet))) {
      findings.push(
        createFinding(
          `metric-${entry.id}`,
          'suggestion',
          'Add measurable outcomes',
          `${entryLabel}: include a number, percent, dollar amount, or multiplier.`,
          'content'
        )
      );
    }
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
        'ATS systems often rely on exact skill keywords, so at least one populated skills category is recommended.',
        'content'
      )
    );
  }
};

const categoryScore = (findings: AtsFinding[]): number => {
  const errors = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.filter((finding) => finding.severity === 'warning').length;
  const suggestions = findings.filter((finding) => finding.severity === 'suggestion').length;
  const penalty =
    Math.min(36, errors * 12) + Math.min(18, warnings * 6) + Math.min(9, suggestions * 3);
  return Math.max(0, 100 - penalty);
};

const calculateScore = (findings: AtsFinding[], templatePenalty: number): number => {
  const categories = Object.keys(CATEGORY_WEIGHTS) as AtsFindingCategory[];
  const weighted = categories.reduce((total, category) => {
    const score = categoryScore(findings.filter((finding) => finding.category === category));
    return total + score * CATEGORY_WEIGHTS[category];
  }, 0);

  return Math.max(0, Math.min(100, Math.round(weighted - templatePenalty)));
};

const scoreToGrade = (score: number): AtsAnalysis['grade'] => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Needs work';
  return 'At risk';
};

const hasBrokenVerifiedLinks = (resume: Resume): boolean => {
  for (const section of resume.sections) {
    if (section.type !== 'standard') continue;
    for (const entry of section.entries) {
      for (const link of entry.links ?? []) {
        if (link.url.trim() && link.verified === false) return true;
      }
    }
  }
  return false;
};

const buildChecklist = (
  resume: Resume,
  templateId: string,
  sortedSections: Section[],
  pdfRoundTrip?: PdfRoundTripResult | null
): ParseChecklistItem[] => {
  const workSections = sortedSections.filter(
    (section): section is StandardSection =>
      section.type === 'standard' &&
      (normalizeSectionName(section.sectionName) === 'experience' ||
        normalizeSectionName(section.sectionName) === 'projects')
  );
  const workEntries = workSections.flatMap((section) => section.entries);
  const hasStructuredDates =
    workEntries.length > 0 &&
    workEntries.every((entry) => Boolean(entry.dates?.start || entry.dates?.end));
  const hasWorkBullets =
    workEntries.length > 0 &&
    workEntries.every((entry) => entry.bulletPoints.some((bullet) => bullet.trim()));
  const contactFields =
    pdfRoundTrip?.fields.filter(
      (field) => field.id === 'name' || field.id === 'email' || field.id === 'phone'
    ) ?? [];
  // No vacuous pass: require at least one present contact field and that every such field is found.
  const contactExtracted =
    pdfRoundTrip != null &&
    contactFields.length > 0 &&
    contactFields.every((field) => field.found);
  const compiled = Boolean(pdfRoundTrip);

  return [
    { id: 'name', label: 'Name is present', pass: Boolean(resume.header.name.trim()) },
    { id: 'email', label: 'Email is present', pass: Boolean(resume.header.email.trim()) },
    { id: 'dates', label: 'Work and project dates are structured', pass: hasStructuredDates },
    {
      id: 'icons',
      label: 'Contact icons include text',
      pass: resume.header.iconMode !== 'icon',
    },
    {
      id: 'template',
      label: 'Supported ATS template',
      pass: isCompileTemplateId(templateId),
    },
    {
      id: 'sections',
      label: 'Standard section names',
      pass: sortedSections.every((section) => normalizeSectionName(section.sectionName)),
    },
    {
      id: 'github',
      label: 'GitHub / open source link on the resume',
      pass: resumeHasGithub(resume),
    },
    {
      id: 'graduation',
      label: 'Expected graduation is set',
      pass: resumeHasExpectedGraduation(resume),
    },
    { id: 'bullets', label: 'Every experience/project entry has bullets', pass: hasWorkBullets },
    {
      id: 'one-page',
      label: compiled
        ? 'Compiled PDF is one page'
        : 'Compiled PDF is one page (compile to verify)',
      pass: compiled && Boolean(pdfRoundTrip?.isOnePage),
    },
    {
      id: 'pdf-email',
      label: compiled
        ? 'PDF extract includes email'
        : 'PDF extract includes email (compile to verify)',
      pass:
        compiled &&
        (!resume.header.email.trim() ||
          pdfRoundTrip?.fields.find((field) => field.id === 'email')?.found === true),
    },
    {
      id: 'pdf-contact',
      label: compiled
        ? 'PDF extract includes contact text'
        : 'PDF extract includes contact text (compile to verify)',
      pass: compiled && contactExtracted,
    },
    {
      id: 'project-links',
      label: 'Projects include a link',
      pass:
        findProjectsMissingLinks(resume).length === 0 &&
        findProjectsUnlinkableUrls(resume).length === 0,
    },
    {
      id: 'links-live',
      label: 'Verified links are reachable',
      pass: !hasBrokenVerifiedLinks(resume),
    },
    {
      id: 'skill-backing',
      label: 'Skills appear in bullets',
      pass: (() => {
        const coverage = analyzeSkillCoverage(resume);
        if (coverage.total === 0) return true;
        return coverage.unbacked.length / coverage.total <= 0.4;
      })(),
    },
    // ponytail: JD is a workflow checklist item only — it must not feed the parse score
    {
      id: 'job-target',
      label: 'Target job description is set',
      pass: Boolean(resume.jobTarget?.jdText?.trim()),
    },
  ];
};

export const getTemplateAtsProfile = getTemplateProfile;

export const mapSectionsToCanonicalTypes = (sections: Section[]): AutofillSectionMapping[] =>
  [...sections]
    .sort((a, b) => a.order - b.order)
    .map(mapSectionToAutofill);

export const analyzeResumeForAts = (
  resume: Resume,
  templateId: string,
  pdfRoundTrip?: PdfRoundTripResult | null
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
        'The header name anchors candidate identity for parsers and recruiters.',
        'header'
      )
    );
  }

  if (!resume.header.email.trim()) {
    findings.push(
      createFinding(
        'missing-email',
        'error',
        'Add an email address',
        'Most ATS systems expect a plain, searchable email address in the header.',
        'header'
      )
    );
  }

  if (!resume.header.phone?.trim()) {
    findings.push(
      createFinding(
        'missing-phone',
        'suggestion',
        'Add a phone number',
        'A phone number improves contact completeness and parser confidence.',
        'header'
      )
    );
  }

  if (resume.header.iconMode === 'icon') {
    findings.push(
      createFinding(
        'icon-only-contact',
        'error',
        'Show contact text next to icons',
        'Icon-only glyphs often extract as empty text. Use icons and text.',
        'template',
        'safe-icons'
      )
    );
  }

  if (sortedSections.length === 0) {
    findings.push(
      createFinding(
        'missing-sections',
        'error',
        'Add resume sections',
        'Autofill and ATS scoring need structured sections such as Experience, Education, Projects, and Skills.',
        'structure'
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
          `"${section.sectionName || 'Untitled Section'}" may autofill more accurately as Experience, Education, Projects, or Skills.`,
          'structure'
        )
      );
    }

    if (section.type === 'standard') {
      analyzeStandardSection(section, findings);
      return;
    }

    analyzeSkillsSection(section, findings);
  });

  if (!isCompileTemplateId(templateId)) {
    findings.push(
      createFinding(
        `template-risk-${templateId}`,
        'warning',
        'Switch to a supported template',
        'This resume still points at a removed template. Classic, Compact, or Academic are supported.',
        'template',
        'classic-template'
      )
    );
  }

  if (!resumeHasGithub(resume)) {
    findings.push(
      createFinding(
        'missing-github',
        'suggestion',
        'Add a GitHub link',
        'A GitHub URL on the header or a project is the open-source checklist item. It is not a separate resume section.',
        'header'
      )
    );
  }

  if (!pdfRoundTrip) {
    findings.push(
      createFinding(
        'pdf-not-compiled',
        'warning',
        'Compile the PDF preview',
        'One-page and extract checks stay open until the compiled PDF is measured. Compiling is how the score earns Track A proof.',
        'template'
      )
    );
  }

  const missingProjectLinks = findProjectsMissingLinks(resume);
  if (missingProjectLinks.length > 0) {
    findings.push(
      createFinding(
        'projects-missing-links',
        'warning',
        'Add links to projects',
        `Missing links: ${missingProjectLinks.slice(0, 4).join(', ')}${
          missingProjectLinks.length > 4 ? '…' : ''
        }. Parsers and recruiters both need a clickable URL.`,
        'content'
      )
    );
  }

  const unlinkableProjectUrls = findProjectsUnlinkableUrls(resume);
  if (unlinkableProjectUrls.length > 0) {
    findings.push(
      createFinding(
        'projects-unlinkable-urls',
        'warning',
        'Fix unlinkable project URLs',
        `These project links are not safe http(s) URLs: ${unlinkableProjectUrls
          .slice(0, 4)
          .join(', ')}${
          unlinkableProjectUrls.length > 4 ? '…' : ''
        }. Use a full https:// link or a bare host like github.com/you/repo.`,
        'content'
      )
    );
  }

  if (hasBrokenVerifiedLinks(resume)) {
    findings.push(
      createFinding(
        'broken-verified-links',
        'warning',
        'Fix links that failed verification',
        'Verify Links marked one or more URLs unreachable. Update or remove them so the resume does not claim dead evidence.',
        'content'
      )
    );
  }

  const skillCoverage = analyzeSkillCoverage(resume);
  if (skillCoverage.total > 0 && skillCoverage.unbacked.length > 0) {
    const ratio = skillCoverage.unbacked.length / skillCoverage.total;
    findings.push(
      createFinding(
        'unbacked-skills',
        ratio > 0.4 ? 'warning' : 'suggestion',
        'Back skills with bullets',
        `${skillCoverage.unbacked.length} of ${skillCoverage.total} skills never appear in a bullet (${skillCoverage.unbacked
          .slice(0, 5)
          .join(', ')}${skillCoverage.unbacked.length > 5 ? '…' : ''}). Prune or cite them.`,
        'content'
      )
    );
  }

  const tutorialProjects = findTutorialProjects(resume);
  if (tutorialProjects.length > 0) {
    findings.push(
      createFinding(
        'tutorial-projects',
        'suggestion',
        'Rename tutorial-looking projects',
        `These titles look like common tutorials: ${tutorialProjects.slice(0, 3).join(', ')}. Prefer a distinctive name and a live link.`,
        'content'
      )
    );
  }

  if (pdfRoundTrip) {
    if (!pdfRoundTrip.isOnePage) {
      findings.push(
        createFinding(
          'pdf-multi-page',
          'error',
          'Keep the PDF to one page',
          `Compiled PDF has ${pdfRoundTrip.pageCount} pages. Intern ATS uploads usually want a single page.`,
          'template'
        )
      );
    }

    for (const field of pdfRoundTrip.fields) {
      if (field.found) continue;
      findings.push(
        createFinding(
          `pdf-missing-${field.id}`,
          field.id === 'email' || field.id === 'name' ? 'error' : 'warning',
          `PDF extract is missing ${field.label.toLowerCase()}`,
          `The PDF may draw "${field.expected}", but extracted text does not include it. Parsers will see a blank ${field.label.toLowerCase()}.`,
          'template'
        )
      );
    }

    if (pdfRoundTrip.sectionOrderOk === false) {
      findings.push(
        createFinding(
          'pdf-section-order',
          'warning',
          'PDF reading order does not match section order',
          'Extracted section headings appear out of the editor order. Two-column layouts often cause this.',
          'template'
        )
      );
    } else if (pdfRoundTrip.sectionOrderOk === null) {
      const standardSectionCount = sortedSections.filter((section) =>
        Boolean(normalizeSectionName(section.sectionName))
      ).length;
      if (standardSectionCount >= 2) {
        findings.push(
          createFinding(
            'pdf-section-order-incomplete',
            'warning',
            'PDF extract could not verify section order',
            'Fewer than two section headings were found in the PDF text layer, so reading order was not checked. Recompile or avoid layouts that omit heading text.',
            'template'
          )
        );
      }
    }
  }

  const score = calculateScore(findings, templateProfile.scorePenalty);
  const severityRank: Record<AtsFindingSeverity, number> = {
    error: 0,
    warning: 1,
    suggestion: 2,
  };

  return {
    score,
    grade: scoreToGrade(score),
    findings: [...findings].sort(
      (left, right) => severityRank[left.severity] - severityRank[right.severity]
    ),
    checklist: buildChecklist(resume, templateId, sortedSections, pdfRoundTrip),
    templateProfile,
    autofillMap: mapSectionsToCanonicalTypes(sortedSections),
  };
};
