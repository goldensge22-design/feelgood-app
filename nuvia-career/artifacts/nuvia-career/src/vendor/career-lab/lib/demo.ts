import { emptyState, today, type LabState } from './types';
import { exampleStoryTemplate } from './story-template';

// 예시 체험 전용 가상 데이터. 실제 사용자 기록과 다른 저장 키에 보관됩니다.
export function demoState(): LabState {
  const s = emptyState();
  const t = '2025-01-01T00:00:00.000Z';
  s.welcomed = true; s.grade = 'high';
  s.tests = [{ id: 'dt1', name: '(예시) 학교에서 받은 진로 흥미 검사', date: '2025-03-10', results: '(예시) 탐구형·예술형 점수가 상대적으로 높게 나옴', features: '(예시) 혼자 깊이 생각하는 활동을 선호', inputMethod: 'manual', updatedAt: t,
    strengths: [{ id: 'ds1', text: '관찰하고 원인을 찾는 힘', kind: 'test', fit: 'similar', note: '' }, { id: 'ds2', text: '그림으로 정리하기', kind: 'self', fit: '', note: '노트 정리를 그림으로 함' }] }];
  s.interests = [{ id: 'di1', text: '환경', reason: '(예시) 여름날 그늘과 햇볕 아래의 온도 차이가 궁금했음' }, { id: 'di2', text: '디자인', reason: '(예시) 포스터 만들기가 재미있었음' }];
  s.statement = '(예시) 관찰하는 힘과 그림 정리를 살려, 더위로 힘든 사람들을 위한 공간을 탐색하고 싶어요.';
  s.fields = { 'f-env': { status: 'interested', note: '', date: '2025-03-12' }, 'f-space': { status: 'interested', note: '', date: '2025-03-12' }, 'f-ai': { status: 'hold', note: '코딩은 아직 잘 모르겠음', date: '2025-03-12' } };
  s.savedMajors = ['m-envsci', 'm-arch', 'm-civil']; s.compare = ['m-envsci', 'm-arch']; s.tempMajor = 'm-envsci';
  s.tempHistory = [{ majorId: 'm-envsci', date: '2025-03-15' }];
  s.design = { majorCompetencies: '측정과 기록, 근거 기반 주장', connection: '(예시) 관찰하는 힘이 측정·기록과 이어진다고 생각함', jobs: [{ id: 'dj1', title: '환경 연구원', type: 'job', why: '원인을 찾는 일이 좋아서' }, { id: 'dj2', title: '도시 계획가', type: 'role', why: '그늘 공간 설계에 관심' }],
    startup: { target: '여름철 버스 정류장 이용 어르신', problem: '그늘이 없어 기다리기 힘듦', idea: '그늘 정보 지도', experiment: '정류장 3곳 온도 측정과 이용객 5명 질문' }, futurePath: '(예시) 환경과학 → 도시 기후 데이터', toLearn: '데이터 시각화', updatedAt: t };
  s.activities = [{ id: 'da1', title: '(예시) 동네 그늘 온도 재 보기', kind: '관찰', date: '2025-03-20', durationMin: 60, purpose: '그늘이 실제로 얼마나 시원한지 확인', todos: [{ id: 'dt1', text: '온도계 준비', done: true }, { id: 'dt2', text: '3곳 측정', done: true }], artifact: '측정 표', sourceType: 'role', sourceId: 'r-envres', sourceLabel: '환경 연구원', status: 'done', createdAt: t, updatedAt: t }];
  s.reflections = [{ id: 'dr1', activityId: 'da1', title: '(예시) 그늘 온도 측정 회고', date: '2025-03-21', did: '(예시) 정류장 3곳의 온도를 같은 시각에 측정', role: '혼자 기획·측정', fun: '숫자 차이가 생각보다 컸음', hard: '시간 맞추기', learned: '같은 조건으로 재야 비교가 된다', question: '나무 그늘과 지붕 그늘은 다를까?', next: '나무 그늘도 측정', links: [], photo: '', direction: 'more', createdAt: t, updatedAt: t }];
  s.activities.push({ id: 'da2', title: '(예시) 나무 그늘과 지붕 그늘 비교하기', kind: '관찰', date: today(), durationMin: 30, purpose: '회고에서 생긴 질문을 다음 탐색으로 이어가기', todos: [{ id: 'dto3', text: '같은 시각에 비교할 두 장소 정하기', done: false }], artifact: '온도 비교 표', sourceType: 'major', sourceId: 'm-envsci', sourceLabel: '환경과학', status: 'planned', createdAt: t, updatedAt: t });
  s.story = { paragraphs: exampleStoryTemplate(s), versions: [], basedAt: t };
  return s;
}
