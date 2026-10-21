# Studio: Azerbaijani copy and Korean/Mongolian wrapping

## Change boundary

Development Studio preview only. No publishing, Git push/merge, main-branch operation, real result-service change or data migration was performed. Existing user records, assessment payloads, scores, timers, plans and daily notes retain their schema and storage keys.

- Azerbaijani's 1,138 base UI resources were corrected in 19 saved batches, retaining keys, named placeholders and document markup. They remain **AI drafts, not native-speaker reviewed**.
- The other 14 base locale dictionaries and all 20 × 15 daily-note resources remain byte-identical to the starting Git baseline. This includes Korean and Mongolian: their changes are presentation/layout, not replacement translations.
- Azerbaijani public Studio safety instructions and its report safety block are localized. Other locales' existing external-demo notice policy is preserved.
- Known demo-generated D-CAS youth/adult descriptors have display-only Azerbaijani/Mongolian equivalents. D-CAS itself, unknown/original assessment names, IDs, values, units, student text and stored payloads are not translated or rewritten.
- Printed reports localize known internal level, metric, response and draft-status enums at the display boundary.
- Korean uses `keep-all`, Mongolian uses normal word boundaries; emergency wrapping remains for an otherwise unbreakable token. Narrow ko/mn/az navigation uses two columns rather than squeezing four labels into one row. Korean/Mongolian printed documents receive corresponding word-wrap rules.

## Automated verification actually run

See `generated-artifacts/studio-az-wrap/final-checks.log` and `regression.log`.

| Check | Actual result |
|---|---|
| Base resources | 1,138 keys × 15 locales passed; named placeholders, HTML/CSS and existing script checks |
| Daily-note resources | 20 keys × 15 locales passed, unchanged AI-draft status |
| Expanded i18n suite | 439 assertions passed, including populated/empty monthly reports, previous-month comparisons, next-month drafts, original-name/data preservation, display enums and synthetic descriptors |
| Core Studio | 1,392 assertions passed |
| Current-language notices | 545 assertions passed |
| Daily notes | 365 assertions passed |
| External demo | 68 checks passed |
| TypeScript | passed |
| Production bundle build | passed; existing chunk-size/non-module comparison-script warnings remain |
| Protected source comparison | 206 tracked protected source files unchanged |

Resource validation now also checks emitted macro translation-key references and known Azerbaijani contamination markers. These structural checks are not linguistic or human review.

## Browser evidence

The actual browser report is `generated-artifacts/studio-az-wrap/QA_BROWSER.md`.
The test used isolated synthetic data and no authentication.

- az/ko/mn, 1440px and 360px: Plan, Now, Reflect, Report, Roadmap, Growth/Method, Settings and the daily-note input were visited.
- A synthetic task and note survived language switches and reload.
- A keyboard sample used Tab/Enter to navigate. This is not an exhaustive accessibility audit.
- Populated school-demo report and empty review report opened as real print documents. Comparison fixtures showed September 8/10 (80%) versus August 6/10 (60%), without treating the change as cognitive improvement.
- Actual browser-generated PDFs: `report-school-populated.pdf` and `report-review-empty.pdf` in the same generated QA directory. Native OS print-dialog testing was not performed.
- Initial QA found Mongolian navigation word splits and unlocalized report enums; these were corrected and rechecked. The final targeted browser addendum records the last narrow Azerbaijani navigation and Mongolian synthetic-label check.

## Report-key failure and remaining limits

No missing-translation-key crash was reproduced in the tested empty/populated/comparison/draft report paths. Emitted-key validation and richer report tests were added so an unextracted macro key fails validation before release. This does not claim a historical unspecified failure was reproduced or that every possible old imported record was tested.

- Report iframe sandbox “blocked script execution in about:srcdoc” console warnings remain. Report documents render; scripts were not enabled to suppress these security warnings.
- No native-speaker review, real-student study, cognitive-effect validation or real D-CAS/server integration was performed.
- The other 12 languages were not newly browser-reviewed for linguistic quality. Their resources were preserved.
- Historic unrelated four baseline-test mismatches were not resolved or represented as all passing by this change.
- Prior full-source ZIP files are historical snapshots; this request did not regenerate or silently replace them.

## Review

Open `/studio.html?demo=school`, `/studio.html?demo=university` or `/studio.html?demo=enterprise` on the running development preview. In Settings choose Azərbaycan dili, 한국어 or Монгол. The preview depends on its development workflow remaining running. Published URLs have not been updated.
