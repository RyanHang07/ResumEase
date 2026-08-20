import type { Resume, StandardSection } from '@/types/resume';
import { normalizeSectionName } from '@/lib/templates/shared';
import { collectResumePlainText } from '@/lib/skillCoverage';

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'our',
  'that',
  'the',
  'to',
  'we',
  'will',
  'with',
  'you',
  'your',
  'this',
  'their',
  'they',
  'have',
  'has',
  'can',
  'must',
  'should',
  'able',
  'work',
  'team',
  'role',
  'job',
  'intern',
  'internship',
  'experience',
  'years',
  'using',
  'etc',
]);

/** Curated Taleo-style near-misses. JD token → resume tokens that count as a hit. */
const JD_SYNONYMS: Record<string, string[]> = {
  rest: ['rest', 'restful', 'trpc', 'graphql', 'http'],
  restful: ['rest', 'restful', 'trpc', 'graphql'],
  api: ['api', 'apis', 'trpc', 'graphql', 'rest'],
  apis: ['api', 'apis', 'trpc', 'graphql', 'rest'],
  kubernetes: ['kubernetes', 'k8s'],
  k8s: ['kubernetes', 'k8s'],
  javascript: ['javascript', 'js', 'typescript', 'node'],
  typescript: ['typescript', 'ts', 'javascript'],
  react: ['react', 'reactjs', 'next', 'nextjs'],
  nextjs: ['next', 'nextjs', 'react'],
  node: ['node', 'nodejs', 'javascript', 'typescript'],
  postgres: ['postgres', 'postgresql', 'sql'],
  postgresql: ['postgres', 'postgresql', 'sql'],
  aws: ['aws', 'amazon', 's3', 'ec2', 'lambda'],
  cicd: ['ci', 'cd', 'cicd', 'github', 'actions'],
  ml: ['ml', 'machine', 'learning', 'pytorch', 'tensorflow'],
};

const tokenPresent = (haystack: string, token: string): boolean => {
  const candidates = JD_SYNONYMS[token] ?? [token];
  return candidates.some((candidate) => haystack.includes(candidate));
};

export interface JdKeywordHit {
  token: string;
  inSkills: boolean;
  inBullets: boolean;
  inHeader: boolean;
}

export interface JdGapAnalysis {
  tokens: string[];
  misses: string[];
  hits: JdKeywordHit[];
  coverageBySection: {
    skillsOnly: number;
    bullets: number;
    missing: number;
  };
}

const tokenize = (text: string): string[] => {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return [...new Set(raw)].slice(0, 80);
};

const sectionBulletText = (resume: Resume, canonical: string): string => {
  return resume.sections
    .filter((section): section is StandardSection => section.type === 'standard')
    .filter((section) => normalizeSectionName(section.sectionName) === canonical)
    .flatMap((section) => section.entries.flatMap((entry) => entry.bulletPoints))
    .join('\n')
    .toLowerCase();
};

const skillsText = (resume: Resume): string => {
  return resume.sections
    .filter((section) => section.type === 'skills')
    .flatMap((section) => section.categories.flatMap((category) => category.skills))
    .join('\n')
    .toLowerCase();
};

export const analyzeJdGap = (resume: Resume, jdText: string): JdGapAnalysis => {
  const tokens = tokenize(jdText);
  if (tokens.length === 0) {
    return {
      tokens: [],
      misses: [],
      hits: [],
      coverageBySection: { skillsOnly: 0, bullets: 0, missing: 0 },
    };
  }

  const resumeText = collectResumePlainText(resume);
  const skills = skillsText(resume);
  const bullets = [
    sectionBulletText(resume, 'experience'),
    sectionBulletText(resume, 'projects'),
    sectionBulletText(resume, 'education'),
  ].join('\n');
  const header = [
    resume.header.name,
    resume.header.github,
    resume.header.website,
    resume.header.blog,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase();

  const hits: JdKeywordHit[] = [];
  const misses: string[] = [];
  let skillsOnly = 0;
  let inBulletsCount = 0;
  let missing = 0;

  for (const token of tokens) {
    const present = tokenPresent(resumeText, token);
    if (!present) {
      misses.push(token);
      missing += 1;
      continue;
    }

    const inSkills = tokenPresent(skills, token);
    const inBullet = tokenPresent(bullets, token);
    const inHeader = tokenPresent(header, token);
    hits.push({ token, inSkills, inBullets: inBullet, inHeader });
    if (inBullet) inBulletsCount += 1;
    else if (inSkills) skillsOnly += 1;
  }

  return {
    tokens,
    misses,
    hits,
    coverageBySection: {
      skillsOnly,
      bullets: inBulletsCount,
      missing,
    },
  };
};
