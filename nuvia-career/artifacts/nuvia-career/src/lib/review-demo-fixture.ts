import type { CareerExperience, CareerOverview, CareerState } from '@workspace/api-client-react';

// Fictional course material only: not an assessment, posting or external record.
export const REVIEW_PERSON = { name: '한별', caption: '교내 서비스에 관심 있는 가상 대학생' };
export const REVIEW_TRAITS = [
  { title: '계획', description: '비교할 항목과 완료 기준을 먼저 정하면 정리하기 쉽습니다.' },
  { title: '주의', description: '바뀐 문구나 확인이 필요한 부분에 표시해 보세요.' },
  { title: '동시', description: '안내문을 나란히 두고 공통점과 차이를 살펴보세요.' },
  { title: '순차', description: '신청 순서를 한 단계씩 적고 안내 내용과 대조해 보세요.' },
];
export const REVIEW_OPTIONS = [
  { id: 'service', company: '모아서비스 (가상)', job: 'IT 서비스기획', keyword: '비교 기준 세우기', reason: '서로 다른 이용 안내를 같은 기준으로 비교하는 연습과 연결됩니다.' },
  { id: 'education', company: '새봄교육 (가상)', job: '교육 운영 지원', keyword: '확인사항 구분하기', reason: '확정된 내용과 담당자에게 물어볼 내용을 구분하는 연습과 연결됩니다.' },
];
export const REVIEW_ACTIVITY = {
  title: '교내 예약 안내 비교 (모의 연습)',
  action: '모의 자료의 예약 안내 두 편을 나란히 놓고 신청 자격, 순서, 마감 안내를 대조했습니다.',
  result: '신청 자격 안내가 서로 다른 부분을 발견해 확인 질문으로 따로 적었습니다.',
  learning: '안내가 다르면 바로 결론을 내리기보다 확정된 내용과 확인할 내용을 나누어야 한다고 배웠습니다.',
};
export const REVIEW_RECORD_ID = 'review-demo-booking-simulation-v1';
export function reviewExperience(): CareerExperience {
  return {
    id: REVIEW_RECORD_ID, ...REVIEW_ACTIVITY,
    strengths: [], criterionIds: [], source: 'example', sourceVersion: 'review-sample-v1',
    confirmed: true,
  };
}
export function reviewWorkspace(): CareerState {
  return {
    selectedJob: '', report: null, criteria: [], activities: [],
    experiences: [reviewExperience()], applications: [],
  };
}
export const REVIEW_OVERVIEW: CareerOverview = {
  criteria: [],
  integrations: [
    { id: 'dcas', status: 'unconnected', requirements: [] },
    { id: 'planner', status: 'unconnected', requirements: [] },
    { id: 'company', status: 'unconnected', requirements: [] },
  ],
};
