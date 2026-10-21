# Studio i18n QA — 2026-10-21

## 2026-10-22 header selector and synthetic-demo follow-up

The Studio candidate now puts its 15-language selector in the upper-right header on every tab, including 360px mobile. For the three external-demo audiences, only known synthetic sample task/subject/result labels are projected into the selected locale for display; stored canonical task text and real/user-authored content are not translated or rewritten. The demo safety notice uses the selected locale. AZ/MN synthetic-result wording and the Korean source wording remain unchanged.

After the last source change: TypeScript and production Vite build PASS; 15 × 1,138 resource keys PASS; core 1,392, daily notes 365, dedicated i18n 439, external-demo 68, and notice/language-transition 545 assertions PASS. Headless Chrome checked 15 locales × three demo audiences × two widths (1440/360) plus 15 regular-Studio locales × two widths: **120 combinations, zero recorded errors**. It checked selector visibility, `lang`/`dir`, sample title and subject, selected-tab and report-preview Hangul leakage, horizontal overflow, header overlap, refresh persistence, canonical stored sample, and page errors. These are candidate-build results, not evidence that the public Replit deployment has been updated.

The 14 foreign Studio resources and new synthetic sample strings remain AI drafts requiring human linguistic review. These checks demonstrate key/placeholder structure and sampled browser behavior, not a native-speaker-certified translation or every optional dialog. The separate Korean-only 2.5 standalone source and the developer's server-integrated production version are not certified by this follow-up. Do not describe either as 15-language complete.

## Status and provenance
Studio-only implementation and AI-draft resources. Original approved workbench and official/enhancement/personal/result/D-CAS sources are preserved. No publish/push/main merge, server, billing or identity-provider setup.

Initially 1,063 extracted keys; nested template/conditional copy, the corrected AI-review notice and sentence-level named JSX interpolation increased the retained catalogue to **1,138**. All 14 foreign files are saved; no remaining locale file is pending. All new foreign text is **AI_DRAFT_NOT_HUMAN_REVIEWED**. Existing English task-entry wording was kept.

## Final resource/browser matrix
Each row: exact 1,138-key set, nonempty text, identical named placeholder multiplicity, HTML/CSS preservation, no Hangul, and target-script check where applicable. Browser: 1440px and 360px across settings/now/plan/reflect/report/roadmap/growth, document lang/dir, ordinary visible copy/ARIA/title/placeholder Korean scan, report source metadata/text, actual print-to-PDF, overflow, same student records after language switching. Student-authored Korean text and native locale names are explicitly excluded from the ordinary-copy scan.

| Locale | Resources | 1440px | 360px | Print | Console |
|---|---|---|---|---|---|
|ko|PASS|PASS|PASS|PASS|0|
|en|PASS|PASS|PASS|PASS|0|
|ja|PASS|PASS|PASS|PASS|0|
|zh-CN|PASS|PASS|PASS|PASS|0|
|zh-TW|PASS|PASS|PASS|PASS|0|
|mn|PASS|PASS|PASS|PASS|0|
|th|PASS|PASS|PASS|PASS|0|
|vi|PASS|PASS|PASS|PASS|0|
|ar|PASS|PASS|PASS|PASS|0|
|ru|PASS|PASS|PASS|PASS|0|
|km|PASS|PASS|PASS|PASS|0|
|es|PASS|PASS|PASS|PASS|0|
|fr|PASS|PASS|PASS|PASS|0|
|it|PASS|PASS|PASS|PASS|0|
|az|PASS|PASS|PASS|PASS|0|

Matrix navigation is DOM-activated in a real Chromium browser, not a simulation of every pointer/keyboard flow. Dedicated focused browser testing covers actual clicks, keyboard focus and data preservation separately. The screenshot/PDF files and machine-readable results are included; no generated images replace browser captures.

## Core/type/build
- Studio core through the same source macro: **1,392 assertions PASS**.
- Dedicated i18n actions, legacy-value compatibility, data/score preservation, backup roundtrip, compiled report metadata, Intl and named placeholder preservation: **136 checks PASS**.
- TypeScript type check and production build: PASS. A build is not a deployment.
- Full source ZIP extracted to a new temporary directory: all packaged-file hashes matched; offline frozen-lockfile installation, root type check and production build PASS. The final repack only adds the verification logs and updates documentation; build inputs remain unchanged.
- Patch baseline extracted separately: precondition hash verification and `git apply --check` PASS against b60f130. This is not proof of compatibility with a later developer integration branch.
- Build warning: the eagerly loaded 15-resource bundle exceeds Vite's chunk-size recommendation. No warning threshold was relaxed to conceal it.
- Three numeric-counter translations were given explicit localized count labels after native-script validation; Arabic/Russian/Khmer's two-width/seven-page/print matrix was rechecked and PASS, with zero console errors. Other locale matrix results remained valid.
- Protected source diff against b60f130: no changes to official/enhancement/personal/API sources.

## Intermediate failures and what changed
- AdditionalProperties-only structured translation responses were incomplete. Explicit key/text arrays and small saved batches were used instead.
- Initial resource completeness checks did NOT catch English/wrong-language drafts. Visible captures found them, especially Mongolian/Arabic/Khmer. Those entries were repaired with full language names/native-script constraints, and the strict validator now checks scripts as well.
- A raw-user-text wrapper under option caused React nesting warnings. Options now keep plain children and explicit unchanged canonical values, with separately localized labels.
- A temporary missing review-notice key crashed a tester's page during an in-progress source/resource update. The key is now in all resources; final source and resources were frozen and validated together.
- Automatically adding a locale during backup export changed an old-state roundtrip and failed an existing deep-equality assertion. That mutation was removed; the original strict assertion passes unchanged. Explicit new language choices are already persisted in the additive Studio field.
- Focused tester's early sandbox script warning is retained as a separate observation. Reports contain no application-authored script. Their sandbox was NOT weakened.

## Verification limits / remaining work
- AI draft generation, script checks and browser layout are **not human linguistic vetting**, a screen-reader audit or actual student usability/effect research.
- Primitive mixed-text JSX messages were consolidated into named sentence keys; complex rich-element composition remains React markup. Grammar, terminology and rich-text reading order still require human language review, not claimed full grammatical certification.
- The all-locale matrix does not expand every optional help, assessment editor, modal and five personalization paths in every language. Static extraction/resource checks cover their copy; the full combinatorial interactive matrix is unverified.
- Existing historic Replit baseline four mismatches were not rerun/fixed or promoted to a whole-project pass. The user's GitHub 811609f 262-test/tsc/build success is a separate user-confirmed result; remote integration compatibility is not verified here.
- Actual result server/auth/roles/device sync and a professional translation approval workflow remain disconnected/outside this task.
- See the focused tester record for actual click/backup/draft coverage and any remaining issues. Do not infer a PASS for steps the tester could not execute.

## Focused actual-click tester
Initial journey: Korean title/scope preserved, en/ar/ja document metadata and route/query/hash preserved; unknown-time task explicitly started/paused, flag preserved across language/reload/backup restore, report/print/download opened, mobile keyboard focus/no overflow. Initial run-id was not captured before switching, so its strict before/after identity comparison was a test gap.

Targeted fresh-context regression after fixes: PASS. English activity labels repaired; zero bdi under option; canonical activity values confirmed by component mapping (not a nonexistent DOM value attribute). Arabic/Japanese settings had no English-prose fallback. Unsaved title/scope survived navigating to settings, changing language, and reopening the form, with no task created. Missing-key overlay and React option/hydration warnings were absent. The narrow final pass did not reopen the report sandbox; its early blocked-script observation is not silently erased.
