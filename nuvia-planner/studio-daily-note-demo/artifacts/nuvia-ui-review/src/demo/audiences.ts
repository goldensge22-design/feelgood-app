export type Audience='enterprise'|'university'|'school';
export type AudienceInfo={label:string;title:string;description:string;scenario:string;steps:string[];limits:string;taskTitle:string;subject:string;activity:'학습'|'생활'|'업무'|'기타';stage:'adult'|'middle'};
export const AUDIENCE_KEYS:Audience[]=['enterprise','university','school'];
export function audienceFrom(search:string):Audience|null{
 let v:string|null=null;
 try{v=new URLSearchParams(search).get('demo');}catch{return null;}
 return v&&(AUDIENCE_KEYS as string[]).includes(v)?v as Audience:null;
}
export const AUDIENCES:Record<Audience,AudienceInfo>={
 enterprise:{label:'기업',title:'기업 구성원의 개인 업무 정리 데모',description:'구성원이 스스로 업무 흐름을 계획하고 후속 일을 챙기는 개인 작업대 가상 데이터 데모입니다.',
  scenario:'한 구성원이 이번 주 업무를 스스로 나누고, 회의 뒤 후속 일을 챙기고, 하루를 짧게 돌아보는 장면입니다. 관리자가 구성원을 평가하거나 들여다보는 도구가 아닙니다.',
  steps:['이번 주 업무 흐름을 작은 단위로 나눠 작업대에 올립니다.','회의 뒤 생긴 후속 일을 보관함에 모아 두고 하나씩 꺼냅니다.','하루 끝에 스스로 어땠는지 짧게 기록합니다. 이 기록은 본인만 봅니다.'],
  limits:'구성원 평가·근태 확인·성과 점수 용도로 쓰지 않습니다. 관리자 화면이나 팀 집계 기능은 없습니다.',
  taskTitle:'주간 보고 초안 정리하고 후속 일 나누기',subject:'업무 계획',activity:'업무',stage:'adult'},
 university:{label:'대학',title:'대학 진로 워크숍 이후 개인 활용 데모',description:'진로 워크숍 뒤 학생이 전공 과제와 개인 로드맵을 스스로 이어 가는 가상 데이터 데모입니다.',
  scenario:'진로 워크숍에서 작업대를 처음 소개받은 학생이 이후 혼자서 전공 과제를 나누고, 학기 로드맵을 그려 보는 장면입니다.',
  steps:['워크숍에서 작업대 쓰는 법을 함께 살펴봅니다.','이후 전공 과제를 작은 단계로 나눠 혼자 실행합니다.','한 달에 한 번 나의 로드맵에서 다음 학기 방향을 정리합니다.'],
  limits:'학생 성적·출석 관리나 상담 기록 대체 용도가 아닙니다. 학교가 학생 기록을 모아 보는 기능은 없습니다.',
  taskTitle:'전공 보고서 자료 조사 1단계',subject:'전공 과제',activity:'학습',stage:'adult'},
 school:{label:'중고등학교',title:'중고등학생 학습 과제 시작·멈춤·복귀 데모',description:'학생이 공부 과제를 시작하고, 잠시 멈췄다가 돌아오고, 다음 계획을 정하는 가상 데이터 데모입니다.',
  scenario:'중학생이 오늘 할 공부 하나를 골라 시작하고, 쉬는 시간 뒤 다시 돌아와 이어 하고, 다음에 할 일을 정하는 장면입니다.',
  steps:['오늘 할 공부 과제 하나를 작업대에 올리고 시작합니다.','필요하면 잠시 멈추고, 돌아와서 이어 합니다.','마친 뒤 다음에 할 계획을 한 줄로 정합니다.'],
  limits:'학생 감시·생활 점검·성적 예측 용도가 아닙니다. 교사나 학교가 학생 기록을 보는 기능은 없습니다.',
  taskTitle:'수학 일차방정식 연습 문제 풀기',subject:'수학',activity:'학습',stage:'middle'},
};
