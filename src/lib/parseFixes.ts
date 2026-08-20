import type { Resume, Section, StandardSection } from '@/types/resume';

const trimBulletList = (bullets: string[]): string[] =>
  bullets.map((bullet) => bullet.trim()).filter(Boolean);

const fixSection = (section: Section): Section => {
  if (section.type !== 'standard') return section;
  const standard = section as StandardSection;
  return {
    ...standard,
    entries: standard.entries.map((entry) => ({
      ...entry,
      bulletPoints: trimBulletList(entry.bulletPoints),
      dateRange: entry.dates?.start || entry.dates?.end ? undefined : entry.dateRange,
    })),
  };
};

export const applySafeParseFixes = (resume: Resume): Resume => {
  const iconMode =
    resume.header.iconMode === 'icon' ? 'icon-and-text' : resume.header.iconMode ?? 'icon-and-text';

  return {
    ...resume,
    header: {
      ...resume.header,
      iconMode,
      useIcons: undefined,
    },
    sections: resume.sections.map(fixSection),
    lastModified: new Date(),
  };
};
