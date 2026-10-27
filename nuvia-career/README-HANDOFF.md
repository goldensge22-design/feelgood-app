# FeelGood / NUVIA career app — developer handoff

## Snapshot identity

- Source repository intended by the owner: `goldensge22-design/feelgood-app`; this ZIP is arranged as the **additive `nuvia-career/` directory** for that repository. It is not a GitHub push and contains no `.git` history.
- Replit source snapshot branch: `main`; HEAD: `84774e18dbb63c1bf0d8cc92e4ce595674cd56ae` (2026-10-24T01:09:54Z; `Published your App`). The working tree was clean at packaging time, and `artifacts/nuvia-career/public-guide.ts` is present in that exact HEAD.
- No source modifications were made to create this ZIP. This package is a selected snapshot, not a new commit.
- The older 2026-10-23 `generated-artifacts/github/...` preparation clone was not reused or included.

## Included contents

- Complete NUVIA frontend and its React/Vite artifact configuration.
- Complete API server and its artifact configuration.
- Workspace-level shared source packages (`lib/`), root workspace manifests, `pnpm-lock.yaml`, TypeScript configs and `.npmrc`.
- Existing source translations, synthetic fixtures, schema definitions, and the additive career database schema **SQL definition** (not a database dump).
- Current NUVIA integration/runbook/QA handoff documents. `docs/nuvia-public-guide-handoff.md` is a historical note from before public access changed; the live check below supersedes its earlier private-visibility note.
- Selected latest public-guide QA logs and synthetic-only screenshots in `qa/public-guide/`.
- `PACKAGE-MANIFEST.json` lists every other ZIP entry with its size and SHA-256. It intentionally does not self-hash.

## Latest verified published state

Read-only live check: `2026-10-27T12:12:26.967Z`. Replit deployment metadata: deployed=`true`, build-success=`true`, visibility=`public`.

- Public URL: `https://heavenly-wilted-constants.replit.app`
- Anonymous GETs to the 15 `demo-info/<locale>.html` pages all returned HTTP 200 with localized HTML and a direct trial link (see `qa/public-guide/live-public-access.json`). The interactive `/demo?lang=ko` route returned HTTP 200 with the SPA shell and needs a normal browser to run JavaScript.
- Anonymous GETs to `/api/career/workspace` and `/api/career/versions` returned HTTP 401; server owner authentication was not disabled.
- `robots.txt` returned HTTP 200, allows `/demo-info/`, and disallows other crawler paths. robots is crawl guidance, not access control.
- The static page's useful content and links are present in HTML without needing the app bundle. The published edge adds a Replit analytics `<script>`; the JavaScript-disabled browser QA validates that scripts are not needed for the page content or native links.
- The read-only workspace snapshot remains commit `84774e18dbb63c1bf0d8cc92e4ce595674cd56ae`. This record confirms public endpoints responded at check time; the commit and publication lifecycle are separate.

## Reproduce the workspace build

Use Node.js 24 and pnpm in this directory:

```sh
pnpm install --frozen-lockfile
pnpm --filter @workspace/nuvia-career run typecheck
pnpm --filter @workspace/scripts run typecheck
PORT=24976 BASE_PATH=/ pnpm --filter @workspace/nuvia-career run build
````

Run the API using the existing Replit secret/environment flow. It requires `DATABASE_URL`, `CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`; never commit or paste credential values. The frontend uses its existing Clerk public-key configuration. No `.env` file is included. Do not apply the SQL schema to production without reviewing it.

## Snapshot exclusions

No `.env`/secret file, credential, personal account record, database dump, browser session/cookie, `.git`, `node_modules`, cache, build output, previous generated-artifacts directory, or GitHub push credential is included. The runbook and server checks use fictional examples only.

## Next handoff step

After downloading, review and add only this `nuvia-career/` folder to a new branch in the connected GitHub repository. Preserve the repository's existing files; inspect conflicts first. Verify the remote branch and commit before calling it saved. This archive itself does not claim GitHub storage.
