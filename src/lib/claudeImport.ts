import { migrateResume } from '@/lib/migrations';
import { formatJsonApplyError } from '@/lib/jsonApplyError';
import {
  HASH_DATA_PREFIX,
  encodeResumeHash,
  hydrateResumeFromHashPayload,
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

/**
 * Accepts whatever Claude hands back: raw JSON, JSON inside a ``` fence,
 * a full app link, or a bare `#data=` fragment.
 */
export const parseResumeInput = (input: string): HashHydrateResult => {
  const text = input.trim();
  if (!text) return { ok: false, message: 'Nothing to load. Paste resume JSON or a link.' };

  const hashIndex = text.indexOf(HASH_DATA_PREFIX);
  if (hashIndex !== -1) {
    const payload = text.slice(hashIndex + HASH_DATA_PREFIX.length).split(/\s/)[0] ?? '';
    if (!payload) return { ok: false, message: 'The link has an empty #data= payload.' };
    return hydrateResumeFromHashPayload(payload);
  }

  const json = text.match(FENCED_BLOCK)?.[1]?.trim() ?? text;
  try {
    const resume = migrateResume(JSON.parse(json));
    return { ok: true, resume, serialized: resumeToEditorJson(resume) };
  } catch (err) {
    return { ok: false, message: formatJsonApplyError(err, json).message };
  }
};

export const buildResumeLink = (
  resume: Resume,
  { origin = APP_URL, downloadPdf = false }: { origin?: string; downloadPdf?: boolean } = {}
): string => {
  const minified = JSON.stringify(JSON.parse(resumeToEditorJson(resume)));
  const query = downloadPdf ? `?${DOWNLOAD_QUERY_KEY}=pdf` : '';
  return `${origin}/${query}${encodeResumeHash(minified)}`;
};

export const buildClaudeInstructions = (origin: string = APP_URL): string =>
  `ResumEase JSON contract (paste this to Claude along with the resume JSON)

Return the COMPLETE resume JSON, not a diff. Keep every field you were given.

Shape:
- schemaVersion: 2 (do not change)
- id: string (do not change)
- name: string, max ${RESUME_NAME_MAX_LENGTH} chars. Drives the PDF file name and the cloud save name.
  Format: First-Last_Company_Role, letters, digits, dashes, underscores. Example: Ryan-Hang_Acme_Software-Engineer
- header: { name, email, phone, location, linkedIn, github, website, blog, workAuthorization, iconMode }
- sections[]: ordered by "order"
  - type "standard": { id, sectionName, order, entries[] }
    entry: { id, role, organization, title, dates: { start: "YYYY-MM", end: "YYYY-MM" | "present" },
             techStack[], links[{ label: "repo"|"demo"|"paper"|"pr"|"other", url }], coursework[], bulletPoints[] }
  - type "skills": { id, sectionName, order, categories[{ id, categoryName, skills[] }] }
- jobTarget (optional): { company, role, jdText }
- lastModified: ISO date string

Rules:
- Never invent ids. Reuse existing ids; new items may use any unique string.
- Plain text only in bullets. No markdown, no LaTeX.
- The compiled PDF must fit on one page.

How to hand it back (either works):
1. A single \`\`\`json code block with the full resume. The user pastes it into the Claude tab.
2. A one-click link: minify the JSON, base64url-encode its UTF-8 bytes (no padding), then
   ${origin}/?download=pdf#data=<payload>
   Opening it loads the resume, compiles, and downloads <name>.pdf. Drop "?download=pdf" to only load.
`;
