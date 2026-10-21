# Studio 15-locale source handoff

This is the complete runnable **review app**, not a replacement clone of the developer's official GitHub repository. No deployment, push or merge was performed.

## Run
- Tested Node **24.13.0**, pnpm **10.26.1**.
- Unzip into a NEW directory. Do not overwrite an existing repository or browser's storage.
- `pnpm install --frozen-lockfile`
- `PORT=3000 BASE_PATH=/ pnpm run build`
- `PORT=3000 BASE_PATH=/ pnpm run dev`
- Open `http://localhost:3000/studio.html`; isolated synthetic review: `/studio.html?review=1`.
- Other preserved entry points are included for comparison, not localized/replaced by this work.

## Architecture and coverage
- `src/studio/i18n/locales/{locale}.json`: stable content-hash keys, **1,138** keys per locale.
- `src/studio/i18n/catalogue.json`: extraction provenance. Historical unused keys are retained.
- `translation-status.json`: AI draft/key completeness, **NOT human-review certification**.
- `runtime.ts`: strict keyed lookup, named interpolation, label boundaries, raw student content, Intl helpers.
- `compiler.mjs` + the Studio-only plugin in `vite.config.ts`: source macros replace Korean UI literals/JSX text/attributes/templates at compile time. The original readable Korean literals remain in TS/TSX; the shipped Vite build uses extracted resources. **Keep the plugin when integrating**; copying only TSX files into a different compiler is not an equivalent i18n build.
- The macro is restricted to `/src/studio/`, excludes `/i18n/` and the existing task-copy adapter. It does not transform official/enhancement/personal/result/D-CAS sources.
- Imported legacy labels/errors are read-only extraction inputs and localized at Studio display boundaries.
- Template strings and primitive dynamic JSX sentences use named `value1`, `value2`, etc. The extractor also consolidates mixed text/primitive JSX groups so translations can reorder the placeholders and control spacing. Rich React elements remain React composition rather than being serialized into strings. **Do not mistake key completeness for professional linguistic certification.**
- Existing English task-entry wording is retained. No existing human-vetted official/legacy translation file was changed.

## Stored records and language compatibility
- The original `lab.language` four-value contract remains intact.
- Optional `studio.locale` supports ko/en/ja/zh-CN/zh-TW/mn/th/vi/ar/ru/km/es/fr/it/az. Missing preference reads the existing four-language value.
- Old four-language commands remain supported. New non-legacy locales do not insert unsupported values into `lab.language`.
- Scores, levels, support order, student-entered titles/scopes/notes/flags and canonical option values are not translated or reclassified.
- New locale choices persist in the existing browser state and personal backup's Studio section. Old backups without a Studio locale remain accepted; do not invent a historical missing preference.
- Missing translations fail explicitly, not silently to Korean. User-authored Korean content and native language names are intentionally not translated.
- Source reports are script-free. Preserve their iframe sandbox; never add `allow-scripts` merely to suppress a test/development instrumentation warning.

## Reproduce checks
- `node tools/nuvia-studio/validate-i18n.mjs`
- `node tools/nuvia-studio/run-i18n-check.mjs`
- `node tools/nuvia-studio/run-core.mjs --i18n`
- For the development browser matrix, set `REPLIT_DEV_DOMAIN` and run `node tools/nuvia-studio/i18n-browser.mjs` (Chromium and the existing CDP helper are required).
- Root build runs the review package's type check and Vite build. ZIP-specific root scripts/TS references target only this self-contained review workspace; dependencies/lockfile are preserved.

## Apply safely / restore
1. Start on a new developer branch with a clean checkout, code backup and personal record backup.
2. Local patch baseline: **b60f130a8818362b57621051ba58d8e5968deb61**. It is NOT a verified official remote integration baseline.
3. Run `python /path/to/handoff/verify_preconditions.py /path/to/target-repo`. If hashes or new paths conflict, **STOP**. No forced overwrite.
4. In the target repository run `git apply --check /path/to/handoff/CHANGES.patch`; review the diff before applying.
5. Retain Studio's Vite macro configuration, resources and locale schema together. Check the developer's latest source/result/server contract separately.
6. Repeat the validators, type/build and critical browser journeys on that branch before approval. Official result/server/auth integration remains disconnected and outside this change.
7. Restore code by reverting only the integration commit on the isolated branch; use `git apply --reverse --check` only against an otherwise unchanged applied patch. Restore records only through the existing validated same-workspace backup flow. Never clear localStorage to revert UI code.

## Package identification
`BUILD.json` names the baseline, snapshot HEAD and working-tree inclusion; `SHA256SUMS.json` identifies every packaged file. The ZIP includes sources, assets, lockfile, QA logs, per-locale results, screenshots, print samples, scoped patch and preconditions. It excludes node_modules, dist, .git, environment secrets and real user databases.
