# Contributing

Thanks for helping ResumEase stay parse-first and honest.

## Ground rules

- Prefer writable fixes into resume JSON over advisory-only tips.
- Do not invent bullets, URLs, employer descriptors, or open-source claims.
- No LLM rewrite features in v2 scope.
- Keep `docs/v2/README.md` current; append locked choices to `docs/v2/decisions.md`; record behavior deltas in `docs/v2/changelog.md`.

## Setup

1. `npm install`
2. Configure Clerk + Vercel Blob env vars if you need cloud saves
3. `npm run dev` and `npm test`

## Pull requests

- Small, focused diffs
- Add or update Vitest coverage for lib changes
- Update `docs/v2/README.md` if behavior changes; append a decisions line and a changelog row
