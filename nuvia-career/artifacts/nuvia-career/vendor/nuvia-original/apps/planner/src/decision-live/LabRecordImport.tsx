/**
 * [NUVIA 2026-11-15 대표 INT-07·판단형 STAR] 로드맵 경험카드에 기업 LAB 기록을 불러오는 단추.
 * - 판단형 카드(수신함 decision) → 셸 /api/timed-decision 수행 기록, 플래너→LAB 추천 카드(origin planner-lab) → /api/planner/lab 활동 답안.
 * - 학생이 누를 때만 칸을 채운다(자동 등록 없음). 채운 뒤 저장·「내용 확인」을 해야 자소서 가져오기 목록에 나온다(기존 규칙).
 * - 느낌·자유 메모는 옮기지 않는다(대표 INT 지시 7 「감정·자유 메모는 기본 제외」, QA 04 「느낌·개인 메모 미선택 시 전송 금지」).
 * studio/ 밖에 둔다 — studio/ 안 한국어 문자열은 번역 목록이 필요하다(11/14 빈 화면 사고).
 */
import {useState} from 'react';

export type ImportedFields=Partial<Record<'difficulty'|'action'|'adjustment'|'result'|'learning',string>>;
type InboxEvent={requestId:string;sourceLab:string;payload?:{cardId?:string;contentVersion?:string;decision?:unknown;origin?:string;activityId?:string}};

const join=(...xs:(string|undefined)[])=>xs.map(x=>(x??'').trim()).filter(Boolean).join('\n');

/** 판단형 수행 기록 → 경험카드 칸(최초 결정은 행동 앞에, 공개 후 판단은 조정한 방법으로) */
export function fromDecision(a:Record<string,string>,firstDecision?:string|null):ImportedFields{
 const initial=firstDecision?.trim()?firstDecision:a.decision;
 return {difficulty:join(a.questions),action:join(initial&&`최초 결정: ${initial}`,a.action),adjustment:join(a.change),result:join(a.observation,a.artifact&&`결과물: ${a.artifact}`),learning:join(a.learning)};
}
/** 플래너→LAB 추천 카드 활동 답안 → 경험카드 칸(feeling·memo 제외) */
export function fromLabActivity(a:Record<string,string>,firstDecision?:string|null):ImportedFields{
 const choice=firstDecision?.trim()?`최초 결정: ${firstDecision}`:a.decision&&`선택: ${a.decision}`;
 return {difficulty:join(a.uncertainty),action:join(choice,a.actions),adjustment:join(a.changeDecision),result:join(a.result),learning:join(a.learning)};
}

async function json<T>(url:string,init?:RequestInit):Promise<T>{const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...init});if(!r.ok)throw Error(String(r.status));return r.json() as Promise<T>;}

export default function LabRecordImport({requestId,onFill}:{requestId:string|null;onFill:(f:ImportedFields)=>void}){
 const [msg,setMsg]=useState('');const [busy,setBusy]=useState(false);
 if(!requestId?.startsWith('scn:'))return null;
 const load=async()=>{
  setBusy(true);setMsg('');
  try{
   const inbox=await json<{events?:InboxEvent[]}>('/api/lab-inbox');
   const e=(inbox.events??[]).find(x=>'scn:'+x.requestId===requestId);const p=e?.payload;
   if(!p?.cardId)throw Error('none');
   let fields:ImportedFields;
   if(p.decision){
    const a=await json<{answers?:Record<string,string>;firstDecision?:string|null}>(`/api/timed-decision/${encodeURIComponent(p.cardId)}/${encodeURIComponent(p.contentVersion??'')}`);
    fields=fromDecision(a.answers??{},a.firstDecision);
   }else if(p.origin==='planner-lab'&&p.activityId){
    const c=await json<{binding:string}>('/api/planner/lab/context');
    const a=await json<{answers?:Record<string,string>;firstDecision?:string|null}>(`/api/planner/lab/activities/${encodeURIComponent(p.activityId)}`,{headers:{'x-planner-binding':c.binding}});
    fields=fromLabActivity(a.answers??{},a.firstDecision);
   }else throw Error('none');
   if(!Object.values(fields).some(v=>v?.trim()))throw Error('empty');
   onFill(fields);setMsg('불러왔어요. 내용을 고친 뒤 저장하고 「내용 확인」을 눌러 주세요. 느낌·개인 메모는 옮기지 않았어요.');
  }catch(err){setMsg((err as Error).message==='empty'?'아직 저장한 기록이 없어요. 판단형 활동·LAB 연습에서 먼저 저장해 주세요.':'불러올 기업 LAB 기록을 찾지 못했어요.');}
  finally{setBusy(false);}
 };
 return <p className="st-note" data-testid="lab-record-import"><button type="button" disabled={busy} onClick={()=>void load()}>기업 LAB 기록 불러오기</button>{msg&&<span role="status"> {msg}</span>}</p>;
}
