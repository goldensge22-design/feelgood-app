# Studio language selector and display-only demo localization

## Scope and boundaries

This section documents the Replit implementation before its reviewed source snapshot was selectively imported into the Studio GitHub candidate branch. See `../../docs/STUDIO_I18N_HANDOFF_2026-10-22.md` for the subsequent GitHub handoff and local revalidation.
Official/legacy/result/D-CAS source and server contracts were not edited.

- Moved the existing `select-language` control and `studio.locale` action from Settings to the header. One selector, all 15 options, including fresh setup.
- On mobile the selector occupies the first row on the physical right; the brand/title follow below. Existing bottom navigation is retained.
- Added `src/studio/i18n/demo-resources.ts`: 14 display keys × 15 locales. Foreign-language additions are **AI drafts, not human reviewed**. No human-review status is implied by automated QA.
- Existing 1,138-key locale packs, 20-key daily-note extension and translation status files are unchanged.
- Studio-only notices use existing translated storage/result-connection disclosure keys plus the additive demo copy. Real personal data/results prohibition, fictional scores, no authentication/server/sync, browser persistence and plaintext backup notices remain visible in the selected language.
- D-CAS names are translated only for exact built-in synthetic names with an external synthetic source identifier. Unknown/original names are returned verbatim.

## Data protection

Display-only sample-card localization is gated by synthetic-source provenance, matching initial-plan timestamp, unchanged initial history, and exact built-in title/subject values. A same-title user task, reused/copied task, edited fixture or general Studio record is not automatically translated. If a fixture has been edited, the conservative behavior is to show its stored text, not infer which words are still synthetic.

The edit inputs remain original stored strings. No migration, source reclassification or translation writeback occurs. Reports use a temporary copy for linked sample display; it is never committed, backed up, or passed to edit forms. Locale selection uses the existing persistence path and does not reset navigation, form state, records or timer phases.

## Actual automated checks

The original Replit run log was generated outside this Git checkout. A report copy is committed at `handoff/studio-i18n-qa/REPLIT_MATRIX_REPORT.md`; local validation is reproducible with `tools/nuvia-studio/run-demo-locale-check.mjs`.

| Check | Actual result |
|---|---|
| New demo/display/provenance checks | 976 passed |
| Existing base resources | 1,138 keys × 15 locales passed |
| Existing note resources | 20 keys × 15 locales passed |
| Existing i18n checks | 439 passed |
| Studio core checks | 1,392 passed |
| Notification checks | 545 passed |
| Daily notes | 365 passed |
| External demo checks | 68 passed |
| Studio TypeScript | Passed |
| Vite build | Passed; existing chunk-size/nonmodule comparison-script warnings remain |
| Source boundary audit against local baseline | Zero existing locale-pack changes; zero tracked non-Studio artifact changes |

These do not claim that unrelated historic baseline test discrepancies were resolved.

## Actual browser QA

Detailed Replit-side report copy: `handoff/studio-i18n-qa/REPLIT_MATRIX_REPORT.md`. The original detailed JSON observations were not included in the source snapshot; the committed local browser script independently checks 120 locale/audience/width combinations.

15 locales × 4 route types × 2 viewports × 4 screens = **480/480 view checks passed**:

- Routes: ordinary Studio, school, university, enterprise.
- Screens: Now/default, Plan, Reflect, Report.
- Viewports: 1440×1000 desktop and 360×900 mobile.
- Each locale: **32 passed, 0 failed** (`ko,en,ja,zh-CN,zh-TW,mn,th,vi,ar,ru,km,es,fr,it,az`).
- Audience assessment labels: **45/45 passed** (school adolescent; university/enterprise adult).
- 120 route/locale/viewport header measurements: no document horizontal overflow, no selector/title overlap, mobile selector above the brand/title on the physical right.
- Notice/report language, sample title/subject, source storage preservation and ordinary user-text preservation checked.
- Additional browser scenarios: same-title user card, edited fixture, fresh setup, form input retained across locale change, running and paused timer retention, language/page retention after reload.

No missing-key or uncaught Studio exception was observed. Sandboxed report iframes still produce blocked-script diagnostics; sandbox security was not loosened. A pre-existing wording difference remains between the outer “Stopped” badge and the paused timer's correct “Paused”/Resume controls; no timer phase or data change was observed.

No physical iPhone/Safari, native-speaker review, real participant usability study or cognitive-effect validation was performed. The browser matrix is not a linguistic quality certification. Screenshot observation descriptions supplied by the tester may say “enterprise”; the visible Azerbaijani header captures actually show the school/adolescent example, so identify those captures by visible content.

## Preview

Use `/studio.html` for ordinary Studio and `/studio.html?demo=school`,
`/studio.html?demo=university`, `/studio.html?demo=enterprise` for separate synthetic spaces.
The preview is temporary and depends on the development server remaining available.
No new ZIP or GitHub synchronization is claimed in this change.
