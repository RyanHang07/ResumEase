import { migrateResume } from '@/lib/migrations';
import { formatJsonApplyError } from '@/lib/jsonApplyError';
import {
  HASH_DATA_PREFIX,
  HASH_ZIP_PREFIX,
  encodeResumeHash,
  encodeResumeHashCompressed,
  hydrateResumeFromFragment,
  parseHashFragment,
  resumeToEditorJson,
  type HashHydrateResult,
} from '@/lib/hashResume';
import { RESUME_NAME_MAX_LENGTH, type Resume } from '@/types/resume';

export const APP_URL = 'https://resum-ease.vercel.app';
export const DOWNLOAD_QUERY_KEY = 'download';

export const hasDownloadPdfFlag = (search: string): boolean =>
  new URLSearchParams(search).get(DOWNLOAD_QUERY_KEY) === 'pdf';

/** Returns `search` without the download flag ("" or "?a=b"), for history.replaceState. */
export const stripDownloadFlag = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete(DOWNLOAD_QUERY_KEY);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
};

const FENCED_BLOCK = /```(?:json)?\s*([\s\S]*?)```/i;
const LINK_FRAGMENT = new RegExp(`(?:${HASH_DATA_PREFIX}|${HASH_ZIP_PREFIX})\\S*`);

/**
 * Accepts whatever Claude hands back: raw JSON, JSON inside a ``` fence,
 * a full app link, or a bare `#data=` / `#z=` fragment.
 */
export const parseResumeInput = async (input: string): Promise<HashHydrateResult> => {
  const text = input.trim();
  if (!text) return { ok: false, message: 'Nothing to load. Paste resume JSON or a link.' };

  const fragmentText = text.match(LINK_FRAGMENT)?.[0];
  if (fragmentText) {
    const fragment = parseHashFragment(fragmentText);
    if (fragment.kind !== 'payload') return { ok: false, message: 'The link has an empty payload.' };
    return hydrateResumeFromFragment(fragment);
  }

  const json = text.match(FENCED_BLOCK)?.[1]?.trim() ?? text;
  try {
    const resume = migrateResume(JSON.parse(json));
    return { ok: true, resume, serialized: resumeToEditorJson(resume) };
  } catch (err) {
    return { ok: false, message: formatJsonApplyError(err, json).message };
  }
};

/** Builds a one-click link. Compressed `#z=` by default; `#data=` stays readable for debugging. */
export const buildResumeLink = async (
  resume: Resume,
  {
    origin = APP_URL,
    downloadPdf = false,
    compress = true,
  }: { origin?: string; downloadPdf?: boolean; compress?: boolean } = {}
): Promise<string> => {
  const minified = JSON.stringify(JSON.parse(resumeToEditorJson(resume)));
  const query = downloadPdf ? `?${DOWNLOAD_QUERY_KEY}=pdf` : '';
  const fragment = compress ? await encodeResumeHashCompressed(minified) : encodeResumeHash(minified);
  return `${origin}/${query}${fragment}`;
};

export const buildClaudeInstructions = (origin: string = APP_URL): string =>
  `ResumEase JSON contract (paste this to Claude along with the resume JSON)

Return the COMPLETE resume JSON, not a diff. Keep every field you were given.

Shape:
- schemaVersion: 2 (do not change)
- id: string (do not change)
- name: string, max ${RESUME_NAME_MAX_LENGTH} chars. Drives the PDF file name and the cloud save name.
  Format: First-Last_Company_Role, letters, digits, dashes, underscores. Example: Ryan-Hang_Acme_Software-Engineer
- templateId: "classic" | "compact" | "academic" | "dense". The PDF layout. Keep the base's value; missing means "compact".
- header: { name, email, phone, location, linkedIn, github, website, blog, workAuthorization, iconMode }
- sections[]: ordered by "order"
  - type "standard": { id, sectionName, order, entries[] }
    entry: { id, role, organization, title, dates: { start: "YYYY-MM", end: "YYYY-MM" | "present" },
             techStack[], links[{ label: "repo"|"demo"|"paper"|"pr"|"other", url }], coursework[], bulletPoints[] }
  - type "skills": { id, sectionName, order, categories[{ id, categoryName, skills[] }] }
- jobTarget: { company, role, jdText }. Set these to the posting (jdText = the posting's plain text)
  so the app can grade fit and name the file.
- lastModified: ISO date string

Rules:
- Never invent ids. Reuse existing ids; new items may use any unique string.
- Plain text only in bullets. No markdown, no LaTeX.
- The compiled PDF must fit on one page.
- If the user pinned a base resume, the app checks your JSON against it: header, ids, dates, titles,
  orgs, links, and section/entry order unchanged; same bullet count per entry; bullets may be reordered
  and rewritten as long as no bullet outgrows the base bullet it pairs with (lengths compared longest
  to longest); every metric kept somewhere in the same entry and no new numbers; skills and techStack
  only added (5 skills max), with skills free to move between or reorder within categories; no em dashes.

How to hand it back (either works):
1. A single \`\`\`json code block with the full resume. The user pastes it into the Claude tab.
2. A one-click link (preferred, about 55% shorter): raw DEFLATE the minified UTF-8 JSON,
   base64url-encode it (no padding), then
   ${origin}/?download=pdf#z=<payload>
     import base64, json, zlib
     raw = json.dumps(resume, separators=(",", ":"), ensure_ascii=False).encode()
     c = zlib.compressobj(9, zlib.DEFLATED, -15)
     payload = base64.urlsafe_b64encode(c.compress(raw) + c.flush()).decode().rstrip("=")
   Opening it loads the resume, compiles, and downloads <name>.pdf. Drop "?download=pdf" to only load.
   The older uncompressed form ${origin}/?download=pdf#data=<base64url(json)> still works.
`;
