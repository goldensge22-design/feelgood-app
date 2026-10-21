# Daily-note Studio final source / notification i18n fix

## Change boundary

Studio `store.ts` now holds transient notices as keys and renders them against the current selected locale. `notices.ts` also normalizes recognized existing static translated system messages to their resource keys. Unknown diagnostic strings remain diagnostics; this resolver is not for student-authored text.

This prevents a locale-change save action from retaining the previous locale's already translated sentence. The rendering locale is explicit, independent of the ambient translator's locale during the action callback. The notice is not written to backups or browser records. Closing it clears only the notice.

No memo/timer/plan migration, reset, result/API contract change, new translation, merge/push or publishing was performed. The existing 15 dictionaries (1,138 keys each) and daily-note extension (20 keys × 15) are byte-identical to the source baseline; foreign AI drafts remain unreviewed by humans. Official/legacy/result-related and other app source are copied unchanged in the full project archive, not modified.

## Verification actually executed

- Notifications: 545 assertions, including every 15×15 transition, az→ko, key rendering, notes and active-run/plan preservation, backup.
- Daily notes: 365 assertions.
- Existing locale/state/report/backup tests: 136 checks.
- Studio core: 1,392 assertions.
- External demo: 68 checks.
- Locale resource validator: all 15 passed, plus the daily-note extension.
- Studio TypeScript and Vite production build passed.

Logs are under `generated-artifacts/studio-notice-final/` and selected automated stdout is copied into the ZIP under `handoff/qa/`.

The notification fix is checked by focused automated regression and development preview, not by a new 15-locale interactive browser pass. Earlier note browser QA is documented separately. Known report sandbox warnings, large-bundle/comparison-script build warnings and historical unrelated baseline test discrepancies are not declared fixed. No actual student research or production/server verification is claimed.

## Archive

Run `python3 tools/nuvia-studio/package-daily-note-final.py` after the documented checks. Output:

`generated-artifacts/nuvia-studio/NUVIA_STUDIO_DAILY_NOTE_FINAL.zip`

The archive contains current full project source and original workspace configuration, not a Studio-only subset or a replacement package.json. Its generated `README_NUVIA_STUDIO_DAILY_NOTE_FINAL.md` states source Git HEAD, working-tree differences, payload fingerprint, include/exclude policy, commands and rollback limits. `SOURCE_MANIFEST.json` records file-level checksums. The adjacent `.sha256` checks the archive itself. Git history, personal data, secrets, node_modules, generated build/cache outputs, attachments and previous ZIPs are excluded.

The source Git HEAD is a baseline reference if uncommitted fixes are present. Do not call it a commit of all final archive changes; use the manifest's snapshot fingerprint to identify the delivered payload precisely. No latest-developer-branch/result-server integration compatibility is guaranteed. Preserve on a separate branch, inspect conflicts and stop rather than overwrite existing production files.
