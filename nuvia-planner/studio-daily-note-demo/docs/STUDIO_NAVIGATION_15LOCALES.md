# Studio — all-locale bottom-navigation correction

## Implementation boundary

App code change: `artifacts/nuvia-ui-review/src/studio/studio.css` only.

The old narrow layout gave most locales four columns while ko/mn/az alone had two. Settings/backup is also used as the active “More” label, so testing only the initial tabs missed the longest text.

The mobile layout now provides two rows for **all 15 locales**: Now/Plan share the first row equally; Review/More use 35%/65% of the second row so the active Settings/backup label has sufficient width. It uses normal word-boundary wrapping without automatic hyphenation or emergency intra-word splits, at least 44px button targets, and bottom content space including the iPhone safe-area inset. Buttons are not height-clamped, text-truncated or rendered in a smaller font to hide the problem. The Arabic mobile dropdown is aligned to its viewport edge rather than overflowing on its inline end.

Existing ko/mn/az corrections, all translations, record schemas, localStorage keys, timers, assessment contracts and application behavior are unchanged. No new navigation text was introduced. Official/legacy/result/D-CAS source, main merge/push and public deployment are out of scope and were not performed.

## Actual verification

- `generated-artifacts/studio-nav-15/automatic.log`: resource validation 1,138 × 15 plus daily note 20 × 15; i18n 439, core 1,392, notices 545, daily note 365, external demo 68 assertions/checks; Studio TypeScript and Vite build passed.
- `generated-artifacts/studio-nav-15/QA_BROWSER.md`: actual browser findings, screenshots and limitations.
- `generated-artifacts/studio-nav-15/matrix.json`: per-locale/per-viewport/per-page measurements. The browser report, not a claim based only on this CSS, determines the measured label heights, overflow and page coverage.
- Locale set: ko, en, ja, zh-CN, zh-TW, mn, th, vi, ar, ru, km, es, fr, it, az.

### Final measured navigation

After the initial 15-locale × 7-view × 2-viewport pass, the second-row width was refined to reduce Russian's remaining three lines. The final targeted pass checked all 15 locales at 360px plus RU/FR at 375px and the Arabic popup. The matrix explicitly separates the earlier full-page measurements from this final navigation pass; unchanged desktop/content journeys were not unnecessarily repeated.

| Final 360px locale | Active Settings/backup button | Navigation height | Outcome |
|---|---:|---:|---|
| ru | 57.78px, two lines | 119.78px | `копирование` intact, no overflow |
| ko, en, ja, zh-CN, zh-TW, mn, th, vi, ar, km, es, fr, it, az | 44px | 106px | no overflow/clipping |

At 375px RU remains 57.78px and FR 44px. The 160px content reserve exceeds the tallest observed bar; the safe-area inset is added to both the bar and reserve. Khmer's narrower Review label fits its cell. The Arabic popup and all its 44px menu items stay inside the viewport. These are browser-preview measurements, not physical iPhone measurements.

Browser viewport emulation is not a physical iPhone/Safari test. Existing report iframe sandbox warnings, bundle-size/comparison-script build warnings, historic unrelated baseline mismatches and native-language review limitations are reported separately, not claimed fixed.

## Source ZIP

Create once, after actual QA evidence exists:

```
python tools/nuvia-studio/package-navigation-final.py
```

New file:
`generated-artifacts/nuvia-studio/NUVIA_STUDIO_NAV_15LOCALES_20261021_FULL_SOURCE.zip`

The packager refuses to overwrite that file. It **does not overwrite** `NUVIA_STUDIO_DAILY_NOTE_FINAL.zip`.

Includes current monorepo source/configuration/assets (including previous daily-note and Azerbaijani fixes), generated README, per-file source manifest and explicitly selected synthetic QA logs/report/matrix. Excludes personal data, credentials, .env, .git, browser data, dependencies, caches/build outputs, original uploads and previous archives.

The generated README distinguishes baseline Git HEAD from the current working-tree source snapshot hash; a source ZIP is not proof of a pushed GitHub commit. ZIP CRC and every entry are checked after writing.

## Apply / recover

Extract into a new directory and use a separate GitHub working branch. Review differences against the developer's latest integration branch; stop on conflicts rather than overwrite the product or result integration.

For this layout change alone, review/revert only the navigation rules in `studio.css`. There is no migration and no reason to reset or reclassify records. Personal backups remain separate from the public source ZIP.
