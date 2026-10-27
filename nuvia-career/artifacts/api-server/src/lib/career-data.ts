import type { CareerState, CareerCriterion, CareerOverview } from "@workspace/api-zod";
import { officialNcsCriteria } from "./career-ncs";

// Authored common activities, NOT official NCS competency descriptions.
export const commonCriteria: CareerCriterion[] = [
  {
    id: "common-observe", title: "문제를 발견하고 근거로 설명하기",
    description: "일상에서 불편을 관찰하고, 실제 안내·신청 화면·사용자 의견처럼 확인 가능한 근거를 기록해 보세요.",
    sourceType: "common_example", sourceLabel: "NUVIA 공통 실천 예시 · 공식 NCS 기준 아님",
    asOf: "2026-10-23", version: "1",
  },
  {
    id: "common-compare", title: "비교 기준을 세우고 정보 정리하기",
    description: "비교할 항목과 완료 조건을 먼저 정한 뒤 서로 다른 안내나 절차의 공통점과 차이를 정리해 보세요.",
    sourceType: "common_example", sourceLabel: "NUVIA 공통 실천 예시 · 공식 NCS 기준 아님",
    asOf: "2026-10-23", version: "1",
  },
  {
    id: "common-reflect", title: "행동의 변화와 배움을 돌아보기",
    description: "실제로 한 행동과 바꾼 점을 돌아보고 관찰한 결과와 배움을 자신의 말로 남겨 보세요.",
    sourceType: "common_example", sourceLabel: "NUVIA 공통 실천 예시 · 공식 NCS 기준 아님",
    asOf: "2026-10-23", version: "1",
  },
];

export const careerOverview: CareerOverview = {
  criteria: [...commonCriteria, ...officialNcsCriteria],
  integrations: [
    {
      id: "dcas", status: "unconnected",
      requirements: [
        "기존 결과지 URL과 인증·동의·소유권 확인 계약",
        "결과 조회 API와 익명화된 응답 예시: 원래 점수·척도, 4축, 해석, 전공, 직무 TOP5 순서·근거, NCS 내용",
        "순차 처리의 기존 식별자·명칭, 81유형·IQ 및 사용자·검사·결과 식별자 보존 계약",
        "허용된 원래 결과지 복귀 URL, 결과 버전·권한 철회 확인 API",
      ],
    },
    {
      id: "planner", status: "unconnected",
      requirements: [
        "기존 NUVIA PLANNER 소스 또는 API 계약과 원본 복귀 URL",
        "사용자 소유권·공유 범위·우선순위 계약 및 테스트 계정 접근",
        "사용자 수락 후 멱등 계획 생성 API, 중단·재개·부분 완료·회고 API",
        "선택 필드 경험 전송, 원본 버전·삭제·공유 철회 조회 계약",
      ],
    },
    {
      id: "company", status: "no_data",
      requirements: [
        "공개 승인된 인재상·기대 행동만 제공하는 API",
        "출처 URL·게시 시점·버전·만료·공개 권한 상태",
        "직원 평가·점수·면접관 메모·비공개 가중치·다른 지원자 자료 제외",
      ],
    },
  ],
};

export function emptyCareerState(): CareerState {
  return {
    selectedJob: "", report: null, criteria: structuredClone(commonCriteria),
    experiences: [], activities: [], applications: [],
  };
}

export function exampleCareerState(): CareerState {
  return {
    ...emptyCareerState(),
    selectedJob: "IT 서비스기획",
    report: {
      isExample: true,
      title: "검증용 가상 결과 · 실제 D-CAS 검사결과 아님",
      major: "대학생 · 전공 정보 미제공",
      interpretation: "순차와 계획을 활동 전략으로 활용하는 가상 여정입니다. 점수·척도·IQ·81유형은 생성하지 않았습니다.",
      axes: [
        { id: "planning", label: "계획", strategy: "비교 기준과 완료 조건 정하기", interpretation: "활동 전에 목표와 확인할 근거를 정해 봅니다." },
        { id: "attention", label: "주의", strategy: "핵심 확인과 방해 줄이기", interpretation: "관찰할 안내 항목에 집중합니다." },
        { id: "simultaneous", label: "동시", strategy: "비교·관계 정리", interpretation: "서로 다른 안내의 공통점과 차이를 비교합니다." },
        { id: "sequential", label: "순차", strategy: "단계와 순서 기록", interpretation: "신청 과정을 순서대로 기록합니다." },
      ],
      jobs: [{ title: "IT 서비스기획", reason: "검증 여정에서 정한 관심 직무입니다. 검사 점수로 산출한 추천이나 실제 직무 순위가 아닙니다." }],
    },
    experiences: [{
      id: "example-experience", title: "교내 예약 서비스의 서로 다른 안내를 비교했어요",
      action: "교내 공간 예약의 신청 단계를 순서대로 기록하고, 웹 안내와 현장 안내에서 준비 서류가 다르게 적힌 부분을 비교했습니다.",
      result: "안내마다 준비 서류가 다르다는 점을 확인해 차이를 표로 정리했습니다. 실제 개선 효과는 아직 확인하지 못했습니다.",
      learning: "막연한 불편을 설명하려면 어떤 화면과 안내를 비교했는지 근거를 먼저 남겨야 한다는 점을 배웠습니다.",
      strengths: ["순차", "계획"], criterionIds: ["common-observe", "common-compare"],
      confirmed: true, source: "example", sourceId: "example-activity", sourceVersion: "1", permissionStatus: "current",
    }],
    activities: [{
      id: "example-activity", title: "교내 예약 신청 단계 살펴보기", goal: "서로 다른 안내에서 불편의 근거 찾기",
      steps: "1. 신청 단계 기록\n2. 비교할 안내 항목 정하기\n3. 차이와 실제 근거 정리",
      date: "", completion: "실제 확인한 안내와 차이를 한 가지 이상 기록", evidence: "웹 안내와 현장 안내에서 확인한 내용",
      strengths: ["순차", "계획"], criterionId: "common-observe", status: "partial",
      action: "신청 단계를 기록하고 서로 다른 준비 서류 안내를 비교했습니다.",
      changed: "처음에는 신청 시간만 비교하려다 준비 서류도 함께 확인했습니다.",
      result: "서로 다른 안내를 발견했습니다.", learning: "불편의 근거를 남기는 것이 먼저라는 점을 배웠습니다.",
    }],
    applications: [{
      id: "example-application", company: "가상 기업 · NUVIA LAB", job: "IT 서비스기획",
      question: "[가상 문항] 일상에서 문제를 발견하고 근거를 정리한 경험을 소개해 주세요.",
      limit: 700, countSpaces: true, writingLanguage: "ko",
      experienceIds: ["example-experience"], criterionIds: ["common-observe"],
      text: "",
    }],
  };
}
