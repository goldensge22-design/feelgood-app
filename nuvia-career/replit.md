# FeelGood / NUVIA Career

대학생·취업 준비생이 실제 경험을 정리하고 직접 자소서를 작성하는 독립 제품.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (binds managed `PORT`, currently 8080)
- `artifacts/nuvia-career: web` — managed workflow for the new career app
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
- Build: esbuild (ESM bundle with CommonJS dependency compatibility)

## Where things live

- `artifacts/nuvia-career` — new career app; not a replacement for D-CAS or NUVIA PLANNER
- `artifacts/api-server/src/routes/career.ts` — career API
- `artifacts/api-server/src/lib/career-store.ts` — owner-scoped persistence and immutable versions
- `lib/db/src/schema/career.ts` — additive career tables
- `lib/api-spec/openapi.yaml` — API contract
- `docs/nuvia-integration-contract.md` — missing external access and safety boundaries

## Architecture decisions

- Existing D-CAS and NUVIA PLANNER are separate products. A planner project reference is supplied in the integration contract; source/API/access and record return URLs are not. Do not invent their contracts or label local activities as remote planner saves.
- Preserve the result's complete four-axis profile and original job ranking. Do not calculate a new ranking from the strongest two axes or invent missing jobs.
- Existing identifiers, scoring scales, 81 types, IQ, sequential-processing names, locale IDs/aliases, planner priorities and deployed paths must be preserved when a real connector becomes available.
- Strengths guide activity strategies; they do not prove competence or predict hiring, psychological or clinical outcomes.
- DOCX and HWPX are real document packages. Keep file generation/machine read-back separate from native Word/Hancom visual compatibility. Display the native-opening limitation; never rename DOCX/HTML as HWPX or imply native validation has happened.
- Official NCS common competencies are pinned, publisher-verified snapshots, separate from authored activities and result-specific criteria. Preserve historical IDs/content when adding a later snapshot.

## Product

Results context → criteria → optional local small activities → confirmed experiences → company questions → direct writing with one coaching question → immutable versions → safe export.
The externally connected result-to-planner journey remains gated by real product access. Fictional examples are separated from personal account data.

## User preferences

- “반드시 플래너 결과지와uiux가 연결되도록 만들어줘야해.”
- “보강패치로 만드는거야. 기존의 기능은 그대로 유지해야해”
- “필굿의 모든 프로그램은 15개 언어를 기본으로 포함하는 기본 규칙을 잊지말고”
- 대학생·취업 준비생이 이번 대상이며 특성화고·마이스터고는 향후 별도 확장 대상.
- No public publishing was requested. Do not publish or suggest that the complete external integration is verified.
- Keep the editor student-controlled. The user has approved real managed-AI questions and optional sentence/paragraph candidates based only on selected, reviewed records. This supersedes the earlier ban on sentence suggestions. Never invent facts or automatically insert, rewrite or overwrite the body; application requires the student's explicit choice.
- Latest delivery priority: finish the new AI features in Korean first. Completion means Korean implementation → new QA including real model calls passes → latest source/patch saved on a GitHub work branch → remote commit compared with delivered files → Korean release delivered. Until all gates pass, do not call the Korean first delivery complete. Only then expand the new features to the other 14 languages. Preserve all existing 15-language functions, translations, and original user input; already-added draft translations are not removed or counted as first-delivery completion.
- The authoritative updated AI requirements and Korean acceptance gates are in `docs/nuvia-managed-ai-spec.md`. Earlier sentence-suggestion exclusions and multilingual-first plans do not override them. Real result/planner authentication and account-level permanent storage remain the separate developer's responsibility, not evidence supplied by synthetic QA.
- Preserve the existing GitHub handoff branch's rule documents. The user reports `codex/nuvia-career-handoff-20261027` at `f051942eef7487157c5ad1bfea6125f068bc0ae2` (rules/spec only), after old app commit `fc000de03071e6d4ae37eea5261975bcf589f749`. These are not proof that new AI implementation is remotely saved. Never overwrite main/other products, rewrite history, or claim a remote push without checking it.
- Original user writing, questions and private notes are never automatically translated when UI locale changes.
- Keep translation review/coverage and development QA status internal, not in normal user screens. Preserve warnings that explain actual data/source/privacy limits.

## Gotchas

- Run OpenAPI codegen after contract changes. React Query generation is explicitly v5; the client TypeScript lib includes DOM.Iterable for generated Headers.entries.
- Server persistence unit/integration checks: `./scripts/node_modules/.bin/tsx --test artifacts/api-server/src/lib/career.test.ts artifacts/api-server/src/lib/career-store.test.ts`
- Tests use synthetic owners and remove only their own fixtures. Never bypass authentication to screenshot private pages.
- Document and browser verification output is ignored under `/generated-artifacts/`. Structural opening is not proof of visual opening in Word/Hancom.
- Translation key coverage does not equal translation review or device coverage. Report verified and unverified ranges separately.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- Current real-AI scope, privacy rules, storage boundary and handoff: `docs/nuvia-managed-ai-handoff.md`. Earlier fixed-coach QA is not evidence for this feature.
- Final AI specification, user priority and delivery gate: `docs/nuvia-managed-ai-spec.md`.
