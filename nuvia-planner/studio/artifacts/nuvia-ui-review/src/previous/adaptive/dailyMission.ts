import type {Band} from './engine';
export interface DailyTask {id:string;title:string;minutes:number;icon:string;kind:'fix'|'pack'|'send'|'review';hint:string;after?:string;deadline?:number;}
export interface DailyScenario {title:string;goal:string;total:number;tasks:DailyTask[];items:string[];needed:string[];file:string;wrongFile:string;missing:string;}
export const DEPTH={A:{label:'먼저 할 일과 빠진 준비물 확인',extra:0},B:{label:'제출 마감에 맞춰 순서 정하기',extra:1},C:{label:'팀원 확인 후 마감 안에 제출',extra:2},D:{label:'담당 확인과 전달 순서 조정',extra:3}};
export function dailyScenario(band:Band,round=0):DailyScenario{
 const senior=band==='C'||band==='D',adult=band==='D';
 const needed=adult?['노트북','충전기']:round?['물통','운동화']:['운동화','색연필'];
 const tasks:DailyTask[]=senior?[
 {id:'fix',title:adult?'초안 정리':'발표 파일 정리',minutes:8,icon:'▤',kind:'fix',hint:adult?'담당자 이름 확인':'발표 제목 확인'},
 {id:'review',title:adult?'담당 확인':'팀원 확인',minutes:4,icon:'◎',kind:'review',after:'fix',hint:'정리한 파일을 확인받은 뒤 전달'},
 {id:'send',title:adult?'최종 전달':'발표 파일 제출',minutes:3,icon:'↗',kind:'send',after:'review',deadline:15,hint:'확인받은 파일 · 15분 안에'},
 {id:'pack',title:adult?'회의 준비':'준비물 챙기기',minutes:5,icon:'▣',kind:'pack',hint:needed.join(' · ')}
 ]:[
 {id:'fix',title:'숙제 마무리',minutes:10,icon:'▤',kind:'fix',hint:'이름을 확인한 뒤 제출'},
 {id:'pack',title:'가방 챙기기',minutes:5,icon:'▣',kind:'pack',hint:needed.join(' · ')},
 {id:'send',title:'숙제 제출',minutes:5,icon:'↗',kind:'send',after:'fix',...(band==='B'?{deadline:15}:{}),hint:band==='B'?'숙제를 마친 뒤 · 15분 안에':'숙제를 마친 뒤'}
 ];
 return {title:adult?'내일 회의 준비':senior?'내일 발표 준비':round?'내일 체험학습 준비':'내일 학교 갈 준비',goal:adult?'확인받은 파일을 보내고 회의 준비를 마쳐요.':senior?'발표 파일을 제출하고 준비물을 챙겨요.':'숙제를 제출하고 가방을 챙겨요.',total:20,tasks,needed,items:[needed[0],adult?'이어폰':'장난감',needed[1]],file:adult?'회의안_최종':senior?'발표_최종':'숙제_완성',wrongFile:adult?'회의안_수정전':senior?'발표_초안':'숙제_미완성',missing:adult?'담당자 이름':senior?'발표 제목':'이름'};
}
export function checkDailyPlan(s:DailyScenario,order:string[]):string[]{
 const issues:string[]=[];
 if(order.length!==s.tasks.length||new Set(order).size!==order.length||order.some(id=>!s.tasks.some(t=>t.id===id)))return ['할 일 카드를 모두 골라 순서를 만들어 주세요.'];
 let elapsed=0;
 for(const id of order){const t=s.tasks.find(t=>t.id===id)!;elapsed+=t.minutes;if(t.after&&order.indexOf(t.after)>order.indexOf(id))issues.push(`${s.tasks.find(x=>x.id===t.after)!.title} 다음에 ${t.title}를 해요.`);if(t.deadline&&elapsed>t.deadline)issues.push(`${t.title}가 ${elapsed}분째에 끝나요. ${t.deadline}분 안에 끝나도록 앞으로 옮겨보세요.`);}
 return issues;
}
