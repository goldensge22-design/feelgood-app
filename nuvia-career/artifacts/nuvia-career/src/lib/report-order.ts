/**
 * Adapter for developer-supplied original report job order. Keeps the order
 * and reasons EXACTLY as supplied: no sorting, no recomputation, no filling.
 * Not connected to any backend yet.
 */
export interface ReportJob { rank: number; title: string; reason: string }
export interface ReportOrder { jobs: ReportJob[]; choice: 'report' | 'direct' | 'undecided'; directJob?: string }

export function adaptReportOrder(raw: unknown): ReportOrder | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { jobs?: unknown; choice?: unknown; directJob?: unknown };
  if (!Array.isArray(r.jobs)) return null;
  const jobs: ReportJob[] = [];
  r.jobs.forEach((j, i) => {
    if (j && typeof j === 'object' && typeof (j as ReportJob).title === 'string') {
      jobs.push({ rank: i + 1, title: (j as ReportJob).title, reason: typeof (j as ReportJob).reason === 'string' ? (j as ReportJob).reason : '' });
    }
  });
  const choice = r.choice === 'direct' || r.choice === 'undecided' ? r.choice : 'report';
  return { jobs, choice, directJob: typeof r.directJob === 'string' ? r.directJob : undefined };
}

/** Synthetic adapter input (clearly labelled in UI). */
export const SYNTHETIC_REPORT_INPUT = {
  jobs: [
    { title: 'IT 서비스기획', reason: '[합성] 계획 관련 응답 경향' },
    { title: '디지털 마케팅', reason: '[합성] 주의 관련 응답 경향' },
  ],
  choice: 'report',
};
