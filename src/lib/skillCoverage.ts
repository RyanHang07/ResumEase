import type { Resume, SkillsSection, StandardSection } from '@/types/resume';
import { escapeHrefUrl, normalizeSectionName } from '@/lib/templates/shared';
import { getEntryLinkUrl, getEntryPrimaryText } from '@/lib/resumeDisplay';
import { isKnownEmployer, isTutorialProjectName } from '@/lib/evidence';

export interface SkillCoverage {
  total: number;
  backed: number;
  unbacked: string[];
}

export const collectResumePlainText = (resume: Resume): string => {
  const parts: string[] = [];
  for (const section of resume.sections) {
    if (section.type === 'skills') {
      for (const category of section.categories) {
        parts.push(...category.skills);
      }
      continue;
    }
    for (const entry of section.entries) {
      parts.push(
        getEntryPrimaryText(entry, section.sectionName),
        entry.role ?? ''
      );
      parts.push(...(entry.techStack ?? []));
      parts.push(...entry.bulletPoints);
      parts.push(...(entry.coursework ?? []));
    }
  }
  return parts.join('\n').toLowerCase();
};

export const analyzeSkillCoverage = (resume: Resume): SkillCoverage => {
  const skillsSection = resume.sections.find(
    (section): section is SkillsSection => section.type === 'skills'
  );
  if (!skillsSection) {
    return { total: 0, backed: 0, unbacked: [] };
  }

  const skills = skillsSection.categories.flatMap((category) =>
    category.skills.map((skill) => skill.trim()).filter(Boolean)
  );
  const uniqueSkills = [...new Set(skills)];
  const bulletText = resume.sections
    .filter((section): section is StandardSection => section.type === 'standard')
    .flatMap((section) => section.entries.flatMap((entry) => entry.bulletPoints))
    .join('\n')
    .toLowerCase();

  const unbacked = uniqueSkills.filter((skill) => {
    const needle = skill.toLowerCase();
    return !bulletText.includes(needle);
  });

  return {
    total: uniqueSkills.length,
    backed: uniqueSkills.length - unbacked.length,
    unbacked,
  };
};

export const findProjectsMissingLinks = (resume: Resume): string[] => {
  const labels: string[] = [];
  for (const section of resume.sections) {
    if (section.type !== 'standard') continue;
    if (normalizeSectionName(section.sectionName) !== 'projects') continue;
    for (const entry of section.entries) {
      const primary = getEntryPrimaryText(entry, section.sectionName);
      if (!primary) continue;
      if (!getEntryLinkUrl(entry)) labels.push(primary);
    }
  }
  return labels;
};

/** Projects with a non-empty URL that cannot become a safe http(s) href. */
export const findProjectsUnlinkableUrls = (resume: Resume): string[] => {
  const labels: string[] = [];
  for (const section of resume.sections) {
    if (section.type !== 'standard') continue;
    if (normalizeSectionName(section.sectionName) !== 'projects') continue;
    for (const entry of section.entries) {
      const primary = getEntryPrimaryText(entry, section.sectionName);
      if (!primary) continue;
      const raw = getEntryLinkUrl(entry);
      if (!raw) continue;
      if (!escapeHrefUrl(raw)) labels.push(primary);
    }
  }
  return labels;
};

export const findUnresolvedOrgs = (resume: Resume): string[] => {
  const unresolved: string[] = [];
  for (const section of resume.sections) {
    if (section.type !== 'standard') continue;
    if (normalizeSectionName(section.sectionName) !== 'experience') continue;
    for (const entry of section.entries) {
      const org = getEntryPrimaryText(entry, section.sectionName);
      if (!org) continue;
      if (isKnownEmployer(org)) continue;
      unresolved.push(org);
    }
  }
  return unresolved;
};

export const findTutorialProjects = (resume: Resume): string[] => {
  const hits: string[] = [];
  for (const section of resume.sections) {
    if (section.type !== 'standard') continue;
    if (normalizeSectionName(section.sectionName) !== 'projects') continue;
    for (const entry of section.entries) {
      const primary = getEntryPrimaryText(entry, section.sectionName);
      if (isTutorialProjectName(primary)) hits.push(primary);
    }
  }
  return hits;
};
