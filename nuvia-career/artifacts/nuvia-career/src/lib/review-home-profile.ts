import { REVIEW_PROFILES, type ReviewRoleId, type ReviewTraitId } from './review-everyday-model';

export type HomeReportJob = { id: string; title: string; reason?: string | null; source?: string | null; reviewRole?: ReviewRoleId };

/** Display data only. The verified result provider must supply these fields;
 * this does not calculate scores or assign interpretations. */
export type HomeReportSummary = {
  assessedOn?: string | null;
  scale?: string | null;
  areas: { id: string; label: string; score: number | string | null; unit?: string | null }[];
  strengths?: readonly string[];
  growthPoints?: readonly string[];
  topJobs?: readonly HomeReportJob[];
};

const demoAreas = [
  { id: 'planning', label: '계획력' },
  { id: 'attention', label: '주의력' },
  { id: 'simultaneous', label: '동시처리' },
  { id: 'sequential', label: '순차처리' },
] as const;

const syntheticScores: Record<ReviewTraitId, readonly [number, number, number, number]> = {
  planning: [72, 64, 58, 66],
  attention: [61, 74, 66, 60],
  simultaneous: [60, 63, 75, 65],
  sequential: [0, 60, 66, 73],
};

const syntheticStrengths: Record<ReviewTraitId, readonly string[]> = {
  planning: ['계획력 · 목표와 순서 정하기'],
  attention: ['주의력 · 지금 확인할 항목에 집중하기'],
  simultaneous: ['동시처리 · 전체와 항목을 나란히 보기'],
  sequential: ['순차처리 · 한 단계씩 진행하기'],
};

const syntheticJobs: readonly HomeReportJob[] = [
  { id: 'demo-service', title: 'IT 서비스기획', reason: '안내를 같은 기준으로 비교하고 개선 이유를 정리하는 예시 직무입니다.', source: '가상 결과지 · 직무 추천 예시 v1', reviewRole: 'service' },
  { id: 'demo-education', title: '교육 운영 지원', reason: '준비 항목과 진행 순서를 확인하는 예시 직무입니다.', source: '가상 결과지 · 직무 추천 예시 v1', reviewRole: 'education' },
  { id: 'demo-operations', title: '운영 지원', reason: '여러 요청에서 먼저 확인할 일을 정하는 예시 직무입니다.', source: '가상 결과지 · 직무 추천 예시 v1', reviewRole: 'operations' },
  { id: 'demo-content', title: '콘텐츠 운영', reason: '안내 문구의 수정 전후와 적용 대상을 비교하는 예시 직무입니다.', source: '가상 결과지 · 직무 추천 예시 v1', reviewRole: 'content' },
  { id: 'demo-research', title: '조사·자료 정리 지원', reason: '확인한 자료와 아직 확인할 내용을 구분하는 예시 직무입니다.', source: '가상 결과지 · 직무 추천 예시 v1', reviewRole: 'research' },
];

export function reviewHomeFixture(trait: ReviewTraitId, focus?: ReviewTraitId): HomeReportSummary {
  const focusLabel = REVIEW_PROFILES.find((profile) => profile.id === focus)?.title;
  return {
    assessedOn: '2026-01-01',
    areas: demoAreas.map((area, index) => ({ ...area, score: syntheticScores[trait][index] })),
    strengths: syntheticStrengths[trait],
    topJobs: syntheticJobs,
    // The review report's focus is selected independently from its example scores.
    growthPoints: focusLabel ? [`${focusLabel} 연습`] : [],
  };
}

export function presentHomeReport(report: HomeReportSummary | null) {
  // Retain display precision, punctuation, units and labels from the source.
  // Numeric zero is a provided value; absent, blank or non-finite values are not.
  return {
    areas: report ? report.areas.map(({ id, label, score, unit }) => ({
      id, label, score: (typeof score === 'number' ? Number.isFinite(score) : !!score?.trim()) ? String(score) : null,
      unit,
    })) : demoAreas.map((area) => ({ ...area, score: null, unit: null })),
    assessedOn: report?.assessedOn || null,
    scale: report?.scale || null,
    strengths: report?.strengths ?? [],
    growthPoints: report?.growthPoints ?? [],
    topJobs: report?.topJobs ?? [],
  };
}
