import { T } from '@/i18n/tx';
import { now, uid, type AppState } from '../store';
import type { Writing, WritingInput, MockInterview } from './types';
import { copy, requireCourse, requireStudent, needed, finite } from './core';

function ownWriting(s:AppState,id:string) {
  const w=s.studio.writings.find((x)=>x.id===id);if(!w)throw new Error(T('글을 먼저 저장하세요.'));
  requireStudent(s,w.courseId,w.studentId,true);return w;
}
export function saveWriting(s:AppState,id:string|null,input:WritingInput) {
  requireStudent(s,input.courseId,input.studentId,true);needed(input.question,T('문항'));needed(input.job,T('직무'));finite(input.limit,50,20000);
  const facts=input.factIds.map((fid)=>s.studio.facts.find((f)=>f.id===fid&&f.courseId===input.courseId&&f.studentId===input.studentId&&f.studentConfirmed));
  if(!facts.length||facts.some((f)=>!f))throw new Error(T('학생이 확인한 본인 경험을 하나 이상 선택하세요.'));
  if(!input.selectedFacts.action&&!input.selectedFacts.result&&!input.selectedFacts.learning)throw new Error(T('글에 사용할 행동·결과·배운 점을 선택하세요.'));
  if(input.text.length>input.limit)throw new Error(T('문항의 분량을 넘었습니다. 학생이 범위를 조정하세요.'));
  const n=copy(s);
  if(id){
    const w=ownWriting(s,id);if(w.courseId!==input.courseId||w.studentId!==input.studentId)throw new Error(T('다른 학생의 글에 저장할 수 없습니다.'));
    const target=n.studio.writings.find((x)=>x.id===id)!;
    Object.assign(target,{question:input.question,job:input.job,limit:input.limit,factIds:input.factIds,selectedFacts:input.selectedFacts,requirements:input.requirements,draft:input.text,updatedAt:now()});
    if(target.versions.length)target.status='revising';
  }else{
    needed(input.text,T('V1 원문'));
    const w:Writing={id:uid('writing'),courseId:input.courseId,studentId:input.studentId,question:input.question,job:input.job,limit:input.limit,factIds:input.factIds,selectedFacts:input.selectedFacts,requirements:input.requirements,
      draft:input.text,versions:[{number:1,text:input.text,at:now(),reviewed:false,factIds:[...input.factIds],confirmedFactIds:[]}],
      sharing:{v1:false,experiences:false,requirements:false,counselorIds:[],at:now()},status:'draft-saved',
      questions:[],factCandidates:[],expressionSuggestions:'',checklist:{response:false,ownAction:false,evidence:false,jobLink:false,facts:false,reviewed:false},createdAt:now(),updatedAt:now(),
      sourceStates:s.studio.companies.filter((m)=>m.job===input.job).map((m)=>({id:m.id,version:m.version,changedAt:m.changedAt}))};
    n.studio.writings.push(w);
  }return n;
}
export function addWritingVersion(s:AppState,id:string,text:string,reviewed:boolean) {
  const w=ownWriting(s,id);needed(text,T('수정 원문'));
  if(text.length>w.limit)throw new Error(T('문항의 분량을 넘었습니다.'));
  if(!reviewed)throw new Error(T('학생이 수정 내용을 미리 보고 확인해야 합니다.'));
  if(w.factCandidates.some((f)=>!f.confirmed&&!f.rejected))throw new Error(T('면담의 추가 사실을 학생이 확인 또는 제외한 뒤 저장하세요.'));
  const n=copy(s),target=n.studio.writings.find((x)=>x.id===id)!;
  target.versions.push({number:target.versions.length+1,text,at:now(),reviewed,factIds:[...target.factIds],confirmedFactIds:target.factCandidates.filter((f)=>f.confirmed).map((f)=>f.id)});
  target.draft=text;target.status='revising';target.updatedAt=now();return n;
}
export function setSharing(s:AppState,id:string,sharing:Omit<Writing['sharing'],'at'>) {
  const w=ownWriting(s,id),c=requireCourse(s,w.courseId);
  const recipients=[c.ownerId,...c.counseling.counselors.map((x)=>x.id)];
  if(sharing.counselorIds.some((x)=>!recipients.includes(x)))throw new Error(T('담당 수업에 배정된 상담자만 선택하세요.'));
  const n=copy(s),target=n.studio.writings.find((x)=>x.id===id)!;target.sharing={...sharing,at:now()};target.updatedAt=now();return n;
}
export function getWritingView(s:AppState,id:string) {
  const w=s.studio.writings.find((x)=>x.id===id);if(!w)return null;
  try{requireCourse(s,w.courseId);}catch{return null;}
  const actor=s.studio.actor, own=actor.role==='student'&&actor.id===w.studentId;
  if(!own&&!w.sharing.counselorIds.includes(actor.id))return null;
  const allFacts=s.studio.facts.filter((x)=>w.factIds.includes(x.id)&&x.studentId===w.studentId&&x.studentConfirmed);
  const view=structuredClone(w);
  if(!own){
    view.draft='';view.versions=w.versions.filter((x)=>x.number===1?w.sharing.v1:!!w.sharing.versions).map((x)=>({...x}));
    view.requirements=w.sharing.requirements?w.requirements:'';
    view.factIds=w.sharing.experiences?[...w.factIds]:[];
  }
  return {writing:view,v1:own||w.sharing.v1?w.versions[0]?.text??'':'',facts:own||w.sharing.experiences?allFacts:[],requirements:own||w.sharing.requirements?w.requirements:''};
}
export function writingQuestions(s:AppState,id:string) {
  const v=getWritingView(s,id);if(!v)throw new Error(T('상담용으로 공유된 자료만 확인할 수 있습니다.'));
  const questions=[T('이 문항이 묻는 내용에 본인의 어떤 경험이 답하나요?')];
  if(!v.facts.some((x)=>x.evidence.trim()))questions.push(T('그 행동과 결과를 확인할 자료나 관찰 근거는 무엇인가요?'));
  if(v.facts.some((x)=>x.action.trim().length<20))questions.push(T('본인이 맡은 역할과 실제 행동 순서를 더 구체적으로 설명해 주세요.'));
  questions.push(T('결과 중 확인된 사실과 아직 모르는 것은 무엇인가요?'),T('배운 점을 다음 직무 행동에 어떻게 적용할 것인가요?'));
  return questions;
}
export function draftSuggestion(s:AppState,id:string) {
  const w=ownWriting(s,id);
  for(const receipt of w.sourceStates??[]){
    const model=s.studio.companies.find((m)=>m.id===receipt.id);
    if(!model||model.revoked||!model.educationAllowed||model.version!==receipt.version||model.changedAt!==receipt.changedAt) throw new Error(T('자료가 변경되거나 공유가 철회되었습니다. 기존 저장본은 보존하며 새 제안 전 자료를 재확인하세요.'));
  }
  for(const company of s.studio.companies.filter((m)=>m.job===w.job)) {
    if(company.revoked)throw new Error(T('자료 공유가 철회되었습니다. 새 제안 활용 전 출처와 공유를 다시 확인하세요.'));
  }
  const facts=s.studio.facts.filter((x)=>w.factIds.includes(x.id)&&x.studentId===w.studentId&&x.studentConfirmed);
  return facts.map((f)=>[
    f.simulation?T('수업용 모의 과제에서의 경험입니다.'):T('학생이 확인한 실제 경험입니다.'),
    w.selectedFacts.action?`${T('본인 행동')}: ${f.action}`:'',
    w.selectedFacts.result?`${T('확인한 결과')}: ${f.result}`:'',
    w.selectedFacts.learning?`${T('배운 점')}: ${f.learning}`:'',
  ].filter(Boolean).join('\n')).join('\n\n');
}
export function refreshWritingSources(s:AppState,id:string,confirmed:boolean) {
  const w=ownWriting(s,id);
  if(!confirmed)throw new Error(T('자료 출처·버전과 교육 공유를 다시 확인하세요.'));
  const models=s.studio.companies.filter((m)=>m.job===w.job);
  if(models.some((m)=>m.revoked||!m.educationAllowed))throw new Error(T('공유가 철회된 자료는 다시 활용할 수 없습니다. 다른 자료를 선택하세요.'));
  const n=copy(s),target=n.studio.writings.find((x)=>x.id===id)!;
  target.sourceStates=models.map((m)=>({id:m.id,version:m.version,changedAt:m.changedAt}));target.updatedAt=now();return n;
}
export function saveConsultation(s:AppState,id:string,questions:string[],facts:string[],expressionSuggestions:string) {
  const view=getWritingView(s,id);if(!view)throw new Error(T('학생이 선택 공유한 자료가 없습니다.'));
  const w=view.writing;
  if(s.studio.actor.role==='student')throw new Error(T('상담자 역할에서 면담 기록을 남기세요.'));
  const booking=s.studio.bookings.find((b)=>b.writingId===id&&b.counselorId===s.studio.actor.id&&b.status==='booked');
  if(!booking)throw new Error(T('본인에게 예약된 면담만 완료할 수 있습니다.'));
  if(!w.sharing.v1)throw new Error(T('V1 공유 없이 원문을 상담한 것으로 표시할 수 없습니다.'));
  const n=copy(s),target=n.studio.writings.find((x)=>x.id===id)!;
  target.questions=[...questions];target.factCandidates.push(...facts.filter((x)=>x.trim()).map((text)=>({id:uid('extra-fact'),text,confirmed:false,rejected:false})));
  target.expressionSuggestions=expressionSuggestions;target.status='consulted';target.updatedAt=now();
  n.studio.bookings.find((x)=>x.id===booking.id)!.status='completed';return n;
}
export function confirmFact(s:AppState,id:string,factId:string,approved:boolean) {
  ownWriting(s,id);const n=copy(s),w=n.studio.writings.find((x)=>x.id===id)!;
  const fact=w.factCandidates.find((f)=>f.id===factId);if(!fact)throw new Error(T('추가 사실을 찾을 수 없습니다.'));
  fact.confirmed=approved;fact.rejected=!approved;
  if(w.factCandidates.every((f)=>f.confirmed||f.rejected))w.status='facts-confirmed';w.updatedAt=now();return n;
}
export function finalizeWriting(s:AppState,id:string,checklist:Writing['checklist']) {
  const w=ownWriting(s,id);
  if(w.versions.length<2||!Object.values(checklist).every(Boolean)||w.factCandidates.some((f)=>!f.confirmed&&!f.rejected))throw new Error(T('문항 응답·본인 행동·근거·직무 연결·사실 확인·학생 검토와 V2 저장을 마치세요.'));
  const n=copy(s),target=n.studio.writings.find((x)=>x.id===id)!;target.checklist=checklist;target.status='student-final';target.updatedAt=now();return n;
}
export function interviewQuestions(s:AppState,id:string) {
  const view=getWritingView(s,id);if(!view)throw new Error(T('선택 공유된 자료만 확인할 수 있습니다.'));
  const w=view.writing;
  if(s.studio.actor.role==='student'&&w.versions.length<2)throw new Error(T('V2 저장 후 모의면접을 진행하세요.'));
  const action=view.facts[0]?.action??T('공유된 글의 행동');
  return [
    {kind:'experience' as const,question:`${T('다음 행동에서 본인 역할·순서·근거와 결과를 설명해 주세요.')}\n${action}`},
    {kind:'hypothetical' as const,question:`${T('다음 요구 행동이 필요한 새 상황이라면 어떤 순서로 확인하고 대응하겠습니까?')}\n${view.requirements||w.job}`},
  ];
}
export function saveMockInterview(s:AppState,input:Omit<MockInterview,'id'|'at'>) {
  const w=ownWriting(s,input.writingId);if(w.versions.length<2)throw new Error(T('V2 저장 후 모의면접을 진행하세요.'));
  needed(input.question,T('질문'));needed(input.answer,T('답변'));needed(input.reanswer,T('재답변'));
  if(input.kind==='hypothetical'&&(input.additionalFact.trim()||input.factConfirmed))throw new Error(T('가정 상황 답변을 실제 경험이나 추가 사실로 옮길 수 없습니다.'));
  const n=copy(s);n.studio.interviews.push({...input,id:uid('mock-interview'),at:now()});
  if(input.additionalFact.trim()){
    const target=n.studio.writings.find((x)=>x.id===input.writingId)!;
    target.factCandidates.push({id:uid('extra-fact'),text:input.additionalFact,confirmed:input.factConfirmed,rejected:false});
  }return n;
}
export function writingExport(s:AppState,id:string) {
  const v=getWritingView(s,id);if(!v)throw new Error(T('내보낼 자료의 공유 권한이 없습니다.'));
  return [v.writing.question,v.writing.job,...v.writing.versions.map((x)=>`V${x.number} · ${x.at}\n${x.text}`),
    ...v.facts.map((f)=>`${f.simulation?T('모의 과제'):T('실제 경험')}\n${f.action}\n${f.result}\n${f.learning}`)].join('\n\n');
}
