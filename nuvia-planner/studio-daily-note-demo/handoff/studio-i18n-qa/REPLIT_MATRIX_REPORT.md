# Studio demo locale QA
Generated: 2026-10-21T23:43:06.590Z

- View matrix: **480/480 pass**, 0 fail (15 locales × 4 routes × 2 viewports × 4 screens).
- Audience-label checks: **45/45 pass** (school adolescent; university/enterprise adult).

## Per-locale results
| Locale | Checks | Pass | Fail |
|---|---:|---:|---:|
| ko | 32 | 32 | 0 |
| en | 32 | 32 | 0 |
| ja | 32 | 32 | 0 |
| zh-CN | 32 | 32 | 0 |
| zh-TW | 32 | 32 | 0 |
| mn | 32 | 32 | 0 |
| th | 32 | 32 | 0 |
| vi | 32 | 32 | 0 |
| ar | 32 | 32 | 0 |
| ru | 32 | 32 | 0 |
| km | 32 | 32 | 0 |
| es | 32 | 32 | 0 |
| fr | 32 | 32 | 0 |
| it | 32 | 32 | 0 |
| az | 32 | 32 | 0 |

## Route/viewport totals
| Route | Viewport | Checks | Fail |
|---|---|---:|---:|
| school | desktop | 60 | 0 |
| school | mobile | 60 | 0 |
| university | desktop | 60 | 0 |
| university | mobile | 60 | 0 |
| enterprise | desktop | 60 | 0 |
| enterprise | mobile | 60 | 0 |
| ordinary | desktop | 60 | 0 |
| ordinary | mobile | 60 | 0 |

## Focused coverage
- 15 language options; selector dispatch updated app locale, document `lang`, and localized demo notice.
- Numeric header/document measurements: 120 route×locale×viewport sets (1440×1000 desktop, 360×900 mobile); all document widths fit, mobile selector is on physical right, selector/title do not overlap, and mobile selector bottom precedes title top. See `measurements.json`; geometry is attached to matrix rows by screen.
- Demo warning checks cover browser-only storage, no login/server/device sync, plaintext backup, no real personal data/results, and fictional/unvalidated assessment language.
- Demo Now/Plan title and subject checked against display-only resources; canonical storage initially remained Korean.
- Report preview `srcdoc` language and localized warning checked; no K-PASS or Korean strings in non-Korean report content.
- School adolescent and university/enterprise adult sample labels checked across all locales.
- Fresh ordinary setup verified before stage selection; middle-stage + setup-start opened the workbench. A synthetic Korean task stayed verbatim through locale changes, reload, and running/paused states.
- Provenance guard verified with a newly created same-title/same-subject card; edited fixture also remained Korean.
- No application sources edited; no publish or GitHub access.

## Limitations
- Sandboxed report-preview about:srcdoc emitted expected blocked-script diagnostics; sandbox settings were not changed.
- No missing translation-key or uncaught Studio page exceptions observed.
- Native-device/iPhone and native-speaker validation not performed.
- Screenshots are attached through QA observation evidence IDs; harness does not expose image bytes for workspace export.

## Screenshot evidence
Representative observation screenshot IDs: desktop `iev533`, `ddpysy`, `k5dmo5`, `ytsc1a`; mobile `mt79c3`, `xz8mlz`, `u9r7bz`; same-title guard `63aqlo`; timer running/paused `j5uebp`, `68uytl`, `aua3nh`. Binary screenshot files could not be exported into this directory by the browser test harness.