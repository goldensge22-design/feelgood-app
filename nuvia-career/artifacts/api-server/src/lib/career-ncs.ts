import type { CareerCriterion } from "@workspace/api-zod";

// Verified on the publisher's public page, not derived from a classification
// code or from a user's test score. This is a pinned source snapshot, not a
// live assertion of job-specific competence. asOf is the retrieval date.
// Publisher: HRD Korea, NCS 직업공통능력, 문제해결능력, 26v1.
const sourceUrl = "https://www.ncs.go.kr/unity/th03/TH0309.do?jobCd=03";
export const officialNcsCriteria: CareerCriterion[] = [
  {
    id: "ncs-common-analysis-26v1",
    title: "문제분석능력",
    description: "업무 수행 중 발생한 문제를 체계적으로 인식·분석하고, 원인과 영향을 분석하여 해결 방향을 설정하는 능력",
    sourceType: "official_ncs",
    sourceLabel: "한국산업인력공단 · NCS 직업공통능력 · 문제해결능력",
    sourceUrl, asOf: "2026-10-23", version: "26v1-web-2026-10-23",
  },
  {
    id: "ncs-common-alternatives-26v1",
    title: "대안발굴능력",
    description: "업무상 문제의 원인에 근거하여 다양한 해결 방안을 창의적, 논리적으로 탐색하고, 실행 가능성과 효과성을 비교 및 검토하는 능력",
    sourceType: "official_ncs",
    sourceLabel: "한국산업인력공단 · NCS 직업공통능력 · 문제해결능력",
    sourceUrl, asOf: "2026-10-23", version: "26v1-web-2026-10-23",
  },
  {
    id: "ncs-common-decision-26v1",
    title: "의사결정능력",
    description: "업무와 관련한 문제를 해결하기 위해 검토된 대안을 기준에 따라 합리적으로 선택 및 실행하고, 그 결과를 평가 및 성찰하여 개선점을 도출하는 능력",
    sourceType: "official_ncs",
    sourceLabel: "한국산업인력공단 · NCS 직업공통능력 · 문제해결능력",
    sourceUrl, asOf: "2026-10-23", version: "26v1-web-2026-10-23",
  },
];
