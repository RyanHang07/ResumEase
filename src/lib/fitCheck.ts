import type { Resume, StandardSection } from '@/types/resume';
import { normalizeSectionName } from '@/lib/templates/shared';

/**
 * Pattern-based eligibility read of a pasted JD against facts in the resume.
 * C = likely skip, B = check before spending time, A = no flags.
 * Kept out of the parse score on purpose: this is about the posting, not the PDF.
 */

export type FitTier = 'A' | 'B' | 'C';

export interface FitFlag {
  id: string;
  severity: 'B' | 'C';
  label: string;
  evidence?: string;
}

export interface CandidateFacts {
  /** YYYY-MM of the latest finished education entry. */
  graduated: string | null;
  stillStudying: boolean;
  /** Months of experience-section work, overlaps merged. */
  experienceMonths: number;
  location: string;
}

export interface FitResult {
  tier: FitTier;
  flags: FitFlag[];
  facts: CandidateFacts;
}

const BAY_AREA = [
  'bay area', 'san francisco', 'south san francisco', 'sf', 'san jose', 'palo alto', 'mountain view',
  'sunnyvale', 'santa clara', 'menlo park', 'redwood city', 'oakland', 'berkeley', 'cupertino',
  'fremont', 'san mateo', 'milpitas', 'emeryville', 'foster city', 'burlingame', 'san carlos', 'los gatos',
];

const LANGUAGES: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Java', pattern: /\bJava\b(?!\s*Script)/i },
  { name: 'Go', pattern: /\bGolang\b|\bGo\b(?![\s-]+to\b)(?=[\s,./);]|$)/ },
  { name: 'C++', pattern: /C\+\+/i },
  { name: 'C#', pattern: /C#/i },
  { name: 'Rust', pattern: /\bRust\b/ },
  { name: 'Ruby', pattern: /\bRuby\b/i },
  { name: 'Kotlin', pattern: /\bKotlin\b/i },
  { name: 'Swift', pattern: /\bSwift\b/ },
  { name: 'Scala', pattern: /\bScala\b/i },
  { name: 'PHP', pattern: /\bPHP\b/i },
  { name: 'Elixir', pattern: /\bElixir\b/i },
  { name: 'Python', pattern: /\bPython\b/i },
  { name: 'TypeScript', pattern: /\bTypeScript\b/i },
  { name: 'JavaScript', pattern: /\bJavaScript\b/i },
  { name: 'Dart', pattern: /\bDart\b/ },
];

const STUDENT_ONLY =
  /\b(?:currently (?:enrolled|pursuing)|actively (?:enrolled|pursuing)|returning to (?:school|your studies|university)|must be (?:a )?(?:current|enrolled) student|enrolled (?:full[- ]time )?in an? (?:accredited )?(?:bachelor|master|undergraduate|graduate|degree)|pursuing an? (?:bachelor|master|ph\.?d|degree|undergraduate))/i;
const CLEARANCE = /\b(?:security clearance|clearance (?:is )?required|active (?:secret|top secret)|ts\/sci)\b/i;
const INTERNSHIP = /\bintern(?:ship)?s?\b/i;
const ONSITE = /\b(?:on-?site|in[- ]office|in[- ]person|hybrid|\d days (?:a|per) week in (?:the )?office)\b/i;
const YEARS_REQUIRED = /(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*\d{1,2}\s*\+?\s*)?years?(?:\s+of)?[^.\n\d]{0,60}?experience/gi;
const GRAD_WINDOW_MONTHS =
  /graduat\w*[^.\n]{0,60}?(?:within|in) the (?:last|past) (\d{1,2}|six|twelve|eighteen|twenty-four) months/i;
const GRAD_WINDOW_YEAR = /graduat\w*[^.\n]{0,60}?(?:within|in) the (?:last|past) year/i;
const GRAD_YEARS = /(?:graduat\w*|class of)[^.\n]{0,40}?\b(20\d\d)\b(?:[^.\n]{0,30}?\b(20\d\d)\b)?/i;

const WORD_NUMBERS: Record<string, number> = { six: 6, twelve: 12, eighteen: 18, 'twenty-four': 24 };

const snippet = (text: string, index: number, length: number): string => {
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + length + 50);
  return `${start > 0 ? '...' : ''}${text.slice(start, end).replace(/\s+/g, ' ').trim()}${end < text.length ? '...' : ''}`;
};

const evidenceFor = (text: string, pattern: RegExp): string | undefined => {
  const match = pattern.exec(text);
  return match ? snippet(text, match.index, match[0].length) : undefined;
};

const monthIndex = (yyyyMm: string): number | null => {
  const match = /^(\d{4})-(\d{2})/.exec(yyyyMm);
  return match ? Number(match[1]) * 12 + Number(match[2]) - 1 : null;
};

const sectionsOfType = (resume: Resume, type: 'education' | 'experience') =>
  resume.sections.filter(
    (section): section is StandardSection =>
      section.type === 'standard' && normalizeSectionName(section.sectionName) === type
  );

export const readCandidateFacts = (resume: Resume, now: Date = new Date()): CandidateFacts => {
  const nowIndex = now.getFullYear() * 12 + now.getMonth();

  let graduated: string | null = null;
  let stillStudying = false;
  for (const entry of sectionsOfType(resume, 'education').flatMap((section) => section.entries)) {
    const end = entry.dates?.end === 'present' ? undefined : entry.dates?.end || entry.expectedGraduation;
    const endIndex = end ? monthIndex(end) : null;
    if (entry.dates?.end === 'present' || (endIndex !== null && endIndex > nowIndex)) stillStudying = true;
    else if (end && endIndex !== null && (!graduated || end > graduated)) graduated = end.slice(0, 7);
  }

  const months = new Set<number>();
  for (const entry of sectionsOfType(resume, 'experience').flatMap((section) => section.entries)) {
    const start = entry.dates?.start ? monthIndex(entry.dates.start) : null;
    if (start === null) continue;
    const end = entry.dates?.end === 'present' || !entry.dates?.end ? nowIndex : monthIndex(entry.dates.end) ?? nowIndex;
    for (let month = start; month <= Math.min(end, nowIndex); month += 1) months.add(month);
  }

  return {
    graduated,
    stillStudying,
    experienceMonths: months.size,
    location: resume.header.location ?? '',
  };
};

const resumeStackText = (resume: Resume): string =>
  resume.sections
    .flatMap((section) =>
      section.type === 'skills'
        ? section.categories.flatMap((category) => category.skills)
        : section.entries.flatMap((entry) => [...(entry.techStack ?? []), ...entry.bulletPoints])
    )
    .join('\n');

export const analyzeFit = (resume: Resume, jdText: string, now: Date = new Date()): FitResult => {
  const facts = readCandidateFacts(resume, now);
  const flags: FitFlag[] = [];
  const text = jdText.trim();
  if (!text) return { tier: 'A', flags, facts };

  const isGraduate = Boolean(facts.graduated) && !facts.stillStudying;
  const nowIndex = now.getFullYear() * 12 + now.getMonth();
  const gradIndex = facts.graduated ? monthIndex(facts.graduated) : null;

  if (isGraduate && STUDENT_ONLY.test(text)) {
    flags.push({
      id: 'student-only',
      severity: 'C',
      label: `Requires a current student; you graduated ${facts.graduated}`,
      evidence: evidenceFor(text, STUDENT_ONLY),
    });
  } else if (isGraduate && INTERNSHIP.test(text)) {
    flags.push({
      id: 'internship',
      severity: 'B',
      label: 'Internship posting; check whether graduates qualify',
      evidence: evidenceFor(text, INTERNSHIP),
    });
  }

  if (isGraduate && gradIndex !== null) {
    const monthsMatch = GRAD_WINDOW_MONTHS.exec(text);
    const windowMonths = monthsMatch
      ? Number(monthsMatch[1]) || WORD_NUMBERS[monthsMatch[1].toLowerCase()]
      : GRAD_WINDOW_YEAR.test(text)
        ? 12
        : null;
    const yearsMatch = windowMonths === null ? GRAD_YEARS.exec(text) : null;
    const gradYear = Math.floor(gradIndex / 12);
    const sinceGrad = nowIndex - gradIndex;

    if (windowMonths !== null && sinceGrad > windowMonths) {
      flags.push({
        id: 'grad-window',
        severity: 'C',
        label: `Graduation window is ${windowMonths} months; you graduated ${sinceGrad} months ago`,
        evidence: evidenceFor(text, monthsMatch ? GRAD_WINDOW_MONTHS : GRAD_WINDOW_YEAR),
      });
    } else if (yearsMatch) {
      const first = Number(yearsMatch[1]);
      const last = yearsMatch[2] ? Number(yearsMatch[2]) : first;
      if (gradYear < Math.min(first, last) || gradYear > Math.max(first, last)) {
        flags.push({
          id: 'grad-window',
          severity: 'C',
          label: `Targets ${first === last ? first : `${first} to ${last}`} graduates; you graduated ${facts.graduated}`,
          evidence: snippet(text, yearsMatch.index, yearsMatch[0].length),
        });
      }
    }
  }

  const required = [...text.matchAll(YEARS_REQUIRED)];
  if (required.length > 0) {
    const minimum = Math.min(...required.map((match) => Number(match[1])));
    const have = Math.floor(facts.experienceMonths / 12);
    if (minimum > have) {
      const match = required.find((item) => Number(item[1]) === minimum)!;
      flags.push({
        id: 'years',
        severity: minimum >= have + 2 ? 'C' : 'B',
        label: `Asks for ${minimum}+ years; you have about ${(facts.experienceMonths / 12).toFixed(1)}`,
        evidence: snippet(text, match.index, match[0].length),
      });
    }
  }

  if (CLEARANCE.test(text)) {
    flags.push({
      id: 'clearance',
      severity: 'C',
      label: 'Security clearance required',
      evidence: evidenceFor(text, CLEARANCE),
    });
  }

  const stack = resumeStackText(resume);
  const asked = LANGUAGES.filter((language) => language.pattern.test(text));
  const missing = asked.filter((language) => !language.pattern.test(stack));
  if (asked.length > 0 && missing.length === asked.length) {
    flags.push({
      id: 'stack',
      severity: 'C',
      label: `None of the posting's languages are on your resume: ${missing.map((l) => l.name).join(', ')}`,
    });
  } else if (missing.length > 0) {
    flags.push({
      id: 'stack',
      severity: 'B',
      label: `Partial stack match; not on your resume: ${missing.map((l) => l.name).join(', ')}`,
    });
  }

  const candidateCity = facts.location.split(',')[0]?.trim().toLowerCase() ?? '';
  const candidateInBay = BAY_AREA.includes(candidateCity);
  const lowerText = text.toLowerCase();
  const nearby = candidateInBay
    ? BAY_AREA.some((city) => new RegExp(`\\b${city}\\b`).test(lowerText))
    : Boolean(candidateCity) && lowerText.includes(candidateCity);
  if (ONSITE.test(text) && candidateCity && !nearby) {
    flags.push({
      id: 'location',
      severity: 'B',
      label: `Onsite or hybrid, and no location near ${candidateInBay ? 'the Bay Area' : facts.location} found`,
      evidence: evidenceFor(text, ONSITE),
    });
  }

  const tier: FitTier = flags.some((flag) => flag.severity === 'C')
    ? 'C'
    : flags.length > 0
      ? 'B'
      : 'A';
  return { tier, flags, facts };
};
