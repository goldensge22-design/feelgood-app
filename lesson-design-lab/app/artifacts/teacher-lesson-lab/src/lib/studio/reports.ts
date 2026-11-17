import { T } from '@/i18n/tx';
import { reportLabel } from './report-labels';
import type { Mission, ReportSnapshot } from './types';

/** Assign rank BEFORE reading/filtering the title. Empty ranks remain explicit in all views. */
export const rankedTop5 = (report: ReportSnapshot) => Array.from({ length: 5 }, (_, index) => ({
  rank: index + 1, title: report.top5[index]?.title ?? '', reason: report.top5[index]?.reason ?? '',
}));
export const top5Text = (report: ReportSnapshot) => rankedTop5(report)
  .map((entry) => `${entry.rank}. ${entry.title || T('미입력')} — ${entry.reason}`).join('\n');
export const reportBasisLabel = (mission: Mission) => mission.reportBasis === undefined
  ? reportLabel('unknown') : mission.reportBasis === null ? reportLabel('none')
  : `${reportLabel('basis')} · v${mission.reportBasis.revision ?? 1} · ${mission.reportBasis.test} / ${mission.reportBasis.version}`;
