/**
 * Internal, fictional-review evidence only. Rendered exclusively on /review.
 * File references identify repeatable tests and their development run output.
 * Native language review, real devices and FeelGood integration are not implied.
 */
export const REVIEW_EVIDENCE: Record<string, string> = {
  'chk.menu': 'planner.json / parent-menu-responsive-360-768-1440 · responsive.json',
  'chk.timer': 'planner.json / planner-start-pause-refresh-resume-end-reflect-weekly · recovery.json / two-independent-browser-sessions-same-server-progress',
  'chk.retry': 'planner.json / parent-first-week-confirm-save-duplicate · edge.json / server-committed-response-lost-refresh-retry-no-duplicate',
  'chk.conflict': 'edge.json / browser-conflict-retains-input-refreshes-version-retry · recovery.json / browser-save-503-input-preserved-refresh-retry',
  'chk.story': 'history-story-security.json / self-explicit-record-only-story-template-save-source-link · edge.json / browser-story-stale-source-blocked-reconfirm-save',
  'chk.teacher': 'history-story-security.json / family-direct-teacher-and-outside-subject-blocked · teacher-separate-shell-only-shared-records-outside-blocked · api-regression.txt',
  'chk.lang': 'locales.json · recovery.json / language-switch-active-timer-child-route-and-draft-preserved · responsive.json / all-15-languages-reload-no-korean-ui-flash',
  'chk.locales': 'Historical: locales.json / 15 × 2 × 5 routes. Expanded execution: dedicated 15-language QA table below · docs/MY-NUVIA-FULL-QA.md. Native-speaker review: NOT RUN',
  'chk.device': 'responsive.json / 360, 768, 1440 CSS px · accessibility.json · physical devices / screen reader: NOT RUN',
  'chk.real': 'FeelGood auth / production integration / live AI: NOT CONNECTED',
};
