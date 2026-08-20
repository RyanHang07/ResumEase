import type { OrgContext } from '@/types/resume';

export type { OrgContext };

export const KNOWN_EMPLOYERS = [
  'google',
  'meta',
  'facebook',
  'amazon',
  'apple',
  'microsoft',
  'netflix',
  'nvidia',
  'openai',
  'stripe',
  'airbnb',
  'uber',
  'lyft',
  'salesforce',
  'oracle',
  'ibm',
  'intel',
  'adobe',
  'spotify',
  'twitter',
  'x',
  'linkedin',
  'snap',
  'tiktok',
  'bytedance',
  'tesla',
  'spacex',
  'nasa',
  'lockheed',
  'raytheon',
  'boeing',
  'cisco',
  'vmware',
  'databricks',
  'snowflake',
  'cloudflare',
  'vercel',
  'github',
  'gitlab',
  'atlassian',
  'dropbox',
  'box',
  'palantir',
  'robinhood',
  'coinbase',
  'doordash',
  'instacart',
  'shopify',
  'square',
  'block',
  'paypal',
  'visa',
  'mastercard',
  'jpmorgan',
  'goldman',
  'morgan stanley',
  'bloomberg',
  'capital one',
  'american express',
  'walmart',
  'target',
  'costco',
  'disney',
  'comcast',
  'att',
  'verizon',
  't-mobile',
  'samsung',
  'sony',
  'dell',
  'hp',
  'lenovo',
  'qualcomm',
  'broadcom',
  'amd',
  'figma',
  'notion',
  'slack',
  'zoom',
  'twilio',
  'datadog',
  'mongodb',
  'elastic',
  'hashicorp',
  'red hat',
  'canonical',
];

export const TUTORIAL_PROJECT_NAMES = [
  'todo',
  'todo app',
  'todos',
  'vibe',
  'trello clone',
  'netflix clone',
  'twitter clone',
  'instagram clone',
  'chat app',
  'weather app',
  'blog',
  'portfolio',
  'calculator',
  'tic tac toe',
  'snake',
  'hello world',
];

export const isKnownEmployer = (organization?: string): boolean => {
  const normalized = organization?.trim().toLowerCase() ?? '';
  if (!normalized) return false;

  return KNOWN_EMPLOYERS.some((name) => {
    if (normalized === name) return true;
    // Avoid short-token over-match ("x", "hp", "att").
    if (name.length < 4) return false;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(normalized);
  });
};

export const isTutorialProjectName = (title?: string): boolean => {
  const normalized = title?.trim().toLowerCase() ?? '';
  if (!normalized) return false;
  return TUTORIAL_PROJECT_NAMES.some((name) => {
    if (normalized === name) return true;
    // Whole-title or clear multi-word tutorial phrase only (avoid "blog" in "Weblog").
    if (name.length < 5) return false;
    return normalized === name || normalized.startsWith(`${name} `) || normalized.endsWith(` ${name}`);
  });
};

export const formatOrgContextLine = (context?: OrgContext): string => {
  if (!context) return '';
  const parts: string[] = [];
  if (context.descriptor?.trim()) parts.push(context.descriptor.trim());
  if (typeof context.engineerNumber === 'number') {
    parts.push(`${context.engineerNumber}${ordinalSuffix(context.engineerNumber)} engineer`);
  } else if (typeof context.teamSize === 'number') {
    parts.push(`team of ${context.teamSize}`);
  }
  if (context.scale?.trim()) parts.push(context.scale.trim());
  return parts.join(' · ');
};

const ordinalSuffix = (value: number): string => {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  switch (value % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};
