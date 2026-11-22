export type ReviewTraitId = 'planning' | 'attention' | 'simultaneous' | 'sequential';
export type ReviewTrait = { id: ReviewTraitId; title: string; summary: string; support: string; before: string; tips: string[] };
export const REVIEW_PROFILES: ReviewTrait[] = [
  { id: 'planning', title: '계획', summary: '목표와 순서를 먼저 정하면 연습의 범위를 잡기 쉽습니다.', support: '시작 전에 목표 한 줄과 끝낼 기준을 정해요.', before: '오늘의 목표와 어디까지 하면 끝낼지 적어 보세요.', tips: ['시작 전 목표를 정하세요.', '내가 정한 기준을 보고 마지막에 점검하세요.'] },
  { id: 'attention', title: '주의', summary: '지금 확인할 한 항목을 표시하면 집중과 복귀에 도움이 됩니다.', support: '지금 볼 항목 하나만 펼치고, 중단해도 멈춘 자리에 돌아와요.', before: '지금 확인할 항목 하나를 먼저 표시해 보세요.', tips: ['지금 한 항목만 봅니다.', '쉬었다면 표시된 자리부터 이어갑니다.'] },
  { id: 'simultaneous', title: '동시처리', summary: '전체를 먼저 보고 항목을 나란히 두면 관계와 차이를 찾기 쉽습니다.', support: '전체 지도를 먼저 읽고 같은 점과 다른 점을 나란히 봐요.', before: '두 대상을 한눈에 비교할 자리를 마련해 보세요.', tips: ['전체 순서를 먼저 훑어보세요.', '공통점과 차이점을 나란히 적어 보세요.'] },
  { id: 'sequential', title: '순차처리', summary: '하나씩 순서대로 하면 지금 단계와 다음 단계를 찾기 쉽습니다.', support: '한 단계씩 펼치고, 끝나면 다음 단계를 확인해요.', before: '가장 먼저 할 일 한 가지를 적어 보세요.', tips: ['현재 단계만 읽고 시작하세요.', '끝나면 다음 단계로 이동하세요.'] },
];

export type ReviewRoleId = 'service' | 'education' | 'operations' | 'content' | 'research';
export type ReviewNeed = { id: string; title: string; quote: string; keyword: string; reason: string };
export type ReviewRole = { id: ReviewRoleId; company: string; job: string; sourceTitle: string; sourceVersion: string; needs: ReviewNeed[] };
export const REVIEW_ROLES: ReviewRole[] = [
  { id: 'service', company: '모아서비스 (가상)', job: 'IT 서비스기획', sourceTitle: '모아서비스 역할 안내 예시', sourceVersion: '모의 자료 v1', needs: [
    { id: 'compare', title: '정보 비교와 판단', quote: '여러 이용 방법을 같은 기준으로 비교하고, 선택 이유를 정리합니다.', keyword: '비교 기준 세우기', reason: '같은 기준으로 살펴보고 판단 이유를 남기는 연습이 여러 선택지를 비교할 때 도움이 될 수 있습니다.' },
    { id: 'clarity', title: '핵심 정보 확인', quote: '서로 다른 안내에서 같은 내용과 추가 확인이 필요한 내용을 구분합니다.', keyword: '핵심 차이 찾기', reason: '일치하는 정보와 다시 볼 항목을 가려내는 연습이 안내의 핵심을 확인할 때 도움이 될 수 있습니다.' },
  ] },
  { id: 'education', company: '새봄교육 (가상)', job: '교육 운영 지원', sourceTitle: '새봄교육 역할 안내 예시', sourceVersion: '모의 자료 v1', needs: [
    { id: 'check', title: '누락 점검', quote: '준비 목록을 확인하고 빠진 항목과 확인이 필요한 항목을 표시합니다.', keyword: '확인사항 구분하기', reason: '준비 항목을 실제와 대조하고 미확인 사항을 남기는 연습이 누락을 점검할 때 도움이 될 수 있습니다.' },
    { id: 'sequence', title: '진행 순서 정리', quote: '참여자가 다음에 할 일을 쉽게 찾도록 간단한 순서로 안내합니다.', keyword: '다음 순서 설명하기', reason: '생활 속에서 어떤 일이 먼저인지 짧게 정리하는 연습이 진행 순서를 안내할 때 도움이 될 수 있습니다.' },
  ] },
  { id: 'operations', company: '여울상점 (가상)', job: '운영 지원', sourceTitle: '여울상점 운영 역할 안내 예시', sourceVersion: '모의 자료 v1', needs: [
    { id: 'priority', title: '우선순위 정리', quote: '함께 들어온 요청을 마감과 먼저 확인할 내용으로 나누어 적습니다.', keyword: '먼저 확인할 일 고르기', reason: '작은 할 일에서 먼저 볼 것을 고르는 연습으로 이어 볼 수 있습니다.' },
  ] },
  { id: 'content', company: '마루콘텐츠 (가상)', job: '콘텐츠 운영', sourceTitle: '마루콘텐츠 역할 안내 예시', sourceVersion: '모의 자료 v1', needs: [
    { id: 'edition', title: '안내 내용 대조', quote: '수정 전후 안내 문구를 비교하고 어느 대상에게 쓰는지 확인합니다.', keyword: '안내의 차이 표시하기', reason: '일상에서 비슷한 안내의 차이를 구분하는 연습으로 이어 볼 수 있습니다.' },
  ] },
  { id: 'research', company: '솔빛리서치 (가상)', job: '조사·자료 정리 지원', sourceTitle: '솔빛리서치 역할 안내 예시', sourceVersion: '모의 자료 v1', needs: [
    { id: 'sources', title: '자료 출처 정리', quote: '확인한 내용과 더 물어볼 내용을 구분하고 확인한 곳을 남깁니다.', keyword: '확인한 곳과 질문 구분하기', reason: '생활 속 선택 이유와 더 확인할 내용을 구분하는 연습으로 이어 볼 수 있습니다.' },
  ] },
];
export const REVIEW_PRACTICE_PROFILES = [
  {id:'planning',title:'계획',summary:'짧은 시간에 무엇부터 할지와 순서를 정리해 보는 연습이 필요합니다.'},
  {id:'attention',title:'주의',summary:'서로 비슷한 정보에서 빠뜨리기 쉬운 항목 하나를 확인하는 연습이 필요합니다.'},
  {id:'simultaneous',title:'동시처리',summary:'시간·비용·편리함처럼 여러 조건을 함께 보는 연습이 필요합니다.'},
  {id:'sequential',title:'순차처리',summary:'먼저 할 것과 그다음 할 것, 빠진 한 단계를 찾는 연습이 필요합니다.'},
] as const;
export type ReviewPractice = (typeof REVIEW_PRACTICE_PROFILES)[number];
export type ReviewChoice = { trait: ReviewTraitId; focus?:ReviewTraitId; role: ReviewRoleId; need: string };
export type EverydayMatch = ReviewChoice & { reportVersion: string; roleVersion: string };
export type EverydayPlan = { id: string; goal: string; scene: string; minutes: 5 | 10; materials: string; steps: string[]; linkReason: string; supportReason: string; kind?:'thought'; question?:string; entry?:'daily_note'|'imagined' };
export type WorksheetNotes = { before: string; observation: string; reflection: string; date: string };
export type EverydayDraft = { id: string; options: EverydayPlan[]; selected: EverydayPlan | null; worksheet: WorksheetNotes; worksheetsByPlan?:Record<string,WorksheetNotes>; phase: 'candidates' | 'worksheet'; registeredId?: string };
export type EverydayAttachment = { match: EverydayMatch; activity: EverydayPlan; worksheet: WorksheetNotes };
export type EverydayDraftSections = [string, string, string, string];
export type EverydayPreview = { evidence: string; source: string; sections: EverydayDraftSections };
export type StoryThoughts = { feeling:string; keyPoint:string; expression:string };
export const emptyStoryThoughts:StoryThoughts = {feeling:'',keyPoint:'',expression:''};
export type EverydayState = {
  choice: ReviewChoice;
  version: number;
  confirmedVersion: number | null;
  drafts: Record<string, EverydayDraft>;
  cursor: Record<string, number>;
  previews: Record<string, EverydayPreview>;
  originals: Record<string, EverydayDraftSections>;
  selected?: Record<string,string[]>;
  thoughts?: Record<string,StoryThoughts>;
  refinements?: Record<string,EverydayPreview>;
  dailyDrafts?: Record<string,import('./review-daily-model').DailyDraft>;
  dailySelectedDate?: string;
};
// Explicit independent report examples. Absence on a prior or external report
// is not an instruction to infer a weakness from the support strength.
export const initialChoice: ReviewChoice = { trait: 'planning',focus:'simultaneous', role: 'service', need: 'compare' };
export function contextOf(choice: ReviewChoice) {
  const trait = REVIEW_PROFILES.find((t) => t.id === choice.trait);
  const role = REVIEW_ROLES.find((r) => r.id === choice.role);
  const need = role?.needs.find((n) => n.id === choice.need);
  const focus=REVIEW_PRACTICE_PROFILES.find(f=>f.id===choice.focus);
  return trait && role && need ? { trait, role, need,focus } : null;
}
export function matchOf(choice: ReviewChoice): EverydayMatch | null {
  const c = contextOf(choice);
  return c ? { ...choice, reportVersion: choice.focus?'인지 강점·보완 프로필 예시 v2':'인지 지원 프로필 예시 v1', roleVersion: c.role.sourceVersion } : null;
}
export const matchKey = (match: EverydayMatch) => JSON.stringify([match.role, match.need, match.trait, match.reportVersion, match.roleVersion,...(match.focus?[match.focus]:[])]);
export const evidenceKey = (match: EverydayMatch, version: number) => JSON.stringify([matchKey(match), version]);
export const linkReason = (need: ReviewNeed, trait: ReviewTrait) => `${need.reason} ${trait.support} 이 연결은 연습 방법의 후보이며, 직무능력이나 향상을 증명하지 않습니다.`;

const simpleScenes = {
  morning:{goal:'오늘 아침에 한 일 적기',entry:'daily_note',scene:'오늘 아침에 일어나서 한 일을 떠올려 보세요. 3~5가지를 순서대로 적고, 대략 걸린 시간을 덧붙여 보세요.',
    write:'예: 일어나서 물 마시기(2분) → 세수하기(5분). 기억나는 만큼만 적어도 돼요.',question:'다음에는 순서나 시간을 어떻게 바꿔 보고 싶나요?',
    help:'첫 번째로 한 일이 기억나면 그다음 일을 하나만 떠올려 보세요.',useful:'순서와 시간을 적어 보는 연습은 할 일을 차례로 진행할 때도 활용할 수 있어요.'},
  route:{goal:'약속까지 20분, 어느 길로 갈까?',entry:'imagined',scene:'약속까지 20분 남았어요. 익숙하지만 조금 먼 길과, 가깝지만 처음 가는 길이 있습니다. 나는 어느 길을 고를까요?',
    write:'고른 길과 그 이유를 두세 줄로 적어 보세요.',question:'무엇을 먼저 확인하고 싶나요?',
    help:'먼저 한 길을 떠올리고, 다른 길과 비교할 점을 하나만 골라 보세요.',useful:'무엇을 먼저 확인할지 생각하는 연습은 선택지를 살펴볼 때도 활용할 수 있어요.'},
  bag:{goal:'나가기 전에 챙길 것 적기',entry:'daily_note',scene:'나가기 전에 필요한 준비물을 몇 개 적어 보세요. 적은 목록을 한 번 다시 읽어 봅니다.',
    write:'챙길 물건과 목록을 본 뒤 든 생각을 짧게 적어 보세요.',question:'다시 보니 빠진 물건이나 한 번 더 확인할 물건이 있나요?',
    help:'한 물건씩 읽고, 아직 떠오르지 않는 것은 빈칸으로 둬도 좋아요.',useful:'목록을 다시 보는 습관은 필요한 것이 빠지지 않았는지 확인할 때도 쓸 수 있어요.'},
} as const;
const orderByFocus:Record<ReviewTraitId,(keyof typeof simpleScenes)[]> = {
  planning:['morning','bag','route'], attention:['bag','route','morning'],
  simultaneous:['route','bag','morning'], sequential:['morning','bag','route'],
};
export function generateEverydayPlans(need: ReviewNeed, trait: ReviewTrait, focus?:ReviewPractice): EverydayPlan[] {
  if (!focus) return [];
  return orderByFocus[focus.id].map(id=>{
    const scene=simpleScenes[id];
    const extra=focus.id==='attention'||focus.id==='sequential';
    return {id:`simple-${id}`,goal:scene.goal,scene:scene.scene,minutes:5,entry:scene.entry,kind:'thought',question:scene.question,
      materials:'종이와 펜 또는 휴대폰 메모',steps:[ '생활 장면이나 작은 상황을 읽어요.',scene.write,scene.question,...(extra?[scene.help]:[])],
      linkReason:`${scene.useful} LAB에서 본 ${need.title}과 이어 볼 수 있지만, 역량이 늘었다는 뜻은 아니에요.`,supportReason:trait.support};
  });
}
export const validEverydayPlan = (p: EverydayPlan) => !!p.goal.trim() && !!p.scene.trim() && !!p.materials.trim() &&
  [5, 10].includes(p.minutes) && p.steps.length >= 3 && p.steps.length <= 4 && p.steps.every((s) => !!s.trim());
export function dailyDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function buildGroundedSections(role: ReviewRole | null, need: ReviewNeed | null, ...notes: { action: string; result: string; learning: string; next: string; thought?:boolean; dailyNote?:boolean; direct?:boolean }[]): EverydayDraftSections {
  return [
    need ? `일상 속에서 선택의 이유를 정리하는 연습을 돌아보며 ${need.keyword}에 관심을 두었습니다.` : '',
    role && need ? `${role.job}의 필요역량으로 살펴본 ‘${need.title}’을 생활 속에서 어떻게 연습할 수 있을지 생각해 보았습니다.` : '',
    notes.map(note=>[note.direct?'내가 직접 적은 일상 기록':note.dailyNote?'일상을 돌아보고 내가 적은 기록 (근무 경험 아님)':note.thought?'가정 상황에서 선택과 이유를 써 본 생각 연습 (실제 수행 아님)':'일상 연습에서 직접 한 행동', note.action, ...(note.result.trim() ? [note.thought||note.direct?'선택하거나 확인한 이유':'관찰한 결과', note.result] : [])].join('\n')).join('\n\n'),
    notes.flatMap(note=>[...(note.learning.trim() ? [note.thought?'달리 보게 된 점':'배운 점', note.learning] : []), ...(note.next.trim() ? [note.thought?'내가 따로 적은 생활 적용 기록':'다음에 적용할 방법', note.next] : [])]).join('\n'),
  ];
}
