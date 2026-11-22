import { type Activity, type Reflection, type PracticeLink, type SupportDraft } from './types';
import { tx } from './i18n-runtime';
export const activityTitle=(activity:Activity)=>activity.titleSource?tx(activity.titleSource):activity.title;
export const productText=(value:string,source?:string)=>source?tx(source):value;
export function reflectionTitle(reflection:Reflection,activities:Activity[]){
  const a=activities.find(a=>a.id===reflection.activityId);
  return a&&reflection.title===`${a.title} 회고`?`${activityTitle(a)} ${tx('회고')}`:reflection.title;
}
export const TASK_KINDS = {
  research: {name:'조사·분석',description:'관찰한 자료를 같은 기준으로 비교해요.',title:'두 사례를 비교하는 조사 메모',role:'자료를 살펴보는 조사 담당자',problem:'두 사례의 공통점과 차이를 근거로 설명하기',steps:['공개 자료에서 사례 두 개 고르기','같은 기준 세 가지로 비교 표 만들기','차이와 확인하지 못한 점 구분하기'],artifact:'출처가 있는 비교 표 한 장',questions:['어떤 기준으로 비교했나요?','자료만으로 알 수 없는 점은 무엇인가요?']},
  propose: {name:'기획·제안',description:'누구의 어떤 불편을 줄일지 작은 제안을 만들어요.',title:'한 사람의 불편을 줄이는 제안서',role:'서비스 아이디어를 제안하는 기획 담당자',problem:'가상 사용자의 불편 한 가지를 줄이는 방법 제안하기',steps:['가상 사용자의 불편 한 가지 정하기','서로 다른 해결 방법 두 개 적기','선택 이유와 확인할 점을 한 장에 정리하기'],artifact:'문제와 확인 방법이 담긴 제안서 한 장',questions:['누구의 어떤 불편을 다루나요?','제안이 도움이 되는지 어떻게 확인할까요?']},
  make: {name:'제작·설계',description:'작은 모형이나 초안을 만들고 바꿔 봐요.',title:'한 기능을 보여 주는 작은 모형',role:'초안을 만드는 설계 담당자',problem:'필요한 기능 하나를 종이나 간단한 도구로 표현하기',steps:['모형이 보여 줄 기능 하나 정하기','종이나 간단한 도구로 첫 초안 만들기','직접 살펴보고 수정할 부분 표시하기'],artifact:'작은 모형 또는 화면 초안과 수정 메모',questions:['어떤 기능을 표현했나요?','초안을 바꾸고 싶은 이유는 무엇인가요?']},
  solve: {name:'문제 해결',description:'원인을 나누어 보고 안전한 해결 방법을 시험해요.',title:'문제의 원인을 살펴보는 작은 실험',role:'개선 방법을 살펴보는 문제 해결 담당자',problem:'가상 상황의 문제 원인과 확인 방법 구분하기',steps:['문제와 추측한 원인을 따로 적기','안전하게 확인할 방법 하나 설계하기','예상과 실제 관찰을 구분할 빈 기록 표 만들기'],artifact:'원인 가설과 확인 절차를 적은 실험 계획',questions:['확인한 사실과 추측은 어떻게 다른가요?','어떤 관찰이 생각을 바꾸게 할까요?']},
  explain: {name:'설명·소통',description:'처음 듣는 사람도 이해하도록 설명을 준비해요.',title:'처음 듣는 사람을 위한 짧은 안내',role:'내용을 쉽게 전달하는 소통 담당자',problem:'가상 청중이 이해할 수 있는 안내 만들기',steps:['설명을 들을 가상 청중 정하기','핵심 세 가지와 쉬운 예 하나 고르기','한 장 안내문을 쓰고 어려운 표현 고치기'],artifact:'출처가 있는 한 장 안내문',questions:['누구에게 설명하나요?','어떤 표현을 더 쉽게 바꿀 수 있나요?']},
} as const;
export type TaskKind=keyof typeof TASK_KINDS;
export interface SimulationTask { productSources?:Partial<Record<'title'|'role'|'problem'|'steps'|'artifact'|'scope'|'questions'|'scenario',string|string[]>>;kind:TaskKind;scenario:string;title:string;role:string;problem:string;steps:string[];artifact:string;scope:string;questions:string[];minutes:number;strengthIds:string[];method:PracticeLink['method']; }
export const SCENARIOS=['학교에서 이용하는 서비스의 불편을 줄이는 가상 팀','관심 분야를 소개하는 가상 전시 준비 팀','자원을 아끼는 방법을 찾는 가상 지역 모임'];
export function simulationTask(kind:TaskKind,scenario:string,method:PracticeLink['method'],strengthIds:string[],round=0):SimulationTask{
  const template=TASK_KINDS[kind];
  return {kind,scenario,title:template.title,role:template.role,problem:template.problem,steps:[...template.steps],artifact:template.artifact,
    scope:method!=='original'?scopeSuggestion(method,round):round%2?'대상 하나를 정하고 15분 동안 첫 단계만 해 보세요.':'대상 두 개 이내로 정하고 30분 동안 초안 한 개를 만들어 보세요.',
    questions:[...template.questions],minutes:round%2?15:30,strengthIds,method};
}
export function scopeSuggestion(method:PracticeLink['method'],round=0){
  const choices={
    original:['대상 하나를 고르고 15분 동안 궁금한 점 두 개를 기록해 보세요.','공개 자료 한 개를 20분 동안 살펴보고 확인할 점 세 개를 정해 보세요.'],
    observe:['주변 대상 두 개를 15분 동안 관찰하고 같은 기준 세 가지로 비교해 보세요.','대상 하나의 변화를 두 번 관찰하고 차이를 표 한 장에 기록해 보세요.'],
    listen:['동의를 받은 한 사람에게 15분 이내로 질문 두 개를 물어보는 계획을 세워 보세요.','공개 인터뷰 한 편을 읽고 직접 물어보고 싶은 질문 세 개를 적어 보세요.'],
    make:['종이나 간단한 도구로 30분 동안 기능 하나를 보여 주는 초안을 만들어 보세요.','20분 동안 초안 한 개를 만들고 바꾸고 싶은 부분 두 개를 표시해 보세요.'],
    read:['공식 자료 한 개를 20분 동안 읽고 원문 근거와 내 생각을 나누어 기록해 보세요.','짧은 글 두 개를 읽고 같은 점 하나와 더 확인할 점 두 개를 적어 보세요.'],
  };
  return choices[method][round%2];
}
export const SUPPORT_QUESTIONS=['이번 활동에서 직접 확인하고 싶은 것은 무엇인가요?','어떤 순서로 해 보고 무엇을 남길 건가요?','실제로 해 본 일과 아직 계획인 일은 어떻게 다른가요?','새롭게 궁금해진 점과 다음에 해 볼 일은 무엇인가요?'];
export const blankSupport=():SupportDraft=>({scope:'',questions:[]});
