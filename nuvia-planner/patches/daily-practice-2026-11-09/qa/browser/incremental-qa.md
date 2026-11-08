# Incremental UI checkpoint — age-aware practice recommendations

Route: `/library-demo.html?demo=university`; synthetic state only, fresh context; no code edits/deploy/restart/payment. Existing library QA rows untouched.

## Verified, 1440×1000, ko
- Recommendation open and preview were non-creating; explicit recommendation choice was required.
- Preview fields were editable; custom authored strings were retained when help changed to attention.
- Adult optional details showed owner/dependency/handoff, five text fields total, and waiting checkbox.
- Explicit Add created exactly one task; add became disabled. Placement did not auto-start; explicit start, pause, marker save, resume, end/review, and completion record worked.
- No implicit goal/use or response credit before recorded completion; uses became 1 on completion. Attachment source and authored fields were correct.
- Optional self-report actions yes→neutral→no updated the single current response category; final counts uses=1/responses=1/no=1, other categories=0/unanswered=0 (not a cumulative click-event history).
- Personal note survived restore/reload. A real `download` event produced `NUVIA_studio_my_records.json` (failure null); the exact saved file was uploaded through restore; app reported verified restore. After reload, task appears once, note text and attachment/source/action/scope/helper and response count persisted.

## Historical gaps (at the initial checkpoint; superseded by the current-build follow-up below)
No matrix claims: 15 locale × 1440/360 and compare-page matrix still pending. No results for unsaved-preview locale retention, timer locale switch, invalid/unknown-time/cancel/direct-write/free recommendation flows, keyboard/44px targets or overflow at 360. No production-build exclusion check yet. Do not interpret this checkpoint as completion of previous library QA remaining17 rows.

Screenshots are referenced by their browser observation IDs in the JSON checkpoint; physical image copies not available from the tool at this point.

## DEV compare-route checkpoint (1440×1000, ko)
- `/practice-compare.html` loaded in a fresh context; first page load had zero page/console errors. It is labeled DEV ONLY / temporary synthetic data and has locale, 5-stage, 4-target, 5-strength selectors.
- First stage `elementary_1_3`: preview showed the correct scope; live DOM: 2 text inputs, each `maxLength=40`, 2 SVGs. No task added.
- Second stage was intentionally changed while the first preview remained open; the old preview stayed mounted with stale stage-1 fields until closed and re-opened. After re-opening for `elementary_4_6`, the stage-2 scope and 3 inputs rendered. The test was interrupted by Vite HMR resetting the compare page to its adult default before a conclusive stage-2 maxlength read; age-stage loop incomplete.
- Adult stage after that reload: 10-minute preview; five optional inputs (owner, dependency, handoff, two materials), all `maxLength=300`, plus one unchecked waiting checkbox. No task added.
- Same-goal strength check: planning target remained selected while strength changed simultaneous→successive; recommendation remained `작은 준비 계획 세우기` with same action while help changed to successive. Preview showed ordered two-step sequence with `practice-help-successive`.
- Browser logs during compare testing: generic `Failed to load resource: 404 ()` once after first profile change (no URL surfaced); later Vite HMR logs included `ReactDOMClient.createRoot() on a container that has already been passed to createRoot()` and invalidation/refresh notices for PracticeUI/Compare. Page reset to adult default, so matrix was not completed. No workflow restart or code edits were made.
- Build exclusion check is recorded below after inspection.

Build check: `find artifacts/nuvia-ui-review/dist -type f -iname practice-compare.html` found no file at checkpoint. This does not certify other production exposure paths or source bundles.

## en@1440 fresh-context row (core flow completed)
- Other rotated `planning.prepare` to a genuinely different `planning.tidy` candidate.
- Typed a Latin synthetic title/action/scope and 12 minutes. En→fr→en ordinary language changes retained the unsaved strings and selected attention helper.
- Added once, placed explicitly, observed actual HelpView attention with the custom action. Explicitly changing existing HelpView to Goals and completion criteria changed that panel; source attachment stayed attention. After starting, run panel retained the explicit planning choice. The actual downloaded personal backup JSON includes the matching closed run with `support: "planning"`.
- While running, en→fr kept the route and timer advanced 0:00→0:11→0:24. Paused, saved `EN QA pause marker`, resumed, reviewed, explicitly marked complete and recorded; before close use=0, after close use=1 and unanswered=1. Then explicit yes yielded use=1/responses=1/yes=1.
- Report HTML download was a real event (`NUVIA_monthly_2026-11.html`, failure null). Report separates the practice completion/response from generic HelpView method usage. `iframe` uses `sandbox=""`; `srcdoc` length 8019 has no script tag and iframe has zero scripts. Exact browser message: `Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.` This is the expected tight sandbox warning, not counted as a product error.
- Personal backup was a real download (`NUVIA_studio_my_records.json`, failure null) and the exact same `/tmp/qa-en-desktop-personal-backup.json` file was uploaded. App confirmed verified restore. After reload, French locale, task once, attachment source/action/scope, yes response, and exact note survived. Backup JSON inspection confirms the matching closed run's `support` value is `planning`.
- Layout at French desktop had no horizontal overflow (document/body widths 1425 each). A coarse visible-element scan found two task-edit inputs at 22px, but they were existing card-edit inputs and do not establish the new preview controls' target size. New-preview keyboard/44px checks remain open.

## ja@360 representative mobile row (fresh context)
- Japanese language selection and mobile `mtab-plan` worked at 360×800; UI labels and navigation were Japanese. Initial/new-page errors and HTTP/request-failure list remained empty.
- DOM audit: no horizontal overflow (document/body width 345px equals client width at 360 viewport); recommendation card 280px, Other/Write/Without buttons 48px, mobile tabs 44px, preview inputs 44px. Adult details localized: five inputs maxLength=300, each 235×44px, one waiting checkbox. Raw unknown-time checkbox is 22px; accessible label row still needs a touch-area audit.
- Explicit Add created one 9-minute task, placed and explicitly started. Paused at 0:13, saved `JA mobile pause marker`, resumed, reviewed (0:23/0.39 actual minutes), explicitly selected completed and recorded. Use remained 0 until recorded, then became 1/unanswered 1; explicit yes self-report yielded responses=1/yes=1.
- At 360px, run/review timer string `秒` wrapped to a separate line, and the fixed bottom nav overlapped lower content while scrolled; visible controls remained actionable, no horizontal overflow observed. This is recorded as a non-blocking mobile layout note.
- Row JSON: `row-ja-mobile-2026-11-08.json`. Backup/report not repeated in this row per scope clarification; ko/en actual-file journeys remain preserved.

## ko@360 and en@360 matrix rows (fresh contexts; UI-only matrix scope)
- Both used the mobile selector and `mtab-plan`, opened recommendations, and clicked Other. In each locale Other changed `planning.prepare` to a genuinely different `planning.tidy` title/action. Both previews exposed localized field labels, simultaneous-help label, localized safety guidance, and localized ARIA names in the snapshots.
- Unique titles `QA-ko-360-tidy` and `QA-en-360-tidy` were entered, then explicit Add was clicked exactly once on each page. Both showed Add confirmation, disabled the Add button, and contained exactly one matching To-Do card; no auto-run.
- Each fresh row had no captured page/console/HTTP/request failures. At 360px the logged audit had document/client width 345 and no horizontal overflow. Files: `row-ko-mobile-2026-11-08.json`, `row-en-mobile-2026-11-08.json`.

## zh-CN@1440 and zh-CN@360 matrix rows
- Fresh contexts loaded the university demo, selected 简体中文, and opened desktop/mobile Plan. Other changed the initial `planning.prepare` (制定准备计划) to genuinely different `planning.tidy` (确定区域整理量) with a different action. Localized field/AX labels, simultaneous-help label, and safety text were present.
- Unique titles `QA-zh-CN-1440-tidy` and `QA-zh-CN-360-tidy` were entered; explicit Add was clicked once each. Both showed a localized “manually click start” confirmation, disabled Add, and exactly one matching To-Do card, with no auto-run. No page/console/HTTP/request failures were observed.
- No document-level horizontal overflow: desktop document 1425/1425; mobile 345/345. Mobile has a contained 7-day horizontal scroller (`.st-week`, overflow-x:auto, client 287 / scroll 876); this is not document overflow. JSON rows saved separately.

## zh-TW@1440 and zh-TW@360 matrix rows
- Fresh contexts selected 繁體中文 and Plan. Other changed initial `planning.prepare` (制定小型的準備計畫) to distinct `planning.tidy` (決定一個區域的整理份量) with a different action. Field/ARIA labels, simultaneous-help choice (`整體連結`), and safety copy were localized.
- Unique titles were entered and explicit Add clicked once per row. Both displayed a manual-start confirmation, disabled Add, and exactly one matching To-Do card; no auto-run. No page/console/HTTP/request failures were observed.
- Desktop page widths 1425/1425; mobile 345/345; preview 261/261 at mobile. No page-level horizontal overflow. Row JSONs saved separately.

## mn@1440 and mn@360 matrix rows
- Fresh Mongolian contexts selected Монгол and Plan; Other changed the initial `planning.prepare` (“Жижиг бэлтгэлийн төлөвлөгөө гаргах”) to distinct `planning.tidy` (“Нэг хэсгийг цэгцлэх хэмжээг тогтоох”) with a different title/action. Mongolian field/ARIA labels, simultaneous-help choice, and safety copy appeared in both previews.
- Unique titles `QA-mn-1440-tidy` and `QA-mn-360-tidy` were entered; Add was clicked once each. Both showed “Жагсаалтад нэмлээ. Эхлэхдээ өөрөө дарна уу.”, disabled Add, and exactly one matching To-Do; no auto-run. Fresh issue arrays were empty.
- Desktop widths 1425/1425; mobile 345/345; preview widths 1316/1316 and 261/261; 48px Add target. No page-level horizontal overflow. Separate JSON rows saved.

## th@1440 and th@360 matrix rows
- Fresh Thai contexts selected ไทย and Plan. Other changed the initial `planning.prepare` (“วางแผนการเตรียมการเล็กๆ”) to distinct `planning.tidy` (“กำหนดปริมาณที่จะจัดในหนึ่งพื้นที่”) with a different action. Thai field/ARIA labels, simultaneous-help choice, and safety copy were visible.
- Unique titles were entered and Add clicked once each. Both showed the manual-start confirmation, disabled Add, and exactly one matching To-Do card; no auto-run. No page/console/HTTP/request failures were observed.
- No page-level horizontal overflow was reported at either viewport. Separate row JSON files saved.

## vi@1440 and vi@360 matrix rows
- Fresh Vietnamese contexts selected Tiếng Việt and Plan. Other changed initial `planning.prepare` (“Lập kế hoạch chuẩn bị nhỏ”) to distinct `planning.tidy` (“Xác định mức độ dọn dẹp cho một khu vực”) with a different action. Vietnamese field/ARIA labels, simultaneous-help choice, and safety copy were present.
- Unique titles were entered and Add clicked once per page. Both showed “Đã thêm vào kệ. Hãy nhấn trực tiếp để bắt đầu.”, disabled Add, and exactly one matching To-Do; no auto-run. No captured page/console/HTTP/request failures.
- Desktop document/preview widths 1425/1425 and 1316/1316; mobile 345/345 and 261/261. No horizontal overflow. On mobile, the disabled Add confirmation wraps across lines. Separate JSON files saved.

## ar@1440 and ar@360 matrix rows
- Fresh Arabic contexts selected العربية, and both `documentElement.dir` values were `rtl`. Other changed initial `planning.prepare` (“وضع خطة تحضير صغيرة”) to distinct `planning.tidy` (“تحديد كمية ترتيب منطقة واحدة”) with a different action. Arabic labels, simultaneous-help choice, and safety copy appeared in both previews.
- Unique titles were entered and Add clicked once each. Both displayed the manual-start confirmation, disabled Add, and exactly one matching To-Do; no auto-run. No page/console/HTTP/request failures were captured.
- Desktop document/preview widths 1425/1425 and 1316/1316; mobile 345/345 and 261/261. No document-level horizontal overflow. Separate JSON rows saved.

## ru@1440 and ru@360 matrix rows
- Fresh Russian contexts selected Русский and Plan. Other changed `planning.prepare` (“Создание плана подготовки”) to distinct `planning.tidy` (“Определение объема уборки зоны”) with a different action. Russian field/ARIA labels, simultaneous-help choice, and safety copy were present.
- Unique titles were entered and Add clicked once each. Both showed “Добавлено на полку. Нажмите, чтобы начать.”, disabled Add, and exactly one matching To-Do; no auto-run. No page/console/HTTP/request failures were observed.
- Desktop document/preview widths 1425/1425 and 1316/1316; mobile 345/345 and 261/261. No page-level horizontal overflow. Separate JSON rows saved.

## km@1440 and km@360 matrix rows
- Fresh Khmer contexts selected ខ្មែរ and Plan; Other changed `planning.prepare` (“ការរៀបចំផែនការតូចមួយ”) to distinct `planning.tidy` (“កំណត់បរិមាណសម្រាប់ការរៀបចំកន្លែងមួយ”) with a different action. Khmer labels/help/safety copy appeared in the preview.
- Unique titles were entered and Add clicked once per row. Both showed a manual-start confirmation, disabled Add, and exactly one To-Do card; no auto-run. No captured page/console/HTTP/request failures.
- Desktop widths 1425/1425 and 1316/1316; mobile 345/345 and 261/261. No page-level horizontal overflow; Khmer wrapping is vertical. Separate JSON files saved.

## es@1440 and es@360 matrix rows
- Fresh Spanish contexts selected Español and Plan. Other changed `planning.prepare` (“Establecer un plan de pequeña preparación”) to distinct `planning.tidy` (“Determinar la cantidad para organizar una zona”) with a different action. Spanish field/ARIA labels, simultaneous-help choice, and safety copy were present.
- Unique titles were entered and Add clicked once each. Both showed “Añadido al estante. Por favor, presione personalmente para comenzar.”, disabled Add, and exactly one matching Pendiente card; no auto-run. No page/console/HTTP/request failures.
- Desktop document/preview widths 1425/1425 and 1316/1316; mobile 345/345 and 261/261. No page-level overflow; confirmation wraps vertically on mobile. Separate JSON files saved.

## Stability hold (2026-11-08 15:32 UTC; historical checkpoint)
- French Add was verified once per fresh context before a later Vite HMR update; French JSON rows are marked `ui-flow-verified-before-runtime-HMR; revalidation-on-frozen-build-pending`.
- A subsequent read-only French state check timed out after 3 seconds waiting for `practice-title`, before returning URL/title/Add/card values. Browser logs from that observation contained HMR updates for `PracticeUI.tsx`, `StudioApp.tsx`, `StudioPage.tsx`, `RoadmapPage.tsx`, and `CardDetail.tsx`; `/practice-compare.html` also logged Fast Refresh incompatibility for `Compare.tsx`.
- No testing session code edit or workflow restart was performed. `stat` at 15:32:18 UTC showed `PracticeUI.tsx` mtime 15:31:06 UTC, indicating source changed during this pass. Pause further claims about the frozen baseline until the app is frozen again or the requester confirms the changed build is the intended test target.
- Remaining matrix rows without saved JSON: ja@1440, it@1440, it@360, az@1440, az@360; ja@360 has its earlier full lifecycle evidence but did not run the Other rotation in the matrix flow. Remaining targeted work: one keyboard-accessibility row, complete five-stage age-detail/target/strength comparison (elementary_4_6 maxLength80, middle, high, targets/strength combinations), and normal-public query/jobcatalog gates.

## Stability hold after requester restart (historical, superseded by reconciliation below)
- Fresh `ja@1440` navigation loaded `/library-demo.html?demo=university` and had an empty row issue array; I stopped before changing language/Plan. Other open browser pages then logged `[vite] server connection lost. Polling for restart...`, with some reconnects. This is a dev-server disconnect/polling event; no module name or exact browser-event timestamp was emitted. The latest workflow-log capture was `/tmp/logs/artifactsnuvia-ui-review_web_20261108_153627_062_3a4e084a.log` (Vite 7.3.6 ready in 554ms). I did not restart the workflow or edit app source.
- API Server logs separately recorded GET `/` 404 at 15:34:53.475, 15:35:07.086, and 15:35:08.617; these do not identify the prior public-UI 404.
- Saved the full locale/status grid to `matrix-status-2026-11-08.json`. Stop per requester rule rather than retrying while connections poll for restart.

## it@1440
- Fresh per-row context selected Italiano and Plan; Other changed `planning.prepare` (“Creare un piano di preparazione”) to distinct `planning.tidy` (“Decidere quanto riordinare una zona”). Unique title `QA-it-1440-tidy` was explicitly added once; one To-Do card, disabled Add, and manual-start confirmation observed; no auto-run.
- Italian labels/help/safety exposed; `it`/LTR; document 1425/1425 and preview 1316/1316; four inputs 44px, Add/Close 48px; row issue sink empty. Saved `row-it-desktop-2026-11-08.json`.

## it@360
- Fresh per-row context selected Italiano/Plan; Other changed `planning.prepare` (“Creare un piano di preparazione”) to distinct `planning.tidy` (“Decidere quanto riordinare una zona”). Unique title `QA-it-360-tidy` was explicitly added once; one “Da fare” card, disabled Add, and manual-start confirmation observed; no auto-run.
- Italian labels/help/safety exposed; `it`/LTR; document 345/345 and preview 261/261; four 44px fields, Add 261×72 and Close 80×48; mobile Add wraps vertically; row issue sink empty. Saved `row-it-mobile-2026-11-08.json`.

## az@1440
- Fresh per-row context selected Azərbaycan dili/Plan; Other changed `planning.prepare` (“Kiçik hazırlıq planı qurun”) to distinct `planning.tidy` (“Bir bölgəni tənzimləmək üçün həcm müəyyən edin”). Unique title `QA-az-1440-tidy` was explicitly added once; one pending task, disabled Add, and manual-start confirmation observed; no auto-run.
- Azerbaijani labels/help/safety exposed; `az`/LTR; document 1425/1425 and preview 1316/1316; four 44px fields, Add/Close 48px; issue sink empty. Saved `row-az-desktop-2026-11-08.json`.

## az@360
- Fresh per-row context selected Azərbaycan dili/Plan; Other changed `planning.prepare` (“Kiçik hazırlıq planı qurun”) to distinct `planning.tidy` (“Bir bölgəni tənzimləmək üçün həcm müəyyən edin”). Unique title `QA-az-360-tidy` was explicitly added once; one pending task, disabled Add, and manual-start confirmation observed; no auto-run.
- Azerbaijani labels/help/safety exposed; `az`/LTR; document 345/345 and preview 261/261; four 44px fields, Add/Close 48px; issue sink empty. Saved `row-az-mobile-2026-11-08.json`.

## fr@1440 final-build revalidation
- Fresh per-row context selected Français/Plan; Other changed `planning.prepare` (“Établir un plan de préparation simple”) to distinct `planning.tidy` (“Définir la charge pour ranger une zone”). Unique title `QA-fr-1440-final` was explicitly added once; one pending task, disabled Add, and manual-start confirmation observed; no auto-run.
- French labels/help/safety exposed; `fr`/LTR; document 1425/1425 and preview 1316/1316; four 44px fields, Add/Close 48px; issue sink empty. Saved `row-fr-desktop-final-2026-11-08.json`.

## fr@360 final-build revalidation
- Fresh per-row context selected Français/Plan; Other changed `planning.prepare` (“Établir un plan de préparation simple”) to distinct `planning.tidy` (“Définir la charge pour ranger une zone”). Unique title `QA-fr-360-final` was explicitly added once; one pending task, disabled Add, and manual-start confirmation observed; no auto-run.
- French labels/help/safety exposed; `fr`/LTR; document 345/345 and preview 261/261; four 44px fields, Add/Close 48px; issue sink empty. Saved `row-fr-mobile-final-2026-11-08.json`.

## ja@360 Other-only final-build check
- In a fresh Japanese mobile context, Other changed `planning.prepare` (“小さな準備の計画を立てる”) to distinct `planning.tidy` (“エリアを決めて整理する”); the existing lifecycle task remained untouched and no new task was added. Fresh page issue sink stayed empty.
- Layout supplement: at 360px innerWidth, `documentElement` and body clientWidth were 345px while scrollWidth was 360px (15px excess); screenshot `9rwfni` shows a horizontal scrollbar. `.st-week` is separately an intended contained scroller (287/876, overflow-x:auto), but this measurement also records document/body excess. Saved `row-ja-mobile-other-final-2026-11-08.json`; prior lifecycle artifact remains unchanged.

## ko@1440 keyboard/layout gap only
- Fresh audit context (no replay of earlier Korean desktop core journey): Enter opened the recommendation disclosure; Tab reached the first candidate then Other; Enter rotated prepare to a distinct tidy candidate; Shift+Tab and Enter opened the tidy preview. No task was added.
- Korean labels present; document 1425/1425, preview 1316/1316; four input fields 44px; context/help/Add/Close buttons 48px. Unknown checkbox itself 22×22 but its associated label hit area is 1316×44 (one label association). Issue sink empty. Saved `row-ko-desktop-a11y-2026-11-08.json`.

## en@1440 keyboard/layout gap only
- Fresh audit context (no replay of earlier English desktop core journey): Enter opened the recommendation disclosure; Tab reached the first candidate then Other; Enter rotated prepare to distinct tidy; Shift+Tab and Enter opened the preview. No task was added.
- English labels present; document 1425/1425, preview 1316/1316; four input fields 44px; context/help/Add/Close buttons 48px. Unknown checkbox is 22×22 with an associated label target of 1316×44 (one label association). Issue sink empty. Saved `row-en-desktop-a11y-2026-11-08.json`.

## Compare: elementary_4_6 age details
- Fresh DEV-only `/practice-compare.html` context selected `elementary_4_6`, opened the `planning.prepare` preview and its optional age-details disclosure. Exactly three labeled text inputs (`practice-detail-0..2`) were visible; runtime properties confirmed type=text and `maxLength=80` on each. No task added; fresh page issue sink empty. Saved `age-elementary-4-6-2026-11-08.json`; prior `elementary_1_3` evidence was not repeated.

## Compare: middle-stage age details
- Fresh DEV-only `/practice-compare.html` context selected `middle`, opened the 7-minute preparation preview and optional age-details panel. Exactly three labeled text inputs (`practice-detail-0..2`) were visible; runtime properties confirmed type=text and `maxLength=160` on all three. No task added; fresh page issue sink empty. Saved `age-middle-2026-11-08.json`.

## High-stage preview closure on previous build (historical, superseded)
- In two fresh pre-fix contexts, changing high-stage strength simultaneous→successive unmounted the preview and details panel; no task or counter changed and page issue sinks were empty. Persistence after reopening was not checked, so no data-loss claim is made. This behavior is not current: the requester-confirmed build 6409 retest below preserves the preview and all fields.
- Historical screenshots: `yurkfm` and `480wlw`; current-build proof is in `age-high-2026-11-08.json`.

## Reconciliation after requester clarification
- The earlier stability-hold note about old tabs is superseded: requester confirmed the managed Vite workflow restart at 15:36:27 was expected and old-tab WebSocket losses were expected. Tester-owned old contexts were closed, and later locale/a11y/age checks used fresh contexts with new issue sinks. No tester source edits or workflow restarts occurred.
- The 15-locale matrix status file now marks `ja@1440` complete (the earlier initial-load-only entry is historical). API Server GET `/` remains the separate known unrelated service; the original UI 404 is still unidentified.

## Japanese 360px Other-path overflow retest after CSS fix
- On the fresh current build, `ja@360` Other still changed `planning.prepare` to distinct `planning.tidy`. Exact page metrics: `innerWidth=360`, document/body client and scroll widths are all 345 (no global overflow). A full geometry scan found 25 off-client rectangles, all contained by the intentional `.st-week` horizontal scroller (287×876, `overflow-x:auto`); `uncontainedOffenders=0`, issue sink empty. No global overflow was hidden.
- This passes the new fix check and supersedes the prior pre-fix `ja@360` partial for the current build. Saved `row-ja-mobile-layout-fixed-2026-11-08.json`.

## High-stage targeted fix proof (current build)
- Fresh `/practice-compare.html`, stage high, target planning, strength simultaneous. Filled title `QA-high-date-persist`, action `Compare two deadlines and choose one action`, scope `Complete one concrete step before the earlier date`, dates `2026-11-10`/`2026-11-12`, conditions `QA condition A/B`.
- Changed strength to successive: preview stayed mounted; target stayed planning; all authored title/action/scope/date/condition values remained; default help changed to successive without manually choosing a help button; two successive steps were exactly action and scope (date/condition values excluded).
- Explicit Add succeeded once. Confirmation required direct user start, Add disabled, no run panel; task appears once on 2026-11-10, while selected 2026-11-08 still shows 0 done/0 planned/90 free. Fresh issue sink empty. An initial assertion locator timed out because it sought the task in the selected 11/08 card; direct DOM/AX inspection found it on the 11/10 card. Saved updated `age-high-2026-11-08.json` and `compare-checkpoint-2026-11-08.json`; prior-build failure is retained as superseded history.

## Adult owner/dependency/handoff/waiting current-fix proof
- Fresh DEV compare context opened adult preview, filled title/action/scope, owner, dependency, handoff, two materials, and checked “waiting for another person.” Strength changed simultaneous→successive while target stayed planning; preview and all values/checkbox persisted, default help changed, and successive steps contained only action/scope.
- Explicit Add created one `기다리는 중` item with manual-start confirmation and disabled Add. No run/progress element appeared; capacity was 0 done / 10 planned / 80 free. Fresh issue sink empty. Saved `age-adult-successive-2026-11-08.json`.

## Public current-build locale/timer/note/actual-file backup proof
- Fresh public `/library-demo.html?demo=university`, Korean preview: authored title `QA-public-record-2026-11-08` and action `Write one short sentence and save the source`; untouched scope was the Korean default. ko→az left title/action raw and translated only untouched scope; preview remained open, `lang=az`, no row issues.
- Explicit Add created one new task (ID `3fb7a4d9-89d5-424e-846e-e7a79347a018`), manual-start confirmation, no auto-run. Placed and explicitly started it only for the requested active-run test; before completion, uses/responses remained 0. Entered the nonsensitive daily note `QA active timer note 2026-11-08`; az→ko left active run/timer and exact note present. Paused at 0:42 / 9:18 remaining; did not complete/review.
- Real browser download event created `NUVIA_studio_my_records.json` (21,987 bytes). Exact downloaded file was inspected: one task history item (`최초 계획`), `planChanged=false`, `planConfirmed=false`, initial source snapshot present; no explicit version field in schema. Exact note appears at `data.studio.dailyNotes['2026-11-08'].text`; source record had the open, not-completed run.
- Reload before restore preserved the paused task and exact note. The same file was uploaded through the real JSON file input; app message: `검증 후 복원했습니다. 타이머는 멈춘 상태이며 본인이 시간 확인 후 재개하세요.` Reload after restore again preserved one paused QA task, the exact note, 0 uses/responses. Copy of the downloaded file saved as `qa-public-record-2026-11-08.backup.json`; proof JSON as `qa-public-record-2026-11-08.json`.

## Public query/review/draft-job boundary
- Read-only source check of `src/library-public/policy.ts` showed `publicLibrary` is compile-time-only (`NUVIA_LIBRARY_PUBLIC === 'true'`) and never granted by query parameters/stored data; only `demo`/`audience` values `university`, `school`, `enterprise` choose the public audience. `StudioApp` review mode is gated by `!demoAudience && review=1`.
- Runtime public URL `/library-demo.html?demo=university&review=1&qa=1&board=1&stage=high&jobcatalog=1&draftJob=1` stayed in the synthetic University public demo with ordinary tabs, 3 audience links, 0 compare controls, no jobcatalog/draft text/testids, and a fresh issue sink `[]`. Saved `public-query-guard-2026-11-08.json` (screenshot `xladlw`).

## Public cancel/direct-write/no-recommendation/unknown/invalid-duration cases
- Fresh isolated Korean public demo retained its single seeded task throughout. Opened a recommended preview and closed it without Add; task count/capacity unchanged.
- Direct-write opened an empty task form; a draft title plus 25-minute choice was accepted, then Cancel closed the form without saving. “Start without recommendation” opened a blank manual form with unknown time selected; a draft title plus unknown-time selection was canceled without saving. No new task.
- Custom duration input is `type=number min=1 max=1440 step=1`. Save attempts with 0, 1.5, and 1441 were blocked by browser constraint validation with the corresponding range-underflow, step-mismatch, and range-overflow messages; the form stayed open, no invalid task was added, and capacity/task count remained unchanged. Final invalid draft canceled. Fresh issue sink empty. Saved `public-edge-cases-2026-11-08.json`.

## Post-CSS 15-locale × 1440/360 layout-only audit (current build)
- Reused two fresh pages and iterated ko/en/ja/zh-CN/zh-TW/mn/th/vi/ar/ru/km/es/fr/it/az, opening Other and the preview then closing without Add or lifecycle actions. All 30 rows had empty fresh issue arrays and no document/body horizontal overflow. Desktop client/scroll 1425/1425 and preview 1316px; mobile 345/345 and preview 261px, with `.st-week` contained at 287/876 (`overflow-x:auto`). Preview inputs were 44px in all rows; Add/Close were 48px except the Vietnamese and Italian mobile Add buttons wrapping to 72px. Full row data: `layout-matrix-2026-11-08.json`.

## Final targeted-check status
- Current-fix high/adult persistence/help changes, public locale flip and active timer/note survival, exact-file backup/restore/reload, public query/review/draft-job guard, and representative cancel/direct-write/no-recommendation/unknown/invalid-minute cases are saved in the QA JSON artifacts. The full target×strength grid remains an explicit scope gap; no preserved core/locale journeys or legacy-library QA were repeated. No tester app-source edits or workflow restarts.
