import type {LabState} from './model';
export type Lang=LabState['language'];
export const LANGS:{id:Lang;label:string;reviewed:boolean}[]=[
 {id:'ko',label:'한국어',reviewed:true},{id:'en',label:'English',reviewed:false},
 {id:'km',label:'ខ្មែរ',reviewed:false},{id:'ar',label:'العربية',reviewed:false}];
const ko={
 demo:'합성 데모 · 이 기기 브라우저에만 저장 · 로그인/서버/기기 간 동기화 없음',
 brand:'NUVIA PLANNER',sub:'해보는 방법을 고르고, 수업 경험을 일상 계획으로 옮기는 책상',
 role:'보기 전환(데모)',teacher:'선생님',studentA:'학생 A',studentB:'학생 B',
 plan:'계획',now:'지금',reflect:'돌아보기',everyday:'수업에서 일상으로',klass:'수업',lessons:'수업 관리',
 unreviewed:'미검토 번역 미리보기 · 대부분 한국어로 표시',
 backup:'백업 파일 받기',restore:'백업 불러오기',compareOld:'기존 B형 v2 열기 · 별도 비교 자료',compareNew:'같은 과제·다른 도움 검토판',
 timeline:'오늘의 시간 블록',add:'새 블록 추가',title:'제목',subject:'과목',minutes:'분',scope:'이번 범위',goal:'목표',
 up:'위로',down:'아래로',start:'바로 시작',startHint:'준비가 덜 돼도 언제든 시작할 수 있어요.',
 assist:'도움 고르기',official:'결과지 기준',none:'도움 없이',reduce:'도움 줄이기',skip:'이번 연습 건너뛰기',
 empty:'아직 블록이 없어요. 오늘 할 한 가지를 적어 보세요.',
 running:'진행 중',paused:'잠시 멈춤',review:'확인 중',done:'끝남',planned:'예정',
 pause:'잠시 멈추기',resume:'다시 이어가기',toReview:'마치고 확인하기',flag:'걸린 점 표시',thought:'떠오른 생각 적어두기',
 completed:'이번 할 일을 끝냈나요?',yes:'끝냈어요',no:'아직이에요',five:'5분 더',next:'다음 블록으로',today:'오늘은 여기까지',
 close:'기록하고 닫기',noRun:'지금 진행 중인 블록이 없어요. 계획에서 하나를 골라 시작하세요.',
 methods:'저장한 방법',saveMethod:'이 방법 저장',helpful:'도움이 됐나요?',unsure:'잘 모르겠어요',
 profile:'결과지 PASS 4영역',mismatch:'유형 정보가 점수와 맞지 않아 해석을 표시하지 않아요.',
 join:'수업 참여',code:'수업 코드',leave:'나가기',share:'공유하기',withdraw:'공유 철회',preview:'공유될 내용 그대로',
 help:'도움 요청',feedback:'선생님 피드백',
 qa:'QA 검토 보드',
};
type Key=keyof typeof ko;
const en:Partial<Record<Key,string>>={demo:'Synthetic demo · stored in this browser only · no login, server or sync',sub:'A desk for trying ways to act and carrying class into daily plans',plan:'Plan',now:'Now',reflect:'Reflect',everyday:'Class to life',klass:'Class',lessons:'Lessons',start:'Start now',pause:'Pause',resume:'Resume',unreviewed:'Unreviewed translation preview · mostly Korean'};
const ar:Partial<Record<Key,string>>={plan:'الخطة',now:'الآن',unreviewed:'معاينة ترجمة غير مراجعة'};
const km:Partial<Record<Key,string>>={plan:'ផែនការ',now:'ឥឡូវ',unreviewed:'ការបកប្រែមិនទាន់ពិនិត្យ'};
const table:Record<Lang,Partial<Record<Key,string>>>={ko,en,ar,km};
let long=(()=>{try{return sessionStorage.getItem('nuvia-qa-long')==='1';}catch{return false;}})();
export function isLongQA(){return long;}
export function setLongQA(v:boolean,persist=true){long=v;if(persist){try{sessionStorage.setItem('nuvia-qa-long',v?'1':'0');}catch{/* ignore */}}document.documentElement.dataset.qaLong=v?'1':'0';}
export function t(lang:Lang,key:Key){const s=table[lang][key]??ko[key];return long?s+' '+s+' (QA)':s;}
export const STAGE_HELP:Record<string,string>={
 elementary_1_3:'한 번에 한 칸만. 그림 단서와 짧은 말로 도와줘요.',
 elementary_4_6:'고를 것을 두세 개로 줄여 보여줘요.',
 middle:'범위와 시간을 직접 정하고 확인해요.',
 high:'단계와 마감을 스스로 쪼개요.',
 adult:'필요한 도움만 켜고 나머지는 접어둬요.'};

export const LINK_NAMES=['목표','마감','자료','준비물','결과물','관련 과제'] as const;
export const FIELD_LABEL:Record<string,string>={goal:'목표',method:'방법',reflection:'돌아보기',experience:'경험'};
export const C={
 goal:'목표',doneWhen:'끝났다고 볼 기준',minutes:'분',blank:'(아직 비어 있음)',current:'지금',next:'다음',
 universalHint:'범위를 작게 정하고 바로 시작해요.',showHelp:'도움 보기',
 scopeQ:'어디까지?',scopePh:'예: 발표 슬라이드 1~3장',custom:'직접',firstQ:'가장 먼저 할 행동',firstPh:'예: 첫 장 제목 쓰기',
 reconfirm:'다시 확인하기',planConfirm:'이 범위·시간·첫 행동으로 정하기',confirmed:'확인함',planningSub:'범위, 시간, 순서',
 int1:'범위·시간·첫 행동 정하기',int2:'시작해서 실제로 해보기',int3:'끝난 뒤 다음 방법 정하기',
 attentionHint:'지금 손에 쥘 행동 하나만 골라요. 나머지는 잠시 접어둬요.',otherAction:'다른 한 가지',chooseThis:'이걸로 고르기',
 simHint:'이 블록과 관련된 실제 내용을 두 칸 이상 적고, 서로 어떻게 이어지는지 써요.',relQ:'어떻게 이어져 있나요?',relPh:'예: 자료를 모아야 결과물 초안을 만들 수 있어요',relMissing:'관계를 적어 주세요',linkConfirm:'이 연결 확인하기',
 stepN:'단계',up:'위로',down:'아래로',remove:'지우기',addStep:'단계 추가',stepsConfirm:'단계 순서 확인',stepDoneHint:'지금 단계를 끝내면 눌러요',did:'했음',
 more:'더 적기(선택)',condition:'이럴 때 하기(조건)',alternative:'안 되면 대신',method:'이번에 쓸 방법',reflection:'돌아보기 메모',
 prep:'준비물',order:'학교 시간표에서 몇 번째',deadline:'마감',middleDeadline:'중간 마감',backplan:'마감에서 거꾸로 보기',
 owner:'담당',dependency:'먼저 끝나야 하는 일',waiting:'다른 사람을 기다리는 중',handoff:'넘겨줄 사람·자리',
 pickOne:'오늘 할 한 가지를 그림에서 골라요',save:'저장',pause:'잠시 쉬기',resumeGoal:'다시 진행',schedule:'블록으로 넣기',scheduled:'시간표에 있음',
 makeMain:'대표 경험으로 고르기',unMain:'대표에서 빼기',main:'대표',
 remaining:'남은 시간',overtime:'시간이 지났어요. 계속할까요, 여기서 마칠까요?',
 attOptional:'선택: 잠시 보관했다가 돌아온 상황 기록',attQ:'떠오른 일을 보관하고 돌아왔나요?',attNone:'기록하지 않음',attUsed:'보관하고 돌아왔어요',attNA:'그럴 상황이 없었어요',attUnknown:'잘 모르겠어요',
 inPlan:'내 계획에 있음',returnSpot:'돌아올 자리',goNow:'이어서 하기',goPlan:'계획에서 열기',nextWeek:'다음 주 목표 1~2개 정하기',
 day1:'1일차: 계획에서 범위와 첫 행동을 정하고 시작해요.',day2:'2일차: 지난 기록에서 이어가고, 다음 주 목표를 시간표에 넣어요.',
 selfTitle:'나를 이해하기 · 먼저 생각해 보기',noAssessment:'결과지 없이 참여 중이에요. 연습하고 싶은 방식을 직접 골라요.',general:'검사 없는 일반 수업 체험',
 compareQ:'설명된 나의 방식이 실제 느낌과 맞나요? 답은 점수를 바꾸지 않아요.',cmp_agree:'맞아요',cmp_different:'다른 경험도 있어요',cmp_unsure:'아직 모르겠어요',whyOptional:'이유(선택)',profileTitle:'결과지 요약',
 qaPlan:'QA 프로필로 실제 계획 화면 열기',qaBoard:'QA 보드로',commonTask:'공통 과제 · 발표 자료 준비하기',
};
export const OFFICIAL_NAMES:Record<string,string>={planning:'계획',attention:'주의',simultaneous:'동시처리',successive:'순차처리'};
