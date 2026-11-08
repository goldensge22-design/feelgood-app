# Manual UI continuation script (selectors observed live)

Use a fresh browser context; live route `/library-demo.html?demo=university`; keep changes confined to synthetic demo. Do not delete existing browser data or overwrite prior library QA evidence.

1. For each locale `ko,en,ja,zh-CN,zh-TW,mn,th,vi,ar,ru,km,es,fr,it,az`, select via `select-language`, open `tab-plan` (`mtab-plan` at 360), expand `practice-open`, select one visible `practice-choice-*`, and capture preview labels/aria/overflow at 1440 and 360. Check Arabic `dir=rtl`, Khmer/Thai/long labels, keyboard tab/enter and 44px targets.
2. Before switching locale in unsaved preview, enter distinct synthetic title/action/scope/time and helper; switch locale via the visible selector. Verify user-entered strings persist. During an active synthetic run, switch locale and verify URL/timer/route remain unchanged; then end safely.
3. In one representative locale, test preview close/cancel; `practice-write`; `practice-without`; `practice-unknown`; invalid minutes (<1, noninteger, >1440); and valid explicit Add. Verify one card only, no auto-run, and methods response counts.
4. Complete new flow: select card, `button-place-{id}`, `start`, `pause`, `flag-save`, `resume`, `review-run`, explicitly choose completion and `close-run`; optional self-report buttons; optional note; actual `download` event from `button-backup`, upload exact saved file via `input-restore`, reload, verify task/attachment/note/locale.
5. On isolated DEV-only `/practice-compare.html`, choose each of 5 stage options, close any existing preview before profile switch, reopen a choice and `practice-age-details`; verify input counts 2/3/3/4/5, max lengths 40/80/160, high-stage two dates/condition fields, adult owner/dependency/handoff/waiting. Compare all 4 targets and support strengths; keep target stable while changing strength and verify action stays same/help changes.
6. Inspect ordinary demo for hidden age/QA switches under query variants; confirm draft jobcatalog isn't exposed and production `dist` lacks `practice-compare.html`. Save every result incrementally beside this script.

Current checkpoint JSON contains completed results and exact gaps. Browser screenshot IDs remain in tool observations; physical screenshot export was not available.
