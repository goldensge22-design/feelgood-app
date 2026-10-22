# Studio demo accessibility-copy audit

**Scope:** changed Studio accessibility-copy only. The prior 480-view screen matrix was not rerun. No app source was changed.

- **Locales:** en, ja, zh-CN, zh-TW, mn, th, vi, ar, ru, km, es, fr, it, az
- **Audiences:** school, university, enterprise
- **Viewports:** desktop 1440×1000 and mobile 360×900
- **Contexts:** selected shelf and desk after explicit start followed by pause
- **Audited attributes:** aria-label, title, placeholder under section-selected and section-desk, including collapsed descendants. Archive details were opened with blank fields to expose conditional placeholders. Each attribute-bearing element in the JSON has the present value or explicit null for each of the three types, plus an absentAttributes list.

## Results

| Context | Rows | Edit mismatch | Color-group mismatch | Tone mismatch | Foreign Hangul/raw canonical leaks | Storage change | Phase failure | Horizontal overflow |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Selected shelf | 84 | 0 | 0 | 0 | 0 | 0 | n/a | 0 |
| Paused desk | 84 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

The 168 main rows comprise 14 foreign locales × 3 demos × 2 viewports × 2 contexts. For every demo, placing the task left the run idle; each desk task was then started and paused through the UI. Locale changes preserved the paused phase. Synthetic Korean title/subject values stayed canonical in browser storage; edit-form values were never changed or saved.

Plan order controls were checked once per locale on the school demo (mobile): 14 rows, 0 move-up mismatches, 0 move-down mismatches, 0 Hangul values, and 0 paused-state failures. No reorder control was clicked.

## User-authored Korean-title exception

In a fresh isolated browser context, a new user-authored task was created through TaskCreator with the same raw Korean title as the school fixture. In English and Azerbaijani, localized edit/color-group templates and color names were correct while the raw Korean user title remained in the accessible names; the edit save button remained disabled. No seeded task was edited.

## Files

- selected-{school,university,enterprise}.json — 84 selected-shelf rows with full attributes, explicit per-element absent values, exact label checks, canonical storage, and overflow.
- desk-{school,university,enterprise}.json — 84 paused-desk rows with the same attribute checks plus phase/content preservation.
- plan-school-mobile.json — plan order labels by locale.
- authored-korean.json — separate user-authored-title exception.
- matrix-summary.json — machine-readable summary.

Representative screenshots: oaptsg (Azerbaijani paused enterprise desk with edit aria and tone controls), va1w5p (paused school desk), 6miwx8 (Plan), and w6sjaz (user-authored Korean title in Azerbaijani).