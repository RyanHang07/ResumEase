# ResumEase

Parse-first resume editor for software internship applications. Edit structured JSON, compile ATS-safer LaTeX/PDF, and get a checklist of flaws you can write back into the resume — including JD keyword gaps and a structured cover letter (no LLM inventing claims).

[![CI](https://github.com/RyanHang07/ResumEase/actions/workflows/ci.yml/badge.svg)](https://github.com/RyanHang07/ResumEase/actions/workflows/ci.yml)

## Features

- Schema v2 resume model with migration from v1
- Server-side LaTeX compile from `{ resume, templateId }` only (no client `latexCode`)
- Parse readiness score, checklist, PDF round-trip extract checks
- Evidence checks: project links, unbacked skills, tutorial names, optional link verify
- Target job: literal JD keyword gap + duplicate tailored cloud save (max 5)
- Structured cover letter from selected resume entries (no LLM)
- ATS parser lenses (Workday, Taleo, Lever, iCIMS, SuccessFactors, Greenhouse)
- Templates: Classic, Compact, Academic

## Run locally

```bash
npm install
cp .env.example .env.local   # Clerk + Blob; preview works without them
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment

See [`.env.example`](.env.example). Brief:
| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk browser key |
| `CLERK_SECRET_KEY` | Clerk server key (cloud saves) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob for signed-in saves |

Anonymous PDF preview works without Clerk. Saving tailored copies requires auth + Blob.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest |

## Architecture (short)

Client holds the resume in Zustand (no silent localStorage). Templates generate LaTeX server-side in `/api/compile`. Parse analysis runs in the browser against the JSON (and optional PDF text extract). Cloud resumes live in private Vercel Blob under the Clerk user id.

## Docs

Product SoT: [`docs/v2/README.md`](docs/v2/README.md). Before/after: [`docs/v2/changelog.md`](docs/v2/changelog.md). Decisions: [`docs/v2/decisions.md`](docs/v2/decisions.md).

## License

MIT — see [`LICENSE`](LICENSE).
