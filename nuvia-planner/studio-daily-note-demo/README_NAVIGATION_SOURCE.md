# NUVIA Studio — 15-locale navigation source snapshot

## Source identity
- Source Git HEAD (baseline, not necessarily final commit): `63a6d19b136eb098d483ae3ad00c9be4fbd1b1dd`
- Current working-tree source snapshot SHA-256: `e284ece0a53137c52992687525fc3b6ffd1c8a60265fa04f7d738ec5c28f1d26`
- Exact per-file hashes and differences from HEAD: SOURCE_MANIFEST.json.
- Includes the current Azerbaijani correction, ko/mn wrapping, daily note and this all-locale navigation fix.
- No commit, branch merge, push, publication or deployment was performed by this packaging tool.

## Scope and data protection
Current artifacts/, lib/, scripts/, tools/, docs/, .github/ (if present), root package/lock/workspace/TypeScript/Replit configuration and source assets are included. Official/legacy/result-related and other application source dependencies are copies, not modified by this navigation change.
Synthetic fixtures embedded in source are included. Existing locale JSON values and daily-note translations are unchanged from the stated HEAD. Translations retain their AI-draft/native-review limitations.
Excluded: .git, .agents, .local, secrets/.env, credentials/private keys, personal uploads/DB/storage/session/user backups, node_modules, dist/build outputs/caches, generated-artifacts, screenshots and attached originals.
Only the explicitly selected synthetic navigation QA files are attached under handoff/navigation-qa/. Known credential patterns are rejected, not printed; this is not a substitute for external security review.
The previous NUVIA_STUDIO_DAILY_NOTE_FINAL.zip is not overwritten or updated.

## Reproduce
Extract into a NEW empty directory, not over an operating product.
Use the repository's Node/pnpm configuration:
```
pnpm install --frozen-lockfile
pnpm run typecheck:libs
PORT=24422 BASE_PATH=/ pnpm --filter @workspace/nuvia-ui-review dev
```
Open http://localhost:24422/studio.html?demo=school (or university/enterprise).
Studio itself uses browser storage; no actual result server, login or device sync is provided.
```
node tools/nuvia-studio/validate-i18n.mjs
node tools/nuvia-studio/run-i18n-check.mjs
node tools/nuvia-studio/run-core.mjs --i18n
node tools/nuvia-studio/run-notice-check.mjs
node tools/nuvia-studio/run-daily-note-check.mjs
node tools/nuvia-studio/run-external-demo-check.mjs
pnpm --filter @workspace/nuvia-ui-review typecheck
PORT=24422 BASE_PATH=/ pnpm --filter @workspace/nuvia-ui-review build
```

## QA and limitations
Actual commands/results and per-locale browser matrix are attached, not inferred. See docs/STUDIO_NAVIGATION_15LOCALES.md and handoff/navigation-qa/.
Physical iPhone/Safari is distinct from a desktop browser viewport test. Existing report sandbox warnings, bundle-size/comparison-script warnings, historic unrelated baseline mismatches and lack of native-language review are not declared resolved.
No claim of actual student research, efficacy, real result-service integration or full operating-system compatibility is made.

## GitHub handoff / rollback
Import into a separate working branch. Compare against the developer's current integration baseline first; stop on conflicts rather than force-overwriting. Do not replace official result contracts or reset browser records.
This navigation fix is CSS-only in artifacts/nuvia-ui-review/src/studio/studio.css. To undo just this fix, restore that file's prior navigation rules from the stated baseline after reviewing any later changes; no data migration or record reset is needed.
The ZIP is a source snapshot, not Git history and not proof of a GitHub remote commit. SOURCE_MANIFEST records any uncommitted additions. Keep personal JSON backups outside the public repository.
