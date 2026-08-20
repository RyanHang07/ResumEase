import type { Resume, StandardEntry } from '@/types/resume';
import {
  getEntryPrimaryText,
  getEntrySecondaryText,
  getPrimaryExpectedGraduation,
} from '@/lib/resumeDisplay';
import { analyzeSkillCoverage } from '@/lib/skillCoverage';

export interface CoverLetterSlots {
  entryIds: string[];
  keywords: string[];
  referrer?: string;
}

export interface CoverLetterBuildResult {
  markdown: string;
  warnings: string[];
  wordCount: number;
}

export const COVER_LETTER_MIN_WORDS = 250;
export const COVER_LETTER_MAX_WORDS = 400;

const findEntry = (
  resume: Resume,
  entryId: string
): { entry: StandardEntry; sectionName: string } | null => {
  for (const section of resume.sections) {
    if (section.type !== 'standard') continue;
    const entry = section.entries.find((item) => item.id === entryId);
    if (entry) return { entry, sectionName: section.sectionName };
  }
  return null;
};

const firstBullet = (entry: StandardEntry): string =>
  entry.bulletPoints.map((bullet) => bullet.trim()).find(Boolean) ?? '';

const countWords = (text: string): number =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

const truncateToMaxWords = (text: string, maxWords: number): string => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(' ')}…`;
};

export const buildCoverLetterMarkdown = (
  resume: Resume,
  slots: CoverLetterSlots
): CoverLetterBuildResult => {
  const warnings: string[] = [];
  const company = resume.jobTarget?.company?.trim() || 'the hiring team';
  const role = resume.jobTarget?.role?.trim() || 'Software Engineering Intern';
  const name = resume.header.name.trim() || 'Applicant';
  const graduation = getPrimaryExpectedGraduation(resume);
  const unbacked = new Set(
    analyzeSkillCoverage(resume).unbacked.map((skill) => skill.toLowerCase())
  );

  const safeKeywords = slots.keywords
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .filter((keyword) => {
      if (unbacked.has(keyword.toLowerCase())) {
        warnings.push(`Skipped unbacked skill keyword: ${keyword}`);
        return false;
      }
      return true;
    })
    .slice(0, 6);

  const evidenceLines: string[] = [];
  for (const entryId of slots.entryIds.slice(0, 3)) {
    const found = findEntry(resume, entryId);
    if (!found) continue;
    const { entry, sectionName } = found;
    const primary = getEntryPrimaryText(entry, sectionName);
    const secondary = getEntrySecondaryText(entry, sectionName);
    const bullet = firstBullet(entry);
    const label = [primary, secondary].filter(Boolean).join(' — ');
    if (!bullet) {
      warnings.push(`Skipped entry "${label || entryId}" — no attested bullet to cite.`);
      continue;
    }
    evidenceLines.push(`- **${label}**: ${bullet}`);
  }

  const referrerLine = slots.referrer?.trim()
    ? `I was referred by ${slots.referrer.trim()}. `
    : '';

  const graduationLine = graduation
    ? ` Expected graduation: ${graduation}.`
    : '';

  const keywordLine =
    safeKeywords.length > 0
      ? `From the posting, I can speak to: ${safeKeywords.join(', ')}.`
      : '';

  let markdown = [
    `Dear ${company} Recruiting Team,`,
    '',
    `${referrerLine}I am applying for the ${role} role at ${company}.${graduationLine}`,
    '',
    evidenceLines.length > 0
      ? ['Relevant experience from my resume:', '', ...evidenceLines].join('\n')
      : 'I have attached my resume. Select attested entries above to cite specific experience.',
    '',
    keywordLine,
    '',
    'Thank you for your time.',
    '',
    'Sincerely,',
    name,
  ]
    .filter((line, index, arr) => !(line === '' && arr[index - 1] === ''))
    .join('\n')
    .trim();

  let wordCount = countWords(markdown);

  // ponytail: never invent habits/claims to hit 250 words — warn and let the user add attested entries
  if (wordCount < COVER_LETTER_MIN_WORDS) {
    warnings.push(
      `Cover letter is ${wordCount} words (target ${COVER_LETTER_MIN_WORDS}–${COVER_LETTER_MAX_WORDS}). Add attested entries or keywords — length is not padded with invented claims.`
    );
  }

  if (wordCount > COVER_LETTER_MAX_WORDS) {
    warnings.push(
      `Cover letter trimmed to ${COVER_LETTER_MAX_WORDS} words (was ${wordCount}).`
    );
    const withoutSignoff = markdown.replace(/\nSincerely,\n[\s\S]*$/, '').trim();
    const trimmedBody = truncateToMaxWords(
      withoutSignoff,
      COVER_LETTER_MAX_WORDS - countWords(`Sincerely ${name}`) - 2
    );
    markdown = `${trimmedBody}\n\nSincerely,\n${name}`;
    wordCount = countWords(markdown);
  }

  return { markdown, warnings, wordCount };
};
