# Studio: optional private daily notes

## Scope and use

Working Studio preview only. No publishing, main merge/push, API/result contract change, or official/legacy/D-CAS changes.

- Now: a collapsed paper strip immediately below today's capacity shelf. The input appears only after “오늘 메모 남기기”.
- Reflect: “날짜별 오늘의 메모” opens the same date-keyed records, not copies. Today and dates with nonblank notes are selectable.
- One free-text note per local calendar date, up to 20,000 characters; one line or a blank note is allowed. Optional writing hints do not prefill or assess the note.
- Input changes synchronously validate and save through the existing browser store. The ordinary per-keystroke global save toast is suppressed for notes; a quiet local autosave explanation remains. Storage errors are surfaced and the current editor retains the unsaved text for retry by editing.
- No dialog, timer interruption, grading, task generation or automatic execution. The note is an ordinary flow section, not a floating overlay.
- Text direction is automatic for user content; controls retain the selected locale's direction.

## Privacy and explicit quotation

Daily notes are distinct from the thought inbox. They are not read by assessment, monthly statistics, monthly HTML exports, class/teacher sharing, or roadmap source collection. The note section is hidden when printing.

To quote, the user must expand the optional quote section, paste an exact excerpt from the note, and preview that excerpt. Text absent from the original cannot be previewed. A further explicit copy button copies only the previewed excerpt; the app sends nothing to a teacher, institution or external service. Sharing or pasting elsewhere remains a separate user action. There is no automatic roadmap import.

Browser storage is not authentication or encryption. Anyone with access to this browser profile may access its data. The personal JSON backup contains private notes in plaintext, just like other private records; keep it private. No login, server note storage or cross-device synchronization was added.

## Data compatibility / handoff

Optional `studio.dailyNotes` maps local ISO dates to `{text, updatedAt}`. Existing keys, workspace identities, records and other settings are not rewritten or reclassified. Existing Studio personal/workspace backup code includes the optional Studio field automatically. Old backups with no notes (including no Studio data) remain acceptable; restoration is still replacement of the declared scope after existing validation and confirmation, not a merge.

Malformed dates/text/timestamps fail validation before replacement, and existing workspace identity/checksum checks remain in force. Notes do not alter goal evidence, agreement denominators, runs or roadmap snapshots. Backup restore of an older snapshot can remove later notes as part of the explicit scope replacement; keep a current backup first.

New-resource module: `src/studio/i18n/note-resources.json`, 20 named keys × 15 locales. Korean source and 14 foreign AI drafts are separate from the unchanged 1,138-key existing dictionaries. Draft metadata is internal, not a claim of human review. The runtime merges the add-on resources without changing existing keys or legacy stored language values.

Changed areas: Studio note component/CSS, StudioPage placement, optional Studio schema/action/reducer, quiet save handling, locale runtime extension; dedicated note tests and additive resource validation. No external result/API contract changed.

For integration, compare against the developer's current branch and preserve local changes. Do not overwrite whole files or assume this Replit baseline equals the latest result-connected branch. On conflicts, stop. Before rollback export a current private backup: pre-feature code uses strict schemas and may reject records/backups that contain the new optional field. Prefer restoring a compatible source checkpoint and corresponding pre-change backup together; never silently strip private notes from live records.

## Automated verification

- Daily-note tests: 365 assertions passed, including one record per date, updates, invalid dates/length, record separation, report exclusion, all locale resources, personal/workspace backup round trips, old backups, tampering and wrong workspace rejection.
- Existing Studio core regression: 1,392 assertions passed.
- External demo regression: 68 checks passed.
- Existing locale action/report compatibility: 136 checks passed.
- Resource validator: existing 1,138 keys per locale unchanged; additive 20 keys × 15 validated for coverage, script, placeholders and markup. This is not linguistic human review.
- TypeScript and production build passed. Existing large-chunk and comparison-page non-module script warnings remain; no claim that historical unrelated four baseline discrepancies were resolved.
- Log files: `generated-artifacts/studio-daily-note/{unit,i18n,i18n-actions,typecheck,build}.log`.

## Actual browser verification

Interactive QA used fresh isolated development-preview contexts at 1,440px and 360px; only synthetic text/tasks were entered. Detailed browser log: `generated-artifacts/studio-daily-note/qa-result.md`.

Passed:

- Keyboard opening; one-line input and autosave; reload persistence; Reflect edits visible on Now with one date record, not a duplicate.
- English/Arabic/Khmer/Korean transitions retain note contents; Arabic RTL checked. No horizontal document overflow in checked desktop/mobile views; mobile toggle measured 315 × 48px.
- Actual personal JSON download/checksum, changed-note restore, older backup without notes accepted, original backup restored again after confirmation.
- Note sentinel absent from monthly preview and downloaded HTML and from the roadmap; print-media note section hidden.
- A real synthetic 10-minute run continued while editing the note, with same task, advancing timer and unchanged capacity/goal totals. No automatic task completion.
- Exact excerpt required for quotation: absent excerpt disabled; “public beta” preview excluded “private alpha”. Copy action displayed success.

Limits / remaining observations:

- Clipboard read-back timed out, so actual clipboard bytes were not independently verified; selection-only preview and copy-success UI were checked.
- No external-request monitor was attached. Source inspection shows no note request/send API; quotation uses only the Clipboard API.
- Browser language interaction covered four locales, not all fifteen. All fifteen resource sets and state/backup language actions passed automated checks. Foreign note translations are not human-reviewed.
- Existing report iframe sandbox blocked-script warnings remain. In the original note QA a pre-existing Khmer save toast remained after switching the page to Korean; the later final P2 fix now stores the toast key and renders it in the current locale. That fix passed 545 automated assertions including all 225 locale transitions; it did not alter any of the 15 locale dictionaries or note resources. No new note-related exception or horizontal overflow was observed in the original browser pass.
- Unrelated empty monthly share-download state was not resolved in this note QA; no new sharing service or roadmap generation was added.
- Historical unrelated four baseline test discrepancies were not rerun or declared resolved. No real student study or usability/effectiveness research was performed.

No app source changed after the browser pass. These are development checks, not publication or production verification.
