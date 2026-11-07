# MY NUVIA — 독립 가족용 기능 검토본

FeelGood 운영 서비스와 분리하여 가상 계정·가상 활동만으로 플래너, 히스토리, AI 자소서의 연결을 검토하는 앱입니다.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — API command; start through its managed artifact workflow, which injects PORT
- `pnpm --filter @workspace/my-nuvia run dev` — managed MY NUVIA frontend workflow
- `node scripts/src/nuvia-api-check.mjs` — independent review API integration checks; creates labeled fictional review records, never production data
- `node scripts/src/nuvia-browser-<suite>.mjs` — actual Chromium browser checks (planner, history-story, recovery, accessibility, edge, locales); generated JSON/screenshots in ignored `generated-artifacts/nuvia-browser/`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Frontend: `artifacts/my-nuvia/src/`
- Contract: `lib/api-spec/openapi.yaml`
- Independent review tables: `lib/db/src/schema/nuvia.ts`
- Session/permission boundary: `artifacts/api-server/src/lib/nuvia-access.ts`
- Transactional state, actor-private data, idempotency: `artifacts/api-server/src/lib/nuvia-workspace.ts`
- Developer handoff: `docs/MY-NUVIA-HANDOFF.md`
- Browser evidence: `docs/MY-NUVIA-BROWSER-EVIDENCE.md`

## Architecture decisions

- Explicitly fictional account entry is a review harness, not real authentication. Do not reuse it for production; replace with verified FeelGood session and relationship claims after source access.
- Independent review database is authoritative for activity progress across sessions; browser drafts are only temporary recovery, not cross-device synchronization.
- Never connect actual student identifiers, scores, reports, auth tokens, or production records in this review.

## Product

General family space has only three programs: 플래너, 히스토리, AI 자소서. Teacher space is separate and read-only, restricted to assigned subjects' explicitly shared activity records. No live AI service is connected; help and story generation are labeled fixed guidance/sentence templates.

## User preferences

- Do not modify existing FeelGood app, production deployment, or public URLs. Do not automatically publish.
- Mobile-first, usable on tablets and PCs.
- Role comparison is allowed only in the dedicated review space using fictional accounts.

## Gotchas

- A server/API integration check is not proof of browser behavior, physical-device synchronization, or an operational FeelGood patch.
- Never mark unexecuted checks or production integrations complete.
- Translation structural validity does not prove native-speaker linguistic review.
- Do not expand representative-language or limited-UI passes into “all 15-language QA complete.” Record actual language × viewport × role execution and distinguish remaining human/device review.
- Automation accounts/records must use isolated `qa-*` review datasets, never the normal visitor dataset. Preserve old records and original user text; legacy data must not be deleted or translated to clean a preview.
- Keep the language selector physically at the upper right even for Arabic; retain RTL for the document/body.
- Expanded multilingual QA evidence and reproduction: `docs/MY-NUVIA-FULL-QA.md`. Human/native/device review is not implied by automated passes.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
