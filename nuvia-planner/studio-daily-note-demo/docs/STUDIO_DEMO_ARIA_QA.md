# Studio synthetic task accessibility localization

## Fix

The edit summary previously interpolated the stored Korean fixture title into an otherwise localized template. Tone-button templates likewise interpolated canonical Korean tone names. The same raw-title issue existed in Plan move controls.

Changed Studio rendering only:

- `src/studio/i18n/demo-copy.ts`: a shared attribute-label builder uses the existing display-only fixture title/provenance guard and existing edit, tag-color and move keys. Canonical tone labels are localized before insertion as named placeholder values.
- `src/studio/CardDetail.tsx`: edit summary uses the shared localized name.
- `src/studio/StudioPage.tsx`: tone-group/buttons and Plan move buttons use the shared localized names.
- `tools/nuvia-studio/demo-locale-check.ts`: added exact accessible-name, foreign Hangul, tone-key reuse and authored-title preservation checks.

No locale resource values, input values, stored title/subject, persistence schema, server contracts, official/result/D-CAS files or public deployment were changed. Synthetic display localization remains conservative: authored/copied/edited records are not translated on the basis of matching words alone.

## Automated verification

Executed for this change:

- Demo/display checks: **1,606 passed** (including 630 added assertions).
- Existing i18n checks: **439 passed**.
- Base resource validator: **1,138 keys × 15 locales passed**.
- Existing daily-note extension: **20 keys × 15 locales passed**.
- Studio TypeScript: passed.
- Vite build: passed. Existing chunk-size and nonmodule comparison-script warnings remain.

The original Replit run log was outside this Git checkout. A report copy is committed at `handoff/studio-i18n-qa/REPLIT_ARIA_REPORT.md`; local static validation is reproducible with `tools/nuvia-studio/run-demo-locale-check.mjs`.
The prior broader core test suite and 480-screen matrix were not rerun for this attribute-only change.

## Actual browser verification

Detailed Replit-side tester report copy: `handoff/studio-i18n-qa/REPLIT_ARIA_REPORT.md`.
The tester did not edit app sources; the rendering fixes above were implemented before that browser pass.

All 14 foreign locales were checked: `en,ja,zh-CN,zh-TW,mn,th,vi,ar,ru,km,es,fr,it,az`.

| Coverage | Result |
|---|---|
| 14 locales × 3 audiences × desktop/360px × selected/paused desk | **168/168 passed** |
| Selected shelf contexts | 84 passed |
| Desk after explicit start → pause | 84 passed |
| Plan move-up/down names, school mobile | 14 locale rows passed |
| Same-title authored Korean task, English and Azerbaijani | Original title retained in accessible names |
| Raw synthetic title/tone or other Hangul attribute leakage | 0 findings |
| Storage title/subject mutation | 0 findings |
| Paused-phase loss from locale changes | 0 findings |
| Document horizontal overflow | 0 findings |

The audit inspected `aria-label`, `title` and `placeholder` under selected/desk contexts, including collapsed descendants. Conditional archive fields were exposed without saving. Attribute absence is recorded as absence in JSON, not as a translated value. Edit input values intentionally remain canonical and were not saved.

The underlying `selected-*.json`, `desk-*.json`, `plan-school-mobile.json`, `authored-korean.json` and `matrix-summary.json` were not included in the Replit source snapshot. Treat this as a tester report, not independently archived raw evidence.
The initial collector lookup typo was corrected and rechecked; it was not an app defect.

## Limits

No physical iPhone/Safari or native-speaker validation was performed. Existing foreign-language copy is not reclassified as human reviewed. Some 360px desk controls wrap tightly, but measured horizontal overflow was zero; CSS/layout was not changed in this fix. User-authored Korean remaining in accessibility names is intentional, not a localization failure.

No GitHub access, merge, push, or public republication was performed.
